# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run watch     # Development mode with file watching (default)
npm run build     # Build for development (compiles LESS, injects unminified files)
npm run compile   # Production build (minified output in dist/)
npm run dev       # Concurrent frontend watch + backend dev server
npm run deploy    # Production compile + deploy worker to Cloudflare
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run Drizzle migrations
npm run db:studio    # Open Drizzle Studio
```

To run locally, open `index.html` in a browser or use `python -m http.server 8080`.

## Architecture Overview

This is a 3D tower defense game rendered entirely with CSS 3D transforms and vanilla JavaScript (no Canvas/WebGL). All modules use the Revealing Module Pattern as IIFEs exposing a public API.

### Script Load Order (Critical)

Scripts must load in this exact order (defined in `gulpfile.js`):

1. `utils.js` - Utility functions (throttle, lerp, distance, emitGameEvent)
2. `pool.js` - Object pooling for DOM element reuse
3. `noise.js` - Perlin noise generator
4. `effects.js` - Visual effects manager, FPS monitoring
5. `path.js` - 12x8 grid map system, pathfinding
6. `weather.js` - Day/night cycle, weather effects and modifiers
7. `seasons.js` - Seasonal themes and gameplay modifiers
8. `auth.js` - Auth UI + session management
9. `api.js` - Backend API client (silentRequest for guest mode)
10. `progression.js` - XP, leveling, tech tree (10 upgrades)
11. `inventory.js` - Inventory/loot system (Terraria-inspired materials)
12. `enemy.js` - Enemy AI, variants, boss skills
13. `tower.js` - Tower mechanics (6 types), upgrades, reforging
14. `projectile.js` - Projectile physics with ballistic calculations
15. `wave.js` - Wave spawning system (10 waves)
16. `display.js` - UI updates, announcements
17. `shop.js` - Tower selection UI
18. `sfx.js` - Web Audio API synth + Howler.js music/samples
19. `game.js` - Main game loop, state management, combo system
20. `achievements.js` - Achievement system (10 achievements, localStorage + server sync)
21. `controller.js` - Input handling, initialization entry point

### Event-Driven Communication

Systems communicate via CustomEvent dispatch on `document`:
```javascript
emitGameEvent(eventName, detail);  // Helper in utils.js
document.dispatchEvent(new CustomEvent(eventName, { detail }));
```

Key events:
- **Core:** `enemyKilled`, `enemyReachedEnd`, `waveStarted`, `waveComplete`, `towerPlaced`, `towerFired`, `towerSold`
- **Boss:** `bossSpawned`, `bossPhaseChange`, `bossSkillUsed`, `bossEntrance`
- **Combat:** `comboKill`, `towerUpgraded`
- **Environment:** `weatherChanged`, `seasonChanged`, `performanceLevelChanged`
- **UI:** `waveAnnouncement`, `warning`, `specialEvent`
- **Auth:** `authStateChanged`

Global EVENTS constants are defined in `game.js` (lines 7-17).

### Styling Architecture

- LESS preprocessor with `styles/app.less` as entry point
- CSS variables (`--color-*`) for dynamic theming (day/night, weather, seasons) -- set by JS at runtime
- LESS variables (`@color-*`) for static colors -- compiled at build time
- `fade()` and `lighten()` LESS functions require hex values, not CSS vars
- All 3D rendering via CSS transforms with 45° isometric perspective

**LESS files:**

| File | Purpose |
|------|---------|
| `vars.less` | Variables, mixins, keyframe definitions |
| `app.less` | Entry point, imports all other files |
| `game.less` | UI, screens, menus, HUD, stat bar |
| `map.less` | Map grid, environment, sky, paths |
| `tower.less` | Tower 3D models and selection UI |
| `enemy.less` | Enemy 3D models and health bars |
| `projectile.less` | Projectile trail effects |
| `effects.less` | Particle effects, explosions |
| `effects-fire.less` | Fire/flame tower visual effects |
| `effects-weather.less` | Rain, snow, fog, wind particles |
| `auth.less` | Auth modal and login/register forms |
| `loading.less` | Loading screen animation |

**Key mixins in `vars.less`:**

| Mixin | Purpose |
|-------|---------|
| `.pop-shadow(@x, @y, @color)` | Hard-offset box shadow (comic style) |
| `.comic-border(@width, @color)` | Thick outline border |
| `.text-outline(@color, @width)` | Text stroke + text-shadow fallback |
| `.halftone-bg(@dot-color, @dot-size)` | Radial gradient dot pattern |
| `.flex-center()` | Flex centering shorthand |
| `.preserve-3d()` | transform-style: preserve-3d |
| `.no-select()` | Disable text selection |
| `.gpu-accelerate()` | translateZ(0) + will-change + backface-visibility |
| `.contain-paint()` | CSS containment for layout/style/paint |

### Object Pooling

`pool.js` provides DOM element pooling for enemies, projectiles, and particles:
```javascript
Pool.acquire('enemies');  // Get element from pool
Pool.release('enemies', element);  // Return to pool
```

### Environmental Systems

**Day/Night:** Wave-driven -- odd waves = day (sun angle 90°), even waves = night (270°). Sky transitions use 3s CSS transition on `.sky-body-container`. Night uses warm navy `#1A2A3A`.

