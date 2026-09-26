<?php
/**
 * Deckfmt — compact binary decklist format used by GameApi's `mainDeck` field
 * (and originally by altered-bga-api, which no longer carries this code).
 * This is a decode-only PHP port of GameApi's Deckfmt/*.cs, ported in full so
 * it's reusable beyond the tournament-reports plugin, not just enough for one
 * feature. See Deckfmt.php for the entry point.
 */

namespace TournamentReports\Deckfmt;

/**
 * Reads unsigned integers of arbitrary bit length from a byte buffer, in
 * big-endian (network) order. Direct port of BitstreamReader.cs.
 */
class BitstreamReader
{
    private string $buffer;
    private int $offset = 0;
    private int $bufferedLength;

    public function __construct(string $buffer)
    {
        $this->buffer = $buffer;
        $this->bufferedLength = strlen($buffer) * 8;
    }

    public function offset(): int
    {
        return $this->offset;
    }

    public function available(): int
    {
        return $this->bufferedLength - $this->offset;
    }

    /**
     * Read an unsigned integer of the given bit length.
     *
     * @throws DecodingException if fewer bits remain than requested.
     */
    public function readSync(int $length): int
    {
        if ($this->available() < $length) {
            throw new DecodingException(
                "Not enough bits available (requested=$length, available={$this->available()})"
            );
        }

        $value = 0;
        $remainingLength = $length;
        $offset = $this->offset;

        while ($remainingLength > 0) {
            $byteOffset = intdiv($offset, 8);
            $bitOffset = $offset % 8;
            $currentByte = ord($this->buffer[$byteOffset]);

            $bitContribution = min(8 - $bitOffset, $remainingLength);
            $mask = (1 << $bitContribution) - 1;
            $extracted = ($currentByte >> (8 - $bitContribution - $bitOffset)) & $mask;

            $value = ($value << $bitContribution) | $extracted;

            $offset += $bitContribution;
            $remainingLength -= $bitContribution;
        }

        $this->offset = $offset;
        return $value;
    }
}
