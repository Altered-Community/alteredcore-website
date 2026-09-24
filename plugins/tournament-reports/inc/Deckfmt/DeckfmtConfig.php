<?php

namespace TournamentReports\Deckfmt;

/**
 * Mapping tables (sets, factions, rarities, products) EncodableCard needs to
 * turn decoded ids back into a card reference string — one table per wire
 * format version, ported from GameApi's embedded Deckfmt/Config/v*.json.
 *
 * Adding a set/faction/rarity/product that fits the current bit-packing
 * scheme is a data-only change: add it to VERSIONS below. A structural
 * change (different bit widths, a new "has extra field" rule — see
 * $instanceNumberAppliesToAllRarities) needs a new version entry, because a
 * blob already encoded under an older version must keep decoding exactly as
 * it always did.
 */
class DeckfmtConfig
{
    /**
     * Ported verbatim from GameApi/Deckfmt/Config/v1.json. Keep this array in
     * sync with that file when a new set/faction/rarity/product ships.
     */
    private const VERSIONS = [
        1 => [
            'instanceNumberAppliesToAllRarities' => true,
            'products' => [
                ['id' => 1, 'code' => 'P'],
                ['id' => 2, 'code' => 'A'],
            ],
            'factions' => [
                ['id' => 1, 'code' => 'AX'],
                ['id' => 2, 'code' => 'BR'],
                ['id' => 3, 'code' => 'LY'],
                ['id' => 4, 'code' => 'MU'],
                ['id' => 5, 'code' => 'OR'],
                ['id' => 6, 'code' => 'YZ'],
                ['id' => 7, 'code' => 'NE'],
            ],
            'rarities' => [
                ['id' => 0, 'code' => 'C'],
                ['id' => 1, 'code' => 'R1'],
                ['id' => 2, 'code' => 'R2'],
                ['id' => 3, 'code' => 'U'],
                ['id' => 4, 'code' => 'E'],
            ],
            'sets' => [
                ['id' => 1, 'code' => 'COREKS', 'numberInFactionBits' => 6, 'legacyRarityBits' => true],
                ['id' => 2, 'code' => 'CORE', 'numberInFactionBits' => 6, 'legacyRarityBits' => true],
                ['id' => 3, 'code' => 'ALIZE', 'numberInFactionBits' => 6, 'legacyRarityBits' => true],
                ['id' => 4, 'code' => 'BISE', 'numberInFactionBits' => 7, 'legacyRarityBits' => true],
                ['id' => 5, 'code' => 'TCS3', 'numberInFactionBits' => 6, 'legacyRarityBits' => true],
                ['id' => 6, 'code' => 'WCQ25', 'numberInFactionBits' => 5, 'legacyRarityBits' => true],
                ['id' => 7, 'code' => 'WCS25', 'numberInFactionBits' => 5, 'legacyRarityBits' => true],
                ['id' => 8, 'code' => 'CYCLONE', 'numberInFactionBits' => 7, 'legacyRarityBits' => true],
                ['id' => 9, 'code' => 'DUSTER', 'numberInFactionBits' => 7, 'legacyRarityBits' => false],
                ['id' => 10, 'code' => 'DUSTERTOP', 'numberInFactionBits' => 6, 'legacyRarityBits' => false],
                ['id' => 11, 'code' => 'DUSTERCB', 'numberInFactionBits' => 7, 'legacyRarityBits' => false],
                ['id' => 12, 'code' => 'DUSTEROP', 'numberInFactionBits' => 7, 'legacyRarityBits' => false],
                ['id' => 13, 'code' => 'EOLE', 'numberInFactionBits' => 7, 'legacyRarityBits' => false],
                ['id' => 14, 'code' => 'EOLECB', 'numberInFactionBits' => 7, 'legacyRarityBits' => false],
                ['id' => 15, 'code' => 'FUGUE', 'numberInFactionBits' => 8, 'legacyRarityBits' => false],
                ['id' => 16, 'code' => 'JUDGE', 'numberInFactionBits' => 5, 'legacyRarityBits' => false],
                ['id' => 17, 'code' => 'MUSUBI', 'numberInFactionBits' => 5, 'legacyRarityBits' => false],
                ['id' => 18, 'code' => 'WCF25', 'numberInFactionBits' => 5, 'legacyRarityBits' => false],
                ['id' => 19, 'code' => 'WCS26', 'numberInFactionBits' => 7, 'legacyRarityBits' => false],
            ],
        ],
    ];

