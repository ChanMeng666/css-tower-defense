/**
 * CSS Tower Defense - Game Core
 * Main game loop, state management, and event coordination
 */

// Global event constants for decoupled module communication
var EVENTS = {
    BOSS_SPAWNED: 'bossSpawned',
    BOSS_PHASE_CHANGE: 'bossPhaseChange',
    BOSS_SKILL_USED: 'bossSkillUsed',
    BOSS_ENTRANCE: 'bossEntrance',
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

    // Difficulty modes (Terraria-inspired)
    var DIFFICULTIES = {
        normal: { name: 'Normal', healthMult: 1.0, damageMult: 1.0, goldMult: 1.0, xpMult: 1.0 },
        hard: { name: 'Hard', healthMult: 1.5, damageMult: 1.5, goldMult: 1.3, xpMult: 1.5 },
        expert: { name: 'Expert', healthMult: 2.0, damageMult: 2.0, goldMult: 1.5, xpMult: 2.0 }
    };

    // Game state
    var state = STATES.MENU;
    var difficulty = 'normal';
    var gold = 100;
    var lives = 20;
    var score = 0;
    var highScore = 0;

    // Combo system
    var comboCount = 0;
    var comboTimer = 0;
    var COMBO_TIMEOUT = 1.5; // seconds
    var COMBO_MIN_FOR_BONUS = 3; // Minimum kills for combo bonus

    // Timing
    var lastFrameTime = 0;
    var gameStartTime = 0;
    var animationFrameId = null;

    // Stats tracking
    var totalEnemiesKilled = 0;
    var totalTowersBuilt = 0;
    var totalGoldEarned = 0;

    // Selected tower type for building
    var selectedTowerType = null;

    /**
     * Show verification prompt when score is pending
     */
    function showVerificationPrompt() {
        // Remove existing modal if any
        var existing = document.getElementById('verifyEmailModal');
        if (existing) existing.remove();

        var modal = document.createElement('div');
        modal.id = 'verifyEmailModal';
        modal.className = 'verify-modal';
        modal.innerHTML =
            '<div class="verify-modal-content">' +
                '<h3>Verify Your Email</h3>' +
                '<p>Your score has been saved! To appear on the leaderboard, please verify your email address.</p>' +
                '<p class="verify-email-hint">Check your inbox for the verification link.</p>' +
                '<div class="verify-buttons">' +
                    '<button class="btn-primary" id="resendVerifyBtn">Resend Email</button>' +
                    '<button class="btn-secondary" id="closeVerifyBtn">Close</button>' +
                '</div>' +
                '<p class="verify-note">Your pending scores will automatically appear on the leaderboard once verified.</p>' +
            '</div>';
        document.body.appendChild(modal);

        // Resend button handler
        document.getElementById('resendVerifyBtn').onclick = function() {
            var btn = this;
            btn.disabled = true;
            btn.textContent = 'Sending...';

            if (typeof API !== 'undefined' && API.resendVerificationEmail) {
                API.resendVerificationEmail()
                    .then(function(result) {
                        btn.textContent = 'Email Sent!';
                        setTimeout(function() {
                            btn.disabled = false;
                            btn.textContent = 'Resend Email';
                        }, 3000);
                    })
                    .catch(function(err) {
                        btn.textContent = 'Failed - Try Again';
                        btn.disabled = false;
                    });
            }
        };

        // Close button handler
        document.getElementById('closeVerifyBtn').onclick = function() {
            modal.remove();
        };

        // Close on click outside
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        };
    }

    /**
     * Initialize the game
     */
    function init() {
        // High score starts at 0 - will load from server when user logs in
        highScore = 0;

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
        if (typeof Inventory !== 'undefined') {
            Inventory.init(); // Init Inventory/Loot System
        }
        if (typeof Achievements !== 'undefined') {
            Achievements.init(); // Init Achievement System
        }
        if (typeof Crafting !== 'undefined') {
            Crafting.init(); // Init Crafting System
        }
        if (typeof Effects !== 'undefined') {
            Effects.init(); // Init Visual Effects Manager
        }
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
            var baseReward = e.detail.reward;
            // Apply difficulty, progression, and environmental gold multipliers
            var envGold = 1.0;
            if (typeof Weather !== 'undefined' && Weather.getGoldMultiplier) {
                envGold *= Weather.getGoldMultiplier();
            }
            if (typeof Seasons !== 'undefined' && Seasons.getGoldMultiplier) {
                envGold *= Seasons.getGoldMultiplier();
            }
            // Apply crafting gold multiplier
            var craftGold = (typeof Crafting !== 'undefined' && Crafting.getMultiplier) ? Crafting.getMultiplier('gold_mult') : 1.0;
            var reward = Math.floor(baseReward * DIFFICULTIES[difficulty].goldMult * Progression.getGoldMultiplier() * envGold * craftGold);

            // Challenge: suppress kill gold for economy challenges
            if (typeof Challenge !== 'undefined' && Challenge.isActive() && Challenge.isNoKillGold()) {
                reward = 0;
            }

            // Combo system
            comboCount++;
            comboTimer = COMBO_TIMEOUT;

            // Apply combo bonus (10% extra per kill in combo, starting at 3 kills)
            if (comboCount >= COMBO_MIN_FOR_BONUS) {
                var comboBonus = Math.floor(reward * 0.1 * (comboCount - COMBO_MIN_FOR_BONUS + 1));
                reward += comboBonus;
                Display.showCombo(comboCount, comboBonus);
            }

            addGold(reward);
            totalGoldEarned += reward;
            totalEnemiesKilled++;
            addScore(reward * 10);
            Sfx.play('kill');

            // Play death sample for heavy enemies (toa/taniwha)
            var enemyType = e.detail.type;
            if (enemyType === 'toa' || enemyType === 'taniwha') {
                Sfx.playEffect('death');
            }

            // Emit combo event
            if (typeof emitGameEvent === 'function') {
                emitGameEvent(EVENTS.COMBO_KILL, { count: comboCount, reward: reward });
            }
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
            Sfx.play('waveStart');
        });

        // Wave complete
        document.addEventListener('waveComplete', function (e) {
            var waveReward = e.detail.reward;
            // Apply seasonal wave reward multiplier
            if (typeof Seasons !== 'undefined' && Seasons.getWaveRewardMultiplier) {
                waveReward = Math.floor(waveReward * Seasons.getWaveRewardMultiplier());
            }
            addGold(waveReward);
            addScore(waveReward * 5);
            Display.showMessage('Wave Complete!');
            Sfx.play('waveComplete');

            // Always update wave display and button
            Display.updateWave(Wave.getCurrentWave(), Wave.getTotalWaves());

            // Repair Drone event - wave 6+, 20% chance if lives < 10
            if (e.detail.wave >= 6 && lives < 10 && Math.random() < 0.20) {
                addLives(5);
                Display.showMessage('Repair Drone!');
                Sfx.play('powerup');
            }

            // Survival mode: auto-start next wave after delay
            if (typeof Challenge !== 'undefined' && Challenge.isActive() && Challenge.isSurvivalMode() && !e.detail.isLastWave) {
                setTimeout(function() {
                    if (state === STATES.PLAYING) {
                        startNextWave();
                    }
                }, 2000);
            }

            // Check for victory
            if (e.detail.isLastWave) {
                victory();
            }
        });

        // Tower placed
        document.addEventListener('towerPlaced', function (e) {
            totalTowersBuilt++;
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

        // Boss skill used (karanga, kaitiaki, teRiri)
        document.addEventListener('bossSkillUsed', function(e) {
            var skill = e.detail.skill;
            if (skill === 'karanga') {
                Sfx.play('bossSkill');
                Sfx.playEffect('warning');
            } else if (skill === 'kaitiaki') {
                Sfx.play('bossShield');
            } else if (skill === 'teRiri') {
                Sfx.play('bossEnrage');
            }
        });

        // Boss entrance
        document.addEventListener('bossEntrance', function(e) {
            Sfx.playEffect('warning');
            Sfx.play('bossSpawn');
        });

        // Wave warnings (e.g., "Toa have high armor!")
        document.addEventListener('warning', function(e) {
            Sfx.playEffect('warning');
        });

        // Projectile splash impact
        document.addEventListener('projectileImpact', function(e) {
            if (e.detail.splash) {
                Sfx.playEffect('blast');
            }
        });

        // Weather changed
        document.addEventListener('weatherChanged', function(e) {
            Sfx.play('weatherChange');
        });

        // Combo kill sound
        document.addEventListener('comboKill', function(e) {
            if (e.detail.count >= 3) {
                Sfx.play('comboKill');
            }
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
        gold = 100 + Progression.getStartingGoldBonus();
        lives = 20 + Progression.getExtraLives();
        score = 0;

        // Apply challenge start modifiers
        if (typeof Challenge !== 'undefined' && Challenge.isActive()) {
            var mods = Challenge.getStartModifiers();
            if (mods.gold !== undefined) gold = mods.gold;
            if (mods.lives !== undefined) lives = mods.lives;
        }
        selectedTowerType = null;
        totalEnemiesKilled = 0;
        totalTowersBuilt = 0;
        totalGoldEarned = 0;
        gameStartTime = performance.now();

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

        // Inject challenge custom waves, lock season/weather
        if (typeof Challenge !== 'undefined' && Challenge.isActive()) {
            var challengeWaves = Challenge.getChallengeWaves();
            if (challengeWaves) {
                Wave.setWaveData(challengeWaves);
            }
            var fixedSeason = Challenge.getFixedSeason();
            if (fixedSeason && typeof Seasons !== 'undefined' && Seasons.setSeason) {
                Seasons.setSeason(fixedSeason);
            }
            var fixedWeather = Challenge.getFixedWeather();
            if (fixedWeather && typeof Weather !== 'undefined' && Weather.setWeather) {
                Weather.setWeather(fixedWeather);
            }
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

        // Update challenge timer and check time limit
        if (typeof Challenge !== 'undefined' && Challenge.isActive()) {
            Challenge.updateTimer(dt);
            var timeLimit = Challenge.getTimeLimit();
            if (timeLimit && Challenge.getElapsedTime() >= timeLimit) {
                gameOver();
                return;
            }
            if (timeLimit && typeof Display !== 'undefined' && Display.updateChallengeTimer) {
                Display.updateChallengeTimer(Challenge.getElapsedTime(), timeLimit);
            }
        }

        // Update combo timer
        if (comboCount > 0) {
            comboTimer -= dt;
            if (comboTimer <= 0) {
                // Combo ended - award bonus if it was significant
                if (comboCount >= COMBO_MIN_FOR_BONUS) {
                    var endBonus = comboCount * 5;
                    addGold(endBonus);
                    Sfx.play('goldPickup');
                }
                comboCount = 0;
                Display.hideCombo();
            }
        }

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
     * Return to main menu with full state cleanup
     */
    function returnToMenu() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        Enemy.clear();
        Tower.clear();
        Projectile.clear();
        Path.init();
        Path.render();
        Wave.init();
        if (typeof Pool !== 'undefined') Pool.clear();

        // End challenge if active
        if (typeof Challenge !== 'undefined' && Challenge.isActive()) Challenge.end();
        var timer = document.getElementById('challengeTimer');
        if (timer) timer.remove();
        var banner = document.querySelector('.challenge-banner');
        if (banner) banner.remove();

        // Reset game variables
        gold = 100;
        lives = 20;
        score = 0;
        selectedTowerType = null;
        totalEnemiesKilled = 0;
        totalTowersBuilt = 0;
        totalGoldEarned = 0;
        comboCount = 0;

        // UI transitions
        Display.hideGameUI();
        Display.hideGameOverScreen();
        Display.showStartScreen();

        state = STATES.MENU;
        Sfx.stopMusic();
        Sfx.playMusic('menu');
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

        // Update high score (local session only, server is source of truth)
        if (score > highScore) {
            highScore = score;
        }

        // Submit to backend
        var durationSeconds = Math.floor((performance.now() - gameStartTime) / 1000);
        var gameData = {
            score: score,
            difficulty: difficulty,
            waveReached: Wave.getCurrentWave(),
            towersBuilt: totalTowersBuilt,
            enemiesKilled: totalEnemiesKilled,
            durationSeconds: durationSeconds,
            goldEarned: totalGoldEarned,
            outcome: 'defeat'
        };
        if (typeof API !== 'undefined') {
            API.submitScore(gameData).then(function(result) {
                if (result && result.success) {
                    if (result.pending) {
                        // Score saved but needs email verification
                        console.log('[Leaderboard] Score pending - awaiting email verification');
                        showVerificationPrompt();
                    } else {
                        console.log('[Leaderboard] Score submitted successfully');
                        if (typeof Display !== 'undefined' && Display.showToast) {
                            Display.showToast('Score submitted!', 'success');
                        }
                        // Fetch rank after successful submission
                        if (API.getMyRank) {
                            API.getMyRank(difficulty).then(function(data) {
                                if (data && data.rank) {
                                    var goRank = document.getElementById('goRank');
                                    if (goRank) goRank.textContent = '#' + data.rank;
                                }
                            });
                        }
                    }
                } else if (result === null && typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
                    console.warn('[Leaderboard] Submission failed silently');
                    if (typeof Display !== 'undefined' && Display.showToast) {
                        Display.showToast('Score submission failed', 'error');
                    }
                }
            });
            API.recordGame(gameData);
        }

        // Submit challenge if active
        if (typeof Challenge !== 'undefined' && Challenge.isActive()) {
            var challengeScore = Math.floor(score * Challenge.getScoreBonus());
            if (typeof API !== 'undefined' && API.completeDailyChallenge) {
                API.completeDailyChallenge({
                    score: challengeScore,
                    durationSeconds: durationSeconds,
                    metadata: { outcome: 'defeat', waveReached: Wave.getCurrentWave() }
                });
            }
            Challenge.end();
        }

        Display.showGameOverScreen(false, score, {
            waveReached: Wave.getCurrentWave(),
            enemiesKilled: totalEnemiesKilled,
            towersBuilt: totalTowersBuilt,
            goldEarned: totalGoldEarned,
            durationSeconds: durationSeconds
        });
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

        // Update high score (local session only, server is source of truth)
        if (score > highScore) {
            highScore = score;
        }

        // Submit to backend
        var durationSeconds = Math.floor((performance.now() - gameStartTime) / 1000);
        var gameData = {
            score: score,
            difficulty: difficulty,
            waveReached: Wave.getCurrentWave(),
            towersBuilt: totalTowersBuilt,
            enemiesKilled: totalEnemiesKilled,
            durationSeconds: durationSeconds,
            goldEarned: totalGoldEarned,
            outcome: 'victory'
        };
        if (typeof API !== 'undefined') {
            API.submitScore(gameData).then(function(result) {
                if (result && result.success) {
                    if (result.pending) {
                        // Score saved but needs email verification
                        console.log('[Leaderboard] Score pending - awaiting email verification');
                        showVerificationPrompt();
                    } else {
                        console.log('[Leaderboard] Score submitted successfully');
                        if (typeof Display !== 'undefined' && Display.showToast) {
                            Display.showToast('Score submitted!', 'success');
                        }
                        // Fetch rank after successful submission
                        if (API.getMyRank) {
                            API.getMyRank(difficulty).then(function(data) {
                                if (data && data.rank) {
                                    var goRank = document.getElementById('goRank');
                                    if (goRank) goRank.textContent = '#' + data.rank;
                                }
                            });
                        }
                    }
                } else if (result === null && typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
                    console.warn('[Leaderboard] Submission failed silently');
                    if (typeof Display !== 'undefined' && Display.showToast) {
                        Display.showToast('Score submission failed', 'error');
                    }
                }
            });
            API.recordGame(gameData);
        }

        // Submit challenge if active
        if (typeof Challenge !== 'undefined' && Challenge.isActive()) {
            var challengeScore = Math.floor(score * Challenge.getScoreBonus());
            if (typeof API !== 'undefined' && API.completeDailyChallenge) {
                API.completeDailyChallenge({
                    score: challengeScore,
                    durationSeconds: durationSeconds,
                    metadata: { outcome: 'victory', waveReached: Wave.getCurrentWave() }
                });
            }
            Challenge.end();
        }

        Display.showGameOverScreen(true, score, {
            waveReached: Wave.getCurrentWave(),
            enemiesKilled: totalEnemiesKilled,
            towersBuilt: totalTowersBuilt,
            goldEarned: totalGoldEarned,
            durationSeconds: durationSeconds
        });
        Sfx.play('victory');
        Sfx.playMusic('victory');
    }

    /**
     * Add gold
     */
    function addGold(amount) {
        gold += amount;
        Display.updateGold(gold);

        // Check gold achievements
        if (typeof Achievements !== 'undefined') {
            Achievements.checkGoldAchievements(gold);
        }
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
        // Apply crafting shield
        if (typeof Crafting !== 'undefined' && Crafting.absorbDamage) {
            amount = Crafting.absorbDamage(amount);
        }
        if (amount <= 0) return;
        lives -= amount;
        if (lives < 0) lives = 0;
        Display.updateLives(lives);
    }

    /**
     * Add lives (for repair events)
     */
    function addLives(amount) {
        lives += amount;
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

        // Challenge: tower type restriction
        if (typeof Challenge !== 'undefined' && Challenge.isActive() && !Challenge.isTowerAllowed(selectedTowerType)) {
            Display.showMessage('Tower not allowed in this challenge!');
            Sfx.play('error');
            selectTowerType(null);
            return false;
        }

        // Challenge: tower count limit
        if (typeof Challenge !== 'undefined' && Challenge.isActive()) {
            var maxTowers = Challenge.getMaxTowers();
            if (Tower.getAll().length >= maxTowers) {
                Display.showMessage('Tower limit reached! (max ' + maxTowers + ')');
                Sfx.play('error');
                selectTowerType(null);
                return false;
            }
        }

        // Check if can afford
        if (gold < config.cost) {
            Display.showMessage('Not enough gold!');
            Sfx.play('error');
            selectTowerType(null);  // Clear selection so player isn't stuck
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
        if (state !== STATES.PLAYING) {
            Display.showMessage('Game not active!');
            return false;
        }
        if (Wave.isWaveInProgress()) {
            Display.showMessage('Clear current wave first!');
            return false;
        }

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

    /**
     * Set game difficulty
     */
    function setDifficulty(diff) {
        if (DIFFICULTIES[diff]) {
            difficulty = diff;
        }
    }

    /**
     * Get current difficulty settings
     */
    function getDifficulty() {
        return DIFFICULTIES[difficulty];
    }

    /**
     * Get difficulty name
     */
    function getDifficultyName() {
        return DIFFICULTIES[difficulty].name;
    }

    /**
     * Get current game state data for saving
     */
    function getGameStateForSave() {
        return {
            difficulty: difficulty,
            gold: gold,
            lives: lives,
            score: score,
            currentWave: Wave.getCurrentWave(),
            towers: Tower.getAll ? Tower.getAll().map(function(t) {
                return { type: t.type, gridX: t.gridX, gridY: t.gridY };
            }) : [],
            inventory: typeof Inventory !== 'undefined' && Inventory.getState ? Inventory.getState() : {}
        };
    }

    /**
     * Load game from save data
     */
    function loadFromSave(saveData) {
        if (!saveData) return;

        // Set difficulty
        difficulty = saveData.difficulty || 'normal';

        // Reset and apply save
        Enemy.clear();
        Tower.clear();
        Projectile.clear();
        Path.init();
        Path.render();
        Wave.init();

        if (typeof Pool !== 'undefined') {
            Pool.clear();
        }

        gold = saveData.gold || 100;
        lives = saveData.lives || 20;
        score = saveData.score || 0;
        selectedTowerType = null;
        totalEnemiesKilled = 0;
        totalTowersBuilt = 0;
        totalGoldEarned = 0;
        gameStartTime = performance.now();

        // Restore towers
        if (saveData.towers && saveData.towers.length > 0) {
            saveData.towers.forEach(function(t) {
                Tower.create(t.type, t.gridX, t.gridY);
                totalTowersBuilt++;
            });
        }

        // Advance wave counter
        if (saveData.currentWave && saveData.currentWave > 1) {
            Wave.setCurrentWave(saveData.currentWave);
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
    }

    function getScore() { return score; }
    function getLives() { return lives; }

    // Public API
    return {
        init: init,
        start: start,
        pause: pause,
        resume: resume,
        returnToMenu: returnToMenu,
        selectTowerType: selectTowerType,
        placeTower: placeTower,
        startNextWave: startNextWave,
        getState: getState,
        getGold: getGold,
        getScore: getScore,
        getLives: getLives,
        getSelectedTowerType: getSelectedTowerType,
        canAfford: canAfford,
        addGold: addGold,
        spendGold: spendGold,
        addLives: addLives,
        setDifficulty: setDifficulty,
        getDifficulty: getDifficulty,
        getDifficultyName: getDifficultyName,
        getGameStateForSave: getGameStateForSave,
        loadFromSave: loadFromSave,
        STATES: STATES,
        DIFFICULTIES: DIFFICULTIES
    };
})();
