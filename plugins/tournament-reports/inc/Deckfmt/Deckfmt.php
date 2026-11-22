<?php

namespace TournamentReports\Deckfmt;

require_once __DIR__ . '/Exceptions.php';
require_once __DIR__ . '/BitstreamReader.php';
require_once __DIR__ . '/DeckfmtConfig.php';
require_once __DIR__ . '/Models.php';

/**
 * High-level decode API for Deckfmt-compressed decklists (GameApi's
 * `mainDeck` field). Decode-only port of altered-bga-api/GameApi's
 * DeckfmtCodec — see the class docblocks in this folder for the full format.
 */
class Deckfmt
{
    /**
     * Decode a base64url Deckfmt blob into a flat card list.
     *
     * @return array{ok: bool, cards?: array<int, array{reference: string, quantity: int}>, error?: string}
     */
    public static function decode(string $encoded): array
    {
        $encoded = trim($encoded);
        if ($encoded === '') {
            return ['ok' => false, 'error' => 'Empty deck string.'];
        }

        try {
            $bytes = self::base64UrlDecode($encoded);
            $reader = new BitstreamReader($bytes);
            $deck = EncodableDeck::decode($reader);
            return ['ok' => true, 'cards' => $deck->asCardRefQty()];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    private static function base64UrlDecode(string $encoded): string
    {
        $base64 = strtr($encoded, '-_', '+/');
        $padding = strlen($base64) % 4;
        if ($padding === 2) {
            $base64 .= '==';
        } elseif ($padding === 3) {
            $base64 .= '=';
        } elseif ($padding === 1) {
            throw new DecodingException('Invalid base64url length.');
        }

        $bytes = base64_decode($base64, true);
        if ($bytes === false) {
            throw new DecodingException('Invalid base64url content.');
        }
        return $bytes;
    }
}