    private static array $instances = [];

    public int $version;
    public bool $instanceNumberAppliesToAllRarities;

    /** @var array<int, array{id:int,code:string,numberInFactionBits:int,legacyRarityBits:bool}> */
    private array $setsById = [];
    private array $setsByCode = [];
    private array $factionCodeById = [];
    private array $factionIdByCode = [];
    private array $rarityCodeById = [];
    private array $rarityIdByCode = [];
    private array $productCodeById = [];
    private array $productIdByCode = [];

    private function __construct(int $version, array $dto)
    {
        $this->version = $version;
        $this->instanceNumberAppliesToAllRarities = $dto['instanceNumberAppliesToAllRarities'];

        foreach ($dto['sets'] as $set) {
            $this->setsById[$set['id']] = $set;
            $this->setsByCode[$set['code']] = $set;
        }
        foreach ($dto['factions'] as $faction) {
            $this->factionCodeById[$faction['id']] = $faction['code'];
            $this->factionIdByCode[$faction['code']] = $faction['id'];
        }
        foreach ($dto['rarities'] as $rarity) {
            $this->rarityCodeById[$rarity['id']] = $rarity['code'];
            $this->rarityIdByCode[$rarity['code']] = $rarity['id'];
        }
        foreach ($dto['products'] as $product) {
            $this->productCodeById[$product['id']] = $product['code'];
            $this->productIdByCode[$product['code']] = $product['id'];
        }
    }

    public function hasSetId(int $id): bool
    {
        return isset($this->setsById[$id]);
    }

    public function hasProductId(int $id): bool
    {
        return isset($this->productCodeById[$id]);
    }

    /** @return array{id:int,code:string,numberInFactionBits:int,legacyRarityBits:bool} */
    public function setById(int $id): array
    {
        if (!isset($this->setsById[$id])) {
            throw new DecodingException("Invalid SetCode ID ($id)");
        }
        return $this->setsById[$id];
    }

    public function setByCode(string $code): array
    {
        if (!isset($this->setsByCode[$code])) {
            throw new \InvalidArgumentException("Unrecognized set code: $code");
        }
        return $this->setsByCode[$code];
    }

    public function factionCode(int $id): string
    {
        if (!isset($this->factionCodeById[$id])) {
            throw new DecodingException("Invalid faction: $id");
        }
        return $this->factionCodeById[$id];
    }

    public function factionId(string $code): int
    {
        if (!isset($this->factionIdByCode[$code])) {
            throw new \InvalidArgumentException("Unrecognized faction: $code");
        }
        return $this->factionIdByCode[$code];
    }

    public function rarityCode(int $id): string
    {
        if (!isset($this->rarityCodeById[$id])) {
            throw new DecodingException("Invalid rarity: $id");
        }
        return $this->rarityCodeById[$id];
    }

    public function rarityId(string $code): int
    {
        if (!isset($this->rarityIdByCode[$code])) {
            throw new \InvalidArgumentException("Unrecognized rarity: $code");
        }
        return $this->rarityIdByCode[$code];
    }

    /** Booster (the default product) is null and isn't in the table -- "B" maps to it. */
    public function productCode(?int $id): string
    {
        if ($id === null) {
            return 'B';
        }
        if (!isset($this->productCodeById[$id])) {
            throw new DecodingException("Invalid product: $id");
        }
        return $this->productCodeById[$id];
    }

    public function productId(string $code): ?int
    {
        if ($code === 'B') {
            return null;
        }
        if (!isset($this->productIdByCode[$code])) {
            throw new \InvalidArgumentException("Unrecognized product: $code");
        }
        return $this->productIdByCode[$code];
    }

    public static function latest(): int
    {
        return max(array_keys(self::VERSIONS));
    }

    public static function isKnownVersion(int $version): bool
    {
        return isset(self::VERSIONS[$version]);
    }

    public static function for(int $version): self
    {
        if (!isset(self::VERSIONS[$version])) {
            throw new DecodingException("Invalid version ($version)");
        }
        if (!isset(self::$instances[$version])) {
            self::$instances[$version] = new self($version, self::VERSIONS[$version]);
        }
        return self::$instances[$version];
    }
}
