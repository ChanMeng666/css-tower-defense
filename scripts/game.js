/**
 * CSS Tower Defense - Game Core
 * Main game loop, state management, and event coordination
 */

// Global event constants for decoupled module communication
var EVENTS = {
    BOSS_SPAWNED: 'bossSpawned',
    BOSS_PHASE_CHANGE: 'bossPhaseChange',
    BOSS_SKILL_USED: 'bossSkillUsed',
    COMBO_KILL: 'comboKill',
    TOWER_UPGRADED: 'towerUpgraded',
    SPECIAL_EVENT: 'specialEvent',
    WAVE_ANNOUNCEMENT: 'waveAnnouncement',
    WARNING: 'warning'
};

/**
 * Emit a game event for decoupled communication
 * @param {string} eventName - Event name from EVENTS constant
 * @param {object} detail - Event details
 */
function emitGameEvent(eventName, detail) {
    document.dispatchEvent(new CustomEvent(eventName, { detail: detail || {} }));
}

var Game = (function () {
    'use strict';

    // Game states
    var STATES = {
        MENU: 'menu',
        PLAYING: 'playing',
        PAUSED: 'paused',
        GAME_OVER: 'gameOver',
        VICTORY: 'victory'
    };

    // Game state
    var state = STATES.MENU;
    var gold = 100;
    var lives = 20;
    var score = 0;
    var highScore = 0;

    // Timing
    var lastFrameTime = 0;
    var animationFrameId = null;

    // Selected tower type for building
    var selectedTowerType = null;

    /**
     * Initialize the game
     */
    function init() {
        // Load high score from localStorage
        highScore = parseInt(localStorage.getItem('towerDefenseHighScore')) || 0;

        // Initialize utilities and object pool
        if (typeof Utils !== 'undefined') {
            Utils.resetThrottles();
        }
        if (typeof Pool !== 'undefined') {
            Pool.init();
        }

        // Initialize subsystems
        Path.init();
        Path.render();
        Weather.init(); // Init Weather
        Seasons.init(); // Init Seasons
        Progression.init(); // Init Progression
        Enemy.init();
        Tower.init();
        Projectile.init();
        Wave.init();

        // Setup event listeners
        setupEventListeners();

        // Update display
        Display.updateGold(gold);
        Display.updateLives(lives);
        Display.updateScore(score);
        Display.updateWave(Wave.getCurrentWave(), Wave.getTotalWaves());

        // Start menu music after user interaction (for autoplay policy)
        document.addEventListener('click', function startMenuMusic() {
            if (state === STATES.MENU) {
                Sfx.playMusic('menu');
            }
            document.removeEventListener('click', startMenuMusic);
        }, { once: true });
    }

    /**
     * Setup game event listeners
     */
    function setupEventListeners() {
        // Enemy killed
        document.addEventListener('enemyKilled', function (e) {
            var reward = e.detail.reward;
            addGold(reward);
            addScore(reward * 10);
            Sfx.play('kill');
        });

        // Enemy reached end
        document.addEventListener('enemyReachedEnd', function (e) {
            var damage = e.detail.damage;
            takeDamage(damage);
            Sfx.play('damage');
        });

        // Wave started
        document.addEventListener('waveStarted', function (e) {
            Display.updateWave(e.detail.wave, e.detail.totalWaves);
            Display.showMessage('Wave ' + e.detail.wave + ' incoming!');
            Sfx.play('waveStart');
        });

        // Wave complete
        document.addEventListener('waveComplete', function (e) {
            addGold(e.detail.reward);
            addScore(e.detail.reward * 5);
            Display.showMessage('Wave Complete! +' + e.detail.reward + ' gold');
            Sfx.play('waveComplete');

            // Check for victory
            if (e.detail.isLastWave) {
                victory();
            } else {
                Display.updateWave(Wave.getCurrentWave(), Wave.getTotalWaves());
            }
        });

        // Tower placed
        document.addEventListener('towerPlaced', function (e) {
            Sfx.play('place');
        });

        // Tower fired - use spatial audio
        document.addEventListener('towerFired', function (e) {
            var type = e.detail.tower.type;
            var x = e.detail.x || 0;
            var y = e.detail.y || 0;

            // Use spatial audio if available
            if (Sfx.playSpatial) {
                Sfx.playSpatial('shoot_' + type, x, y);
            } else {
                Sfx.play('shoot_' + type);
            }
        });

        // Tower sold
        document.addEventListener('towerSold', function (e) {
            addGold(e.detail.gold);
            Sfx.play('sell');
        });
    }

    /**
     * Start the game
     */
    function start() {
        if (state !== STATES.MENU && state !== STATES.GAME_OVER && state !== STATES.VICTORY) {
            return;
        }

        // Reset game state
        gold = 100;
        lives = 20;
        score = 0;
        selectedTowerType = null;

        // Clear and reinitialize
        Enemy.clear();
        Tower.clear();
        Projectile.clear();
        Path.init();
        Path.render();
        Wave.init();

        // Clear object pool in-use items
        if (typeof Pool !== 'undefined') {
            Pool.clear();
        }

        // Update display
        Display.updateGold(gold);
        Display.updateLives(lives);
        Display.updateScore(score);
        Display.updateWave(Wave.getCurrentWave(), Wave.getTotalWaves());
        Display.hideStartScreen();
        Display.hideGameOverScreen();
        Display.showGameUI();

        // Start game loop
        state = STATES.PLAYING;
        lastFrameTime = performance.now();
        gameLoop();

        Sfx.play('start');
        Sfx.playMusic('playing');

        // Hide loading screen if present
        var loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }

    /**
     * Main game loop
     */
    function gameLoop() {
        if (state !== STATES.PLAYING) {
            return;
        }

        var currentTime = performance.now();
        var dt = (currentTime - lastFrameTime) / 1000; // Convert to seconds
        lastFrameTime = currentTime;

        // Cap delta time to prevent large jumps
        if (dt > 0.1) dt = 0.1;

        // Update game systems
        Wave.update(dt);
        Weather.update(dt); // Update Weather
        Enemy.update(dt);
        Tower.update(dt, currentTime);
        Projectile.update(dt);

        // Check for game over
        if (lives <= 0) {
            gameOver();
            return;
        }

        // Check for victory
        if (Wave.isGameComplete()) {
            victory();
            return;
        }

        // Continue loop
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    /**
     * Pause the game
     */
    function pause() {
        if (state !== STATES.PLAYING) return;

        state = STATES.PAUSED;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        Sfx.pauseMusic();
    }

    /**
     * Resume the game
     */
    function resume() {
        if (state !== STATES.PAUSED) return;

        state = STATES.PLAYING;
        lastFrameTime = performance.now();
        gameLoop();
        Sfx.resumeMusic();
    }

    /**
     * Game over
     */
    function gameOver() {
        state = STATES.GAME_OVER;

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Update high score
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('towerDefenseHighScore', highScore);
        }

        Display.showGameOverScreen(false, score);
        Sfx.play('gameOver');
        Sfx.playMusic('defeat');
    }

    /**
     * Victory
     */
    function victory() {
        state = STATES.VICTORY;

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Bonus score for remaining lives
        var bonusScore = lives * 100;
        score += bonusScore;

        // Update high score
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('towerDefenseHighScore', highScore);
        }

        Display.showGameOverScreen(true, score);
        Sfx.play('victory');
        Sfx.playMusic('victory');
    }

    /**
     * Add gold
     */
    function addGold(amount) {
        gold += amount;
        Display.updateGold(gold);
    }

    /**
     * Spend gold
     */
    function spendGold(amount) {
        if (gold >= amount) {
            gold -= amount;
            Display.updateGold(gold);
            return true;
        }
        return false;
    }

    /**
     * Add score
     */
    function addScore(amount) {
        score += amount;
        Display.updateScore(score);
    }

    /**
     * Take damage
     */
    function takeDamage(amount) {
        lives -= amount;
        if (lives < 0) lives = 0;
        Display.updateLives(lives);
    }

    /**
     * Select tower type for building
     */
    function selectTowerType(type) {
        if (type && !Tower.getType(type)) {
            return false;
        }

        selectedTowerType = type;
        Display.selectTower(type);
        return true;
    }

    /**
     * Try to place a tower at grid position
     */
    function placeTower(gridX, gridY) {
        if (!selectedTowerType) return false;
        if (state !== STATES.PLAYING) return false;

        var config = Tower.getType(selectedTowerType);
        if (!config) return false;

        // Check if can afford
        if (gold < config.cost) {
            Display.showMessage('Not enough gold!');
            Sfx.play('error');
            return false;
        }

        // Check if can build
        if (!Path.canBuild(gridX, gridY)) {
            Display.showMessage('Cannot build here!');
            Sfx.play('error');
            return false;
        }

        // Create tower
        var tower = Tower.create(selectedTowerType, gridX, gridY);
        if (tower) {
            spendGold(config.cost);
            return true;
        }

        return false;
    }

    /**
     * Start the next wave
     */
    function startNextWave() {
        if (state !== STATES.PLAYING) return false;
        if (Wave.isWaveInProgress()) return false;

        return Wave.startWave();
    }

    /**
     * Get current game state
     */
    function getState() {
        return state;
    }

    /**
     * Get current gold
     */
    function getGold() {
        return gold;
    }

    /**
     * Get selected tower type
     */
    function getSelectedTowerType() {
        return selectedTowerType;
    }

    /**
     * Check if can afford tower
     */
    function canAfford(type) {
        var config = Tower.getType(type);
        return config && gold >= config.cost;
    }

    // Public API
    return {
        init: init,
        start: start,
        pause: pause,
        resume: resume,
        selectTowerType: selectTowerType,
        placeTower: placeTower,
        startNextWave: startNextWave,
        getState: getState,
        getGold: getGold,
        getSelectedTowerType: getSelectedTowerType,
        canAfford: canAfford,
        addGold: addGold,
        spendGold: spendGold,
        STATES: STATES
    };
})();