**Seasons:** Mapped to waves via `WAVE_SEASON_MAP`: waves 1-2 = Summer, 3-4 = Autumn, 5-6 = Winter, 7-8 = Spring, 9-10 = Summer. Each season sets CSS custom properties for grass/path/sky colors and provides tower/gold modifiers via `Seasons.getTowerModifier(type, stat)` and `Seasons.getGoldMultiplier()`.

**Weather:** Randomly selected per wave using seasonal weights from `Seasons.getWeatherWeights()`. Types: clear, rain, fog, wind, snow, heatwave. Modifier API: `Weather.getRangeMultiplier()`, `getEnemySpeedMultiplier()`, `getGoldMultiplier()`, `getTowerModifier()`.

**Blood Moon:** Night-only (even waves), probability = `waveNum * 0.025`. Overrides normal night modifiers via `Weather.setBloodMoon()`.

**Env bar UI:** Pills showing time/weather/season/event below the stat bar.

### Backend Architecture

**Stack:** Cloudflare Workers (Hono framework) + Neon DB (serverless Postgres) via `@neondatabase/serverless` + Drizzle ORM + Better Auth (session cookies) + Zod validation.

**Directory structure:**
```
worker/src/
├── index.ts              # Hono app, route mounting, CORS
├── db/
│   ├── index.ts          # getDb() helper (Neon serverless connection)
│   └── schema.ts         # All Drizzle table definitions (10 tables)
├── middleware/
│   └── auth.ts           # requireAuth middleware
├── routes/
│   ├── auth.ts           # Better Auth catch-all (/api/auth/*)
│   ├── leaderboard.ts    # GET/POST /api/leaderboard, GET /api/leaderboard/me
│   ├── saves.ts          # GET /api/saves, PUT/DELETE /api/saves/:slot
│   ├── progression.ts    # GET/PUT /api/progression, POST /api/progression/sync
│   └── stats.ts          # POST /api/stats/game, GET /api/stats/me, achievements CRUD
└── services/
    └── anticheat.ts      # Score validation rules
```

**Database tables:** `user`, `session`, `account`, `verification` (Better Auth), `profiles`, `leaderboard_entries`, `game_saves`, `progression`, `achievements`, `game_history`.

**Frontend integration:** `auth.js` handles login/register UI and session state. `api.js` provides `API.silentRequest()` which returns null when not logged in (guest mode preserved). Both are IIFEs loaded after `seasons.js` in script order.

**Deployment:** `npm run deploy` compiles frontend + deploys worker. Secrets set via `wrangler secret put` (DATABASE_URL, BETTER_AUTH_SECRET).

## Key Files

