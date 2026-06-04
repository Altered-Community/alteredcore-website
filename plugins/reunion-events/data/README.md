# BGA tournament data

Place `bga-tournaments.json` here (or upload via **Plugins → Réunion Events → Events Settings**).

Expected format (manual scrape from [BGA Altered tournaments](https://boardgamearena.com/tournamentlist?gamecateg=3&game=1909)):

Naive `start_datetime` values (e.g. `2026-06-08T21:00` without `Z`) are interpreted as **Europe/Paris** (CEST/CET — same as manual BGA scrape times), then converted to each visitor’s local timezone in the browser. To override, set at file level:

```json
"datetime_timezone": "UTC"
```

Or per tournament: `"start_timezone": "UTC"`.

```json
{
  "scraped_at": "2026-06-01",
  "datetime_timezone": "Europe/Paris",
  "source": "https://boardgamearena.com/tournamentlist?status=future&game=1909",
  "game": "Altered",
  "total": 13,
  "tournaments": [
    {
      "id": "566604",
      "name": "Week 13",
      "series": "NUC Turn Based S4",
      "start_datetime": "2026-06-08T21:00",
      "tournament_format": "Swiss System",
      "deck_format": "Standard No Unique",
      "deck_format_detail": "40-60 cards, standard rules without unique",
      "game_mode": "Normal - Custom Decks & Starter Decks",
      "game_pace": "Turn-Based",
      "game_duration": "3 days / table, 24h / day",
      "players_registered": 30,
      "players_max": 256,
      "status": "Open to registrations",
      "url": "https://boardgamearena.com/tournament?id=566604"
    }
  ]
}
```

This file is gitignored; copy or upload it on each server deploy.

**Admin (Events Settings):** upload the full file, **download** the current JSON, or **add one tournament** via the form (same fields as below). Only `players_max` is shown on the public site (not `players_registered`).
