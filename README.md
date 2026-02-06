<p align="center">
  <img src="assets/images/tower-defense-logo.svg" alt="Te Pā Tiaki Logo" width="200">
</p>

<h1 align="center">Te Pā Tiaki — CSS Tower Defense</h1>

<p align="center">A 3D tower defense game rendered entirely with CSS 3D transforms and vanilla JavaScript. No Canvas, no WebGL -- just pure CSS.</p>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Play%20Now-brightgreen?style=for-the-badge&logo=github)](https://chanmeng666.github.io/css-tower-defense/)
![CSS Tower Defense](https://img.shields.io/badge/CSS-3D%20Transforms-blue?style=for-the-badge&logo=css3)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla%20ES6-yellow?style=for-the-badge&logo=javascript)
![LESS](https://img.shields.io/badge/LESS-Preprocessor-1d365d?style=for-the-badge&logo=less)

## Live Demo

**[Play the game now!](https://chanmeng666.github.io/css-tower-defense/)**

## Features

- **Pure CSS 3D Rendering** -- All game objects rendered with CSS 3D transforms, 45-degree isometric perspective
- **Comic / Pop-Art Visual Style** -- Warm palette, halftone patterns, pop shadows, thick outlines
- **6 Tower Types** -- Arrow, Cannon, Ice, Magic, Tesla, Flame -- each with unique mechanics
- **4 Enemy Types + 4 Variants** -- Slime, Goblin, Knight, Boss with Elite/Armored/Speedy/Toxic variants
- **Boss Skills** -- Summon minions, shield, enrage phase
- **10 Progressive Waves** -- 3 difficulty modes (Normal, Hard, Expert)
- **Environmental Systems** -- Day/night cycle, weather (rain, fog, wind, snow, heat wave), 4 seasons, Blood Moon events
- **Progression System** -- XP, leveling, 10-upgrade tech tree with skill points
- **Inventory and Loot** -- Terraria-inspired material drops (Scrap Metal, Power Core, Magic Crystal)
- **Tower Reforging** -- Random prefixes (Common to Legendary) that modify tower stats
- **Achievement System** -- 10 achievements with gold rewards
- **Combo System** -- Chain kills for bonus gold
- **Cloud Backend** -- Account auth, leaderboard, cloud saves (3 slots), stats tracking
- **Synthesized Audio** -- Web Audio API synth sounds + Howler.js for music and samples
- **Object Pooling** -- DOM element reuse for smooth performance

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **CSS 3D Transforms** | 3D rendering of game world and entities |
| **Vanilla JavaScript** | Game logic, physics, state management (IIFE modules) |
| **LESS** | CSS preprocessing with variables, mixins, and theming |
| **Gulp** | Build automation and asset compilation |
| **Web Audio API** | Synthesized sound effects |
| **Howler.js** | Music and audio sample playback |
| **Cloudflare Workers** | Serverless backend API |
| **Hono** | Lightweight web framework for Workers |
| **Neon DB** | Serverless PostgreSQL database |
| **Drizzle ORM** | Type-safe database queries |
| **Better Auth** | Session-based authentication |
| **Zod** | Runtime schema validation |

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/ChanMeng666/css-tower-defense.git
cd css-tower-defense

# Install dependencies
npm install

# Build the project
npm run build
```

### Running Locally

Open `index.html` in a modern browser, or use a local server:

```bash
python -m http.server 8080
# or
npx serve
```

### Development

```bash
npm run watch    # Watch mode (auto-rebuild on file changes)
npm run dev      # Concurrent frontend watch + backend dev server
npm run build    # Development build
npm run compile  # Production build (minified output in dist/)
```

### Backend Development

```bash
# Set up Wrangler secrets (DATABASE_URL, BETTER_AUTH_SECRET)
cd worker && npx wrangler secret put DATABASE_URL
cd worker && npx wrangler secret put BETTER_AUTH_SECRET

# Database commands
npm run db:generate   # Generate Drizzle migrations
npm run db:migrate    # Run migrations
npm run db:studio     # Open Drizzle Studio

# Deploy backend
npm run deploy        # Compiles frontend + deploys worker
```

## How to Play

1. **Choose Difficulty** -- Select Normal, Hard, or Expert at the start screen
2. **Select a Tower** -- Click a tower type in the shop panel (or press 1-6)
3. **Place Tower** -- Click on a grass cell to place the tower
4. **Start Wave** -- Press Space or click "Start Wave"
5. **Defend** -- Towers automatically attack enemies in range
6. **Upgrade** -- Click placed towers to upgrade (3 levels) or reforge for random prefixes
7. **Collect Loot** -- Enemies drop materials for your inventory
8. **Earn XP** -- Level up and spend skill points in the tech tree
9. **Save Progress** -- Press F5 to quick-save, F9 to quick-load (3 cloud slots available when logged in)
10. **Survive** -- Don't let enemies reach the end of the path!

## Controls

| Key | Action |
|-----|--------|
| `1-6` | Quick-select tower types |
| `Space` | Start next wave |
| `Esc` | Deselect tower / Close panels |
| `Click` | Place tower / Select placed tower |
| `F5` | Quick save |
| `F9` | Quick load |

## Tower Types

| Tower | Cost | Damage | Range | Fire Rate | Special |
|-------|------|--------|-------|-----------|---------|
| **Arrow** | 50g | 15 | 120px | 2.0/s | Fast single-target attacks |
| **Cannon** | 100g | 30 | 150px | 0.8/s | 60px splash radius |
| **Ice** | 75g | 10 | 100px | 1.5/s | 50% slow for 2s |
| **Magic** | 150g | 50 | 200px | 0.5/s | Ignores armor |
| **Tesla** | 200g | 40 | 140px | 2.5/s | Chains to 3 targets (70% falloff) |
| **Flame** | 250g | 5 | 100px | 10/s | Burn: 3 dmg/0.5s for 3s |

**Upgrades:** Each tower can be upgraded to level 3 (+50% damage, +10% range, -10% cooldown per level). Upgrade cost is 75% of base cost per level.

**Reforging:** Towers can be reforged for random prefixes at 50% base cost. Rarity tiers: Common (60%), Rare (25%), Epic (12%), Legendary (3%).

| Prefix | Rarity | Effect |
|--------|--------|--------|
| Swift | Common | +15% fire rate |
| Deadly | Common | +20% damage |
| Keen | Common | +10% range |
| Arcane | Rare | +25% range |
| Fierce | Rare | +25% damage, +5% fire rate |
| Rapid | Rare | +25% fire rate |
| Mythical | Epic | +15% damage, +10% fire rate, +10% range |
| Godly | Epic | +30% damage, +15% range |
| Legendary | Legendary | +25% damage, +25% fire rate, +25% range |

## Enemy Types

| Enemy | Health | Speed | Reward | Armor | Special |
|-------|--------|-------|--------|-------|---------|
| **Slime** | 50 | 40 px/s | 10g | 0 | -- |
| **Goblin** | 80 | 60 px/s | 15g | 0 | -- |
| **Knight** | 200 | 30 px/s | 25g | 5 | Armored |
| **Boss** | 1000 | 20 px/s | 100g | 10 | Skills (see below) |

### Boss Skills

- **Summon** (10s cooldown) -- Spawns 3 slimes
- **Shield** (15s cooldown) -- +50 armor for 5s, only below 70% HP
- **Enrage** (once, at 30% HP) -- +50% speed, 2x damage permanently

### Enemy Variants

Enemies can spawn as variants with modified stats:

| Variant | Health | Speed | Reward | Damage | Armor |
|---------|--------|-------|--------|--------|-------|
| **Elite** | 2.0x | 1.3x | 2.5x | 1.5x | -- |
| **Armored** | 1.5x | 0.8x | 1.8x | 1.0x | +10 |
| **Speedy** | 0.7x | 2.0x | 1.5x | 1.0x | -- |
| **Toxic** | 1.2x | 1.0x | 2.0x | 2.0x | -- |

## Environmental Systems

### Day / Night Cycle

Tied to waves: odd waves are daytime, even waves are nighttime. Night brings reduced visibility and different enemy behavior.

### Seasons

Seasons rotate through waves and affect gameplay:

| Waves | Season | Effect |
|-------|--------|--------|
| 1-2 | Summer | Baseline |
| 3-4 | Autumn | -- |
| 5-6 | Winter | -- |
| 7-8 | Spring | -- |
| 9-10 | Summer | -- |

Each season changes the map's color palette (grass, path, sky) and provides tower/gold modifiers.

### Weather

Weather is randomly selected each wave based on seasonal weights: Clear, Rain, Fog, Wind, Snow, Heat Wave. Each type applies gameplay modifiers to tower range, enemy speed, and gold income.

### Blood Moon

Night-only event (even waves) with probability increasing each wave (wave number x 2.5%). Blood Moon overrides normal night modifiers with enhanced enemy stats.

## Progression and Inventory

### Tech Tree

Earn XP from kills and wave completions. Level up to gain skill points for 10 upgrades:

| Upgrade | Effect per Level | Max Level | Cost |
|---------|-----------------|-----------|------|
| Budget Engineering | -10% tower cost | 3 | 1 SP |
| Trust Fund | +50 starting gold | 3 | 1 SP |
| Heavy Rounds | +10% tower damage | 3 | 2 SP |
| Rapid Fire | +10% attack speed | 3 | 2 SP |
| Eagle Eye | +10% tower range | 3 | 1 SP |
| Lucky Shot | +5% crit chance | 3 | 2 SP |
| Greed | +15% gold from kills | 3 | 2 SP |
| Deep Freeze | +20% slow duration | 2 | 2 SP |
| Blast Radius | +20% splash range | 2 | 2 SP |
| Reinforcements | +5 starting lives | 2 | 3 SP |

### Inventory

Enemies drop materials (Terraria-inspired). Bosses always drop all three types.

| Material | Rarity | Drop Sources |
|----------|--------|-------------|
| Scrap Metal | Common | All enemies (10-20%) |
| Power Core | Rare | Goblins+ (1-5%) |
| Magic Crystal | Epic | Knights+ (0-1%), Bosses (100%) |

Variant enemies have increased drop rates (1.2x-2.0x multipliers).

### Difficulty Modes

| Mode | Enemy HP | Enemy Dmg | Gold | XP |
|------|----------|-----------|------|----|
| Normal | 1.0x | 1.0x | 1.0x | 1.0x |
| Hard | 1.5x | 1.5x | 1.3x | 1.5x |
| Expert | 2.0x | 2.0x | 1.5x | 2.0x |

## Project Structure

```
css-tower-defense/
├── index.src.html          # Source HTML template (Gulp injects scripts/styles)
├── index.html              # Built HTML (generated)
├── gulpfile.js             # Build configuration + script load order
├── package.json
├── CLAUDE.md               # AI assistant guidance
├── styles/
│   ├── vars.less           # Variables, mixins, keyframes
│   ├── app.less            # Entry point (imports all LESS files)
│   ├── game.less           # UI, screens, menus, HUD
│   ├── map.less            # Map grid, environment, sky
│   ├── tower.less          # Tower 3D models
│   ├── enemy.less          # Enemy 3D models
│   ├── projectile.less     # Projectile effects
│   ├── effects.less        # Particle effects, explosions
│   ├── effects-fire.less   # Fire/flame tower effects
│   ├── effects-weather.less# Rain, snow, fog, wind effects
│   ├── auth.less           # Auth modal styles
│   └── loading.less        # Loading screen styles
├── scripts/
│   ├── utils.js            # Utility functions (throttle, lerp, distance)
│   ├── pool.js             # DOM element pooling
│   ├── noise.js            # Perlin noise generator
│   ├── effects.js          # Visual effects manager, FPS monitoring
│   ├── path.js             # Grid/pathfinding (12x8 grid)
│   ├── weather.js          # Day/night cycle, weather effects
│   ├── seasons.js          # Seasonal themes and modifiers
│   ├── auth.js             # Auth UI + session management
│   ├── api.js              # Backend API client
│   ├── progression.js      # XP, leveling, tech tree
│   ├── inventory.js        # Inventory/loot system
│   ├── enemy.js            # Enemy AI, variants, boss skills
│   ├── tower.js            # Tower mechanics, upgrades, reforging
│   ├── projectile.js       # Projectile physics
│   ├── wave.js             # Wave spawning (10 waves)
│   ├── display.js          # UI updates, announcements
│   ├── shop.js             # Tower shop UI
│   ├── sfx.js              # Web Audio API + Howler.js audio
│   ├── game.js             # Main game loop, state management
│   ├── achievements.js     # Achievement system
│   └── controller.js       # Input handling, entry point
├── worker/                 # Cloudflare Worker backend
│   ├── wrangler.toml       # Worker configuration
│   ├── drizzle.config.ts   # Drizzle ORM config
│   ├── drizzle/            # Database migrations
│   └── src/
│       ├── index.ts        # Hono app, route mounting, CORS
│       ├── db/
│       │   ├── index.ts    # Neon serverless connection
│       │   └── schema.ts   # Drizzle table definitions (10 tables)
│       ├── middleware/
│       │   └── auth.ts     # requireAuth middleware
│       ├── routes/
│       │   ├── auth.ts     # Better Auth catch-all
│       │   ├── leaderboard.ts
│       │   ├── saves.ts    # Save/load (3 slots)
│       │   ├── progression.ts
│       │   └── stats.ts    # Game history, achievements
│       └── services/
│           └── anticheat.ts# Score validation
├── vendor/
│   └── prefixfree.min.js
└── dist/                   # Production build output
```

## Visual Design

The game uses a warm Comic / Pop-Art visual style:

- **Halftone Patterns** -- Dotted backgrounds for depth and texture
- **Pop Shadows** -- Hard-offset box shadows for a punchy, graphic feel
- **Thick Outlines** -- Comic-style borders on all elements
- **Text Outlines** -- Stroked text for readability over 3D scenes
- **Warm Palette** -- Earthy tones, warm whites (#FFF8F0), cream, burnt orange
- **CSS 3D Transforms** -- 45-degree isometric perspective at 1200px
- **Day/Night Sky** -- Smooth CSS transitions between warm day and navy (#1A2A3A) night
- **Seasonal Themes** -- Dynamic color palette changes (grass, path, sky) per season
- **Aurora and Weather** -- Rain, snow, fog, wind particles rendered as CSS elements
- **All CSS Shapes** -- No emoji; towers, enemies, icons all built with clip-path, border-radius, and pseudo-elements

## Backend Architecture

The backend runs on Cloudflare Workers with a Neon serverless PostgreSQL database.

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| ALL | `/api/auth/*` | No | Better Auth (sign-up, sign-in, sign-out) |
| GET | `/api/leaderboard` | No | Public leaderboard (filterable by difficulty) |
| GET | `/api/leaderboard/me` | Yes | My rank and nearby entries |
| POST | `/api/leaderboard` | Yes | Submit score (anti-cheat validated) |
| GET | `/api/saves` | Yes | Get all 3 save slots |
| PUT | `/api/saves/:slot` | Yes | Save to slot 0-2 |
| DELETE | `/api/saves/:slot` | Yes | Delete save slot |
| GET | `/api/progression` | Yes | Get progression data |
| PUT | `/api/progression` | Yes | Save progression |
| POST | `/api/progression/sync` | Yes | Merge local + server data |
| POST | `/api/stats/game` | Yes | Record completed game |
| GET | `/api/stats/me` | Yes | My stats and recent games |
| POST | `/api/stats/achievements` | Yes | Unlock achievement |
| GET | `/api/stats/achievements` | Yes | My achievements |
| GET | `/api/stats/achievements/global` | No | Global achievement percentages |

### Database

10 tables managed by Drizzle ORM: `user`, `session`, `account`, `verification` (Better Auth), `profiles`, `leaderboard_entries`, `game_saves`, `progression`, `achievements`, `game_history`.

Guest mode is fully preserved -- the game works without an account. API calls silently return null when not logged in.

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

CSS 3D transforms require a modern browser with hardware acceleration for best performance.

## License

MIT License -- feel free to use this project for learning and experimentation.

## Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests

---

**Built with CSS 3D Transforms**