- `index.src.html` - HTML template (Gulp injects scripts/styles)
- `gulpfile.js` - Build config, script load order array, Gulp tasks
- `game.js` - Game loop, state machine (MENU -> PLAYING -> PAUSED/GAME_OVER/VICTORY), EVENTS constants, combo system, difficulty modes
- `controller.js` - Initialization sequence, input handlers, entry point
- `vars.less` - All CSS variables, mixins, and keyframe definitions
- `tower.js` - Tower stats (TOWER_DATA), prefix system (PREFIXES), upgrade/reforge logic
- `enemy.js` - Enemy stats (ENEMY_DATA), variant multipliers (VARIANTS), boss skills
- `wave.js` - Wave definitions, spawn scheduling, boss entrance
- `weather.js` - Weather types, modifier calculations, Blood Moon
- `seasons.js` - Season definitions, WAVE_SEASON_MAP, CSS property updates
- `progression.js` - UPGRADES config, XP formula, skill point spending
- `inventory.js` - MATERIALS, drop tables, variant multipliers
- `achievements.js` - Achievement definitions, unlock conditions, notification UI
- `worker/src/db/schema.ts` - All database table definitions
- `worker/src/services/anticheat.ts` - Score validation rules

## Game Configuration

- **Grid:** 12 columns x 8 rows, 60px cell size
- **Starting resources:** 100 gold (+ Progression bonus), 20 lives (+ Progression bonus)
- **Tower sell value:** 60% of total invested cost
- **Upgrade cost:** `floor(baseCost * 0.75 * level)`
- **Reforge cost:** `floor(baseCost * 0.5)`
- **Tower max level:** 3

### Difficulty Modes

| Mode | Health Mult | Damage Mult | Gold Mult | XP Mult |
|------|------------|------------|----------|---------|
| Normal | 1.0 | 1.0 | 1.0 | 1.0 |
| Hard | 1.5 | 1.5 | 1.3 | 1.5 |
| Expert | 2.0 | 2.0 | 1.5 | 2.0 |

### Combo System

- Timeout: 1.5 seconds between kills
- Minimum for bonus: 3 kills
- Bonus: 10% extra gold per kill in combo (after threshold)
- End-of-combo bonus: `comboCount * 5` gold

### Progression Formula

- XP per level: `floor(100 * 1.5^(level-1))`
- XP from kills: `enemyReward * 2`
- XP from waves: wave reward value

### Tower Stats

| Tower | Cost | Damage | Range | Fire Rate | Special |
|-------|------|--------|-------|-----------|---------|
| Arrow | 50 | 15 | 120px | 2.0/s | -- |
| Cannon | 100 | 30 | 150px | 0.8/s | splashRadius: 60 |
| Ice | 75 | 10 | 100px | 1.5/s | slowEffect: 0.5, slowDuration: 2 |
| Magic | 150 | 50 | 200px | 0.5/s | ignoreArmor: true |
| Tesla | 200 | 40 | 140px | 2.5/s | chainTargets: 3, chainDamageFalloff: 0.7 |
| Flame | 250 | 5 | 100px | 10/s | burnDamage: 3, burnDuration: 3, burnInterval: 0.5 |

### Enemy Stats

| Enemy | Health | Speed | Reward | Damage | Armor |
|-------|--------|-------|--------|--------|-------|
| Slime | 50 | 40 | 10 | 1 | 0 |
| Goblin | 80 | 60 | 15 | 1 | 0 |
| Knight | 200 | 30 | 25 | 2 | 5 |
| Boss | 1000 | 20 | 100 | 5 | 10 |

### Enemy Variants

| Variant | HP Mult | Speed Mult | Reward Mult | Dmg Mult | Armor Bonus |
|---------|---------|-----------|-------------|----------|-------------|
| Elite | 2.0 | 1.3 | 2.5 | 1.5 | 0 |
| Armored | 1.5 | 0.8 | 1.8 | 1.0 | +10 |
| Speedy | 0.7 | 2.0 | 1.5 | 1.0 | 0 |
| Toxic | 1.2 | 1.0 | 2.0 | 2.0 | 0 |
