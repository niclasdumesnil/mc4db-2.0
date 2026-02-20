# MarvelCDB Node.js API Backend

## Purpose
Progressive replacement for the Symfony 1.0 backend.  
Runs in **parallel** with the existing PHP server, connected to the **same MySQL database**.

## Architecture

```
backend/
├── src/
│   ├── index.js            # Entry point — Express app bootstrap
│   ├── config/
│   │   └── database.js     # Knex DB connection (reads .env)
│   ├── models/             # Thin query helpers (one per entity)
│   │   ├── Card.js
│   │   ├── Pack.js
│   │   ├── Faction.js
│   │   └── ...
│   ├── routes/             # Express routers (mirror Symfony /api/public/*)
│   │   ├── cards.js
│   │   ├── packs.js
│   │   ├── factions.js
│   │   └── index.js        # Route aggregator
│   ├── middleware/
│   │   └── errorHandler.js
│   └── utils/
│       └── cardSerializer.js  # Replicate CardsData::getCardInfo()
├── .env.example
├── package.json
└── README.md
```

## Quick Start

```bash
cd backend
npm install

# Copy and edit environment variables
cp .env.example .env
# Edit .env with your MySQL credentials

# Development (auto-reload)
npm run dev

# Production
npm start
```

The API listens on **port 4000** by default (configurable via `PORT` in `.env`).

## API Endpoints (Phase 1 — Read-Only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/public/cards/` | All cards (same format as Symfony) |
| GET | `/api/public/card/:code.json` | Single card by code |
| GET | `/api/public/cards/:pack_code.json` | Cards filtered by pack |
| GET | `/api/public/packs/` | All packs |
| GET | `/api/public/factions/` | All factions |

## Migration Roadmap

1. **Phase 1 — Read**: GET routes for cards, packs, factions (this PR)
2. **Phase 2 — Decks/Decklists**: GET decklists, popular decklists, etc.
3. **Phase 3 — Auth**: OAuth2 / JWT for deck CRUD
4. **Phase 4 — Write**: POST/PUT/DELETE for decks
5. **Phase 5 — Admin**: Migrate admin forms from Symfony
6. **Phase 6 — Shutdown**: Retire Symfony entirely
