# CSS Tower Defense

A stunning 3D tower defense game rendered entirely with CSS transforms and vanilla JavaScript. No Canvas, no WebGL - just pure CSS magic!

![CSS Tower Defense](https://img.shields.io/badge/CSS-3D%20Transforms-blue?style=for-the-badge&logo=css3)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla%20ES6-yellow?style=for-the-badge&logo=javascript)
![LESS](https://img.shields.io/badge/LESS-Preprocessor-1d365d?style=for-the-badge&logo=less)

## Features

- **Pure CSS 3D Rendering** - All game objects are rendered using CSS 3D transforms
- **Neon Glow Visual Effects** - Inspired by retro arcade aesthetics
- **4 Unique Tower Types** - Arrow, Cannon, Ice, and Magic towers
- **4 Enemy Types** - Slimes, Goblins, Knights, and Bosses
- **10 Progressive Waves** - Increasing difficulty with strategic challenges
- **Synthesized Sound Effects** - Web Audio API for immersive audio
- **No External Dependencies** - Pure vanilla JavaScript, no frameworks

## Screenshots

### Start Screen
Neon-styled title with glowing effects

### Gameplay
3D isometric map with starry night background, glowing towers, and animated enemies

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **CSS 3D Transforms** | 3D rendering of game world and entities |
| **Vanilla JavaScript** | Game logic, physics, and state management |
| **LESS** | CSS preprocessing with variables and mixins |
| **Gulp** | Build automation and asset compilation |
| **Web Audio API** | Synthesized sound effects |

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/ChanMeng666/css-tower-defense.git

# Navigate to project directory
cd css-tower-defense

# Install dependencies
npm install

# Build the project
npm run build

# For development with watch mode
npm run watch
```

### Running the Game

Open `index.html` in a modern browser, or use a local server:

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve
```

## How to Play

1. **Select a Tower** - Click on a tower type in the shop panel
2. **Place Tower** - Click on a green grass cell to place the tower
3. **Start Wave** - Click "Start Wave" to begin enemy spawning
4. **Defend** - Towers automatically attack enemies in range
5. **Survive** - Don't let enemies reach your castle!

## Controls

| Key | Action |
|-----|--------|
| `1-4` | Quick select tower types |
| `Space` | Start next wave |
| `Esc` | Deselect tower |
| `Click` | Place tower / Select placed tower |

## Tower Types

| Tower | Cost | Damage | Range | Special |
|-------|------|--------|-------|---------|
| 🏹 **Arrow** | 50 | 25 | 150px | Fast attack speed |
| 💣 **Cannon** | 100 | 60 | 120px | Area splash damage |
| ❄️ **Ice** | 75 | 15 | 130px | Slows enemies |
| ✨ **Magic** | 150 | 45 | 180px | Ignores armor |

## Enemy Types

| Enemy | Health | Speed | Reward |
|-------|--------|-------|--------|
| 🟢 **Slime** | 100 | 1.2 | 25 |
| 🟠 **Goblin** | 80 | 1.8 | 30 |
| 🔵 **Knight** | 200 | 0.8 | 50 |
| 🟣 **Boss** | 500 | 0.6 | 200 |

## Project Structure

```
css-tower-defense/
├── index.src.html      # Source HTML template
├── index.html          # Built HTML (generated)
├── gulpfile.js         # Build configuration
├── package.json        # Project dependencies
├── styles/
│   ├── vars.less       # Variables, mixins, keyframes
│   ├── game.less       # UI and screen styles
│   ├── map.less        # Map and environment
│   ├── tower.less      # Tower 3D models
│   ├── enemy.less      # Enemy 3D models
│   └── projectile.less # Projectile effects
├── scripts/
│   ├── path.js         # Grid and pathfinding
│   ├── enemy.js        # Enemy logic
│   ├── tower.js        # Tower logic
│   ├── projectile.js   # Projectile physics
│   ├── wave.js         # Wave management
│   ├── game.js         # Core game loop
│   ├── display.js      # UI updates
│   ├── shop.js         # Tower shop
│   ├── sfx.js          # Sound effects
│   └── controller.js   # Input handling
├── vendor/
│   └── prefixfree.min.js
└── dist/               # Production build
```

## Visual Design

The game features a unique visual style combining:

- **Neon Glow Effects** - Inspired by retro arcade games
- **CSS 3D Transforms** - Isometric perspective rendering
- **Starry Night Theme** - Atmospheric background with moon
- **Color-coded Elements** - Each tower/enemy type has distinct colors
- **Particle Effects** - Frost, fire, and magic particles

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

*Note: CSS 3D transforms require a modern browser with hardware acceleration for best performance.*

## Inspired By

This project is inspired by [CSS Space Shooter](https://github.com/example/css-space-shooter), demonstrating that complex games can be built using only CSS for rendering.

## License

MIT License - feel free to use this project for learning and experimentation!

## Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

---

**Made with CSS 3D Transforms**
