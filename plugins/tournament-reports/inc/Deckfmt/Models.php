<?php

namespace TournamentReports\Deckfmt;

/** Ported from Models.cs's DecodingContext. */
class DecodingContext
{
    public int $version;
    public ?int $setCode = null;

    public function __construct(int $version)
    {
        $this->version = $version;
    }
}

/**
 * One card within a set-group. Decode-only port of Models.cs's EncodableCard
 * (Encode()/FromId() are not ported — nothing here needs to produce a
 * Deckfmt blob, only read one).
 */
class EncodableCard
{
    public int $setCode;
    public ?int $product = null;
    public int $faction;
    public int $numberInFaction;
    public int $rarity;
    public ?int $uniqueId = null;
    public int $version;

    public static function decode(BitstreamReader $reader, DecodingContext $context): self
    {
        if ($context->setCode === null) {
            throw new DecodingException('Tried to decode card without SetCode in context');
        }

        $self = new self();
        $self->setCode = $context->setCode;
        $self->version = $context->version;
        $config = DeckfmtConfig::for($context->version);

        $productBit = $reader->readSync(1);
        if ($productBit === 1) {
            $self->product = null;
        } else {
            $self->product = $reader->readSync(2);
            if (!$config->hasProductId($self->product)) {
                throw new DecodingException("Invalid product ID ({$self->product})");
            }
        }

        $self->faction = $reader->readSync(3);
        if ($self->faction === 0) {
            throw new DecodingException("Invalid faction ID ({$self->faction})");
        }

        $setInfo = $config->setById($self->setCode);
        $self->numberInFaction = $reader->readSync($setInfo['numberInFactionBits']);

        $rarityBitLength = $setInfo['legacyRarityBits'] ? 2 : 3;
        $self->rarity = $reader->readSync($rarityBitLength);

        $uniqueRarityId = $config->rarityId('U');
        $hasInstanceNumber = $config->instanceNumberAppliesToAllRarities
            ? $reader->readSync(1) === 1
            : $self->rarity === $uniqueRarityId;
        if ($hasInstanceNumber) {
            $self->uniqueId = $reader->readSync(16);
        }

        return $self;
    }

    /** Reconstructs the canonical card reference string, e.g. ALT_CORE_B_AX_01_C. */
    public function asCardId(): string
    {
        $config = DeckfmtConfig::for($this->version);
        $setInfo = $config->setById($this->setCode);
        $rarityCode = $config->rarityCode($this->rarity);

        $id = 'ALT_' . $setInfo['code'] . '_' . $config->productCode($this->product)
            . '_' . $config->factionCode($this->faction) . '_';

        // Special case: CoreKS' NE_1 (Mana Convergence) does not use a 0
        // prefix, unlike every other card on that set -- the only such
        // exception in the real card catalog (Core's own NE_1 *does* use the
        // 0 prefix, unlike CoreKS').
        $isCoreKsManaConvergence = $this->faction === $config->factionId('NE')
            && $this->setCode === $config->setByCode('COREKS')['id'];
        if ($this->numberInFaction < 10 && !$isCoreKsManaConvergence) {
            $id .= '0';
        }
        $id .= (string)$this->numberInFaction;

        $id .= '_' . $rarityCode;
        if ($rarityCode === 'U') {
            $id .= '_' . $this->uniqueId;
        } elseif ($this->uniqueId === 0) {
            // 0 is never a genuine serial (DUSTERCB-style numbers start at
            // 1) -- it's the sentinel for the card catalog's "XXX" unnumbered
            // print template.
            $id .= '_XXX';
        } elseif ($this->uniqueId !== null) {
            $id .= '_' . str_pad((string)$this->uniqueId, 3, '0', STR_PAD_LEFT);
        }

        return $id;
    }
}

/** One card + quantity line. Decode-only port of Models.cs's EncodableCardQty. */
class EncodableCardQty
{
    public int $quantity;
    public EncodableCard $card;

    public static function decode(BitstreamReader $reader, DecodingContext $context): self
    {
        $self = new self();
        $simpleQty = $reader->readSync(2);
        if ($simpleQty > 0) {
            $self->quantity = $simpleQty;
        } else {
            $extended = $reader->readSync(6);
            $self->quantity = $extended === 0 ? 0 : $extended + 3;
        }
        $self->card = EncodableCard::decode($reader, $context);
        return $self;
    }

    /** @return array{reference: string, quantity: int} */
    public function asCardRefQty(): array
    {
        return ['reference' => $this->card->asCardId(), 'quantity' => $this->quantity];
    }
}

/** One set's worth of cards within the deck. Decode-only port of EncodableSetGroup. */
class EncodableSetGroup
{
    public int $setCode;
    /** @var EncodableCardQty[] */
    public array $cardQty = [];

    public static function decode(BitstreamReader $reader, DecodingContext $context): self
    {
        $self = new self();
        $self->setCode = $reader->readSync(8);

        $config = DeckfmtConfig::for($context->version);
        if (!$config->hasSetId($self->setCode)) {
            throw new DecodingException("Invalid SetCode ID ({$self->setCode}) @offset={$reader->offset()}");
        }

        $context->setCode = $self->setCode;

        $cardRefCount = $reader->readSync(6);
        for ($i = 0; $i < $cardRefCount; $i++) {
            $self->cardQty[] = EncodableCardQty::decode($reader, $context);
        }

        $context->setCode = null;
        return $self;
    }
}

/** A full decklist blob. Decode-only port of Models.cs's EncodableDeck. */
class EncodableDeck
{
    public int $version;
    /** @var EncodableSetGroup[] */
    public array $setGroups = [];

    public static function decode(BitstreamReader $reader): self
    {
        $self = new self();

        $self->version = $reader->readSync(4);
        if (!DeckfmtConfig::isKnownVersion($self->version)) {
            throw new DecodingException("Invalid version ({$self->version})");
        }

        $context = new DecodingContext($self->version);

        $groupsCount = $reader->readSync(8);
        for ($i = 0; $i < $groupsCount; $i++) {
            $self->setGroups[] = EncodableSetGroup::decode($reader, $context);
        }

        return $self;
    }

    /** @return array<int, array{reference: string, quantity: int}> */
    public function asCardRefQty(): array
    {
        $result = [];
        foreach ($this->setGroups as $group) {
            foreach ($group->cardQty as $cardQty) {
                $result[] = $cardQty->asCardRefQty();
            }
        }
        return $result;
    }
}
