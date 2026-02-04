# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run watch     # Development mode with file watching (default)
npm run build     # Build for development (compiles LESS, injects unminified files)
npm run compile   # Production build (minified output in dist/)
```

To run locally, open `index.html` in a browser or use `python -m http.server 8080`.

## Architecture Overview

This is a 3D tower defense game rendered entirely with CSS 3D transforms and vanilla JavaScript (no Canvas/WebGL). All modules use the Revealing Module Pattern as IIFEs exposing a public API.

### Script Load Order (Critical)

Scripts must load in this order (defined in `gulpfile.js`):

1. `utils.js` - Utility functions (throttle, lerp, distance, etc.)
2. `pool.js` - Object pooling for DOM element reuse
3. `noise.js` - Perlin noise generator
4. `effects.js` - Visual effects manager, FPS monitoring
5. `path.js` - 12x8 grid map system, pathfinding
6. `weather.js` - Day/night cycle, weather effects
7. `seasons.js` - Seasonal themes
8. `progression.js` - XP, leveling, tech tree
9. `enemy.js` - Enemy AI and behavior
10. `tower.js` - Tower mechanics (6 types: arrow, cannon, ice, magic, tesla, flame)
11. `projectile.js` - Projectile physics with ballistic calculations
12. `wave.js` - Wave spawning system (10 waves)
13. `display.js` - UI updates, announcements
14. `shop.js` - Tower selection UI
15. `sfx.js` - Web Audio API + Howler.js audio
16. `game.js` - Main game loop, state management
17. `controller.js` - Input handling, initialization entry point

### Event-Driven Communication

Systems communicate via CustomEvent dispatch on `document`:
```javascript
emitGameEvent(eventName, detail);  // Helper in utils.js
document.dispatchEvent(new CustomEvent(eventName, { detail }));
```

Key events: `enemyKilled`, `enemyReachedEnd`, `waveStarted`, `waveComplete`, `towerPlaced`, `towerFired`, `towerSold`, `bossSpawned`, `bossPhaseChange`

### Styling Architecture

- LESS preprocessor with `styles/app.less` as entry point
- CSS variables (`--color-*`) for dynamic theming (day/night, weather)
- LESS variables (`@color-*`) for static colors
- All 3D rendering via CSS transforms with 45° isometric perspective
- Key mixins in `vars.less`: `.pop-shadow()`, `.comic-border()`, `.gpu-accelerate()`

### Object Pooling

`pool.js` provides DOM element pooling for enemies, projectiles, and particles:
```javascript
Pool.acquire('enemies');  // Get element from pool
Pool.release('enemies', element);  // Return to pool
```

## Key Files

- `index.src.html` - HTML template (Gulp injects scripts/styles)
- `game.js` - Game loop, state machine (MENU → PLAYING → PAUSED/GAME_OVER/VICTORY)
- `controller.js` - Initialization sequence, input handlers
- `vars.less` - All CSS variables, mixins, and keyframe definitions

## Game Configuration

- Grid: 12 columns × 8 rows, 60px cell size
- Starting: 100 gold, 20 lives
- Tower sell value: 75% of cost
- Progression: XP = 100 × 1.5^(level-1)
