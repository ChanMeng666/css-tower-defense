/**
 * CSS Tower Defense - Effects Manager
 * Handles performance detection, effect toggles, and accessibility
 */

var Effects = (function() {
    'use strict';

    // Performance levels
    var PERFORMANCE_LEVELS = {
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low'
    };

    // Current state
    var performanceLevel = PERFORMANCE_LEVELS.HIGH;
    var reducedMotion = false;
    var effectsEnabled = true;

    // Performance thresholds
    var FPS_HIGH_THRESHOLD = 55;
    var FPS_LOW_THRESHOLD = 30;
    var SAMPLE_FRAMES = 60;

    // FPS monitoring
    var frameTimes = [];
    var lastFrameTime = 0;
    var monitoringActive = false;

    /**
     * Initialize the effects manager
     */
    function init() {
        // Check for reduced motion preference
        checkReducedMotion();

        // Listen for preference changes
        if (window.matchMedia) {
            var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            motionQuery.addEventListener('change', function() {
                checkReducedMotion();
            });
        }

        // Start performance monitoring after a short delay
        setTimeout(function() {
            startPerformanceMonitoring();
        }, 2000);

        // Apply initial state
        applyPerformanceLevel();

        console.log('Effects Manager initialized');
    }

    /**
     * Check for reduced motion preference
     */
    function checkReducedMotion() {
        if (window.matchMedia) {
            reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }

        if (reducedMotion) {
            console.log('Reduced motion preference detected');
            document.body.classList.add('prefers-reduced-motion');
        } else {
            document.body.classList.remove('prefers-reduced-motion');
        }
    }

    /**
     * Start FPS monitoring for performance detection
     */
    function startPerformanceMonitoring() {
        if (monitoringActive) return;
        monitoringActive = true;

        lastFrameTime = performance.now();
        frameTimes = [];

        requestAnimationFrame(monitorFrame);
    }

    /**
     * Monitor frame for FPS calculation
     */
    function monitorFrame(timestamp) {
        if (!monitoringActive) return;

        var delta = timestamp - lastFrameTime;
        lastFrameTime = timestamp;

        if (delta > 0) {
            frameTimes.push(delta);
        }

        // After collecting enough samples, calculate average FPS
        if (frameTimes.length >= SAMPLE_FRAMES) {
            calculatePerformanceLevel();
            frameTimes = [];

            // Continue monitoring but less frequently
            setTimeout(function() {
                if (monitoringActive) {
                    requestAnimationFrame(monitorFrame);
                }
            }, 5000);
        } else {
            requestAnimationFrame(monitorFrame);
        }
    }

    /**
     * Calculate performance level based on FPS samples
     */
    function calculatePerformanceLevel() {
        if (frameTimes.length === 0) return;

        var avgFrameTime = frameTimes.reduce(function(a, b) { return a + b; }, 0) / frameTimes.length;
        var avgFPS = 1000 / avgFrameTime;

        var previousLevel = performanceLevel;

        if (avgFPS >= FPS_HIGH_THRESHOLD) {
            performanceLevel = PERFORMANCE_LEVELS.HIGH;
        } else if (avgFPS >= FPS_LOW_THRESHOLD) {
            performanceLevel = PERFORMANCE_LEVELS.MEDIUM;
        } else {
            performanceLevel = PERFORMANCE_LEVELS.LOW;
        }

        // Only update if level changed
        if (performanceLevel !== previousLevel) {
            console.log('Performance level changed to: ' + performanceLevel + ' (FPS: ' + avgFPS.toFixed(1) + ')');
            applyPerformanceLevel();
        }
    }

    /**
     * Apply performance level to DOM
     */
    function applyPerformanceLevel() {
        var body = document.body;

        // Remove all performance classes
        body.classList.remove('performance-high', 'performance-medium', 'performance-low');

        // Add current level class
        body.classList.add('performance-' + performanceLevel);

        // Dispatch event for other systems
        var event = new CustomEvent('performanceLevelChanged', {
            detail: {
                level: performanceLevel,
                effectsEnabled: effectsEnabled && !reducedMotion
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Enable or disable effects globally
     */
    function setEffectsEnabled(enabled) {
        effectsEnabled = enabled;

        if (!enabled) {
            document.body.classList.add('effects-disabled');
        } else {
            document.body.classList.remove('effects-disabled');
        }

        applyPerformanceLevel();
    }

    /**
     * Force a specific performance level (for testing/settings)
     */
    function setPerformanceLevel(level) {
        if (PERFORMANCE_LEVELS[level.toUpperCase()]) {
            performanceLevel = PERFORMANCE_LEVELS[level.toUpperCase()];
            applyPerformanceLevel();
        }
    }

    /**
     * Stop performance monitoring
     */
    function stopMonitoring() {
        monitoringActive = false;
    }

    /**
     * Get current performance level
     */
    function getPerformanceLevel() {
        return performanceLevel;
    }

    /**
     * Check if effects should be shown
     */
    function shouldShowEffects() {
        return effectsEnabled && !reducedMotion && performanceLevel !== PERFORMANCE_LEVELS.LOW;
    }

    /**
     * Check if complex effects should be shown
     */
    function shouldShowComplexEffects() {
        return effectsEnabled && !reducedMotion && performanceLevel === PERFORMANCE_LEVELS.HIGH;
    }

    /**
     * Create a screen flash effect
     * @param {string} type - 'damage', 'gold', or 'heal'
     */
    function screenFlash(type) {
        if (!shouldShowEffects()) return;

        var flash = document.querySelector('.screen-flash');
        if (!flash) {
            flash = document.createElement('div');
            flash.className = 'screen-flash';
            document.body.appendChild(flash);
        }

        // Remove any existing flash classes
        flash.classList.remove('flash-damage', 'flash-gold', 'flash-heal');

        // Force reflow to restart animation
        void flash.offsetWidth;

        // Add new flash class
        flash.classList.add('flash-' + type);

        // Remove class after animation
        setTimeout(function() {
            flash.classList.remove('flash-' + type);
        }, 300);
    }

    /**
     * Apply burning effect to an enemy element
     */
    function applyBurningEffect(element) {
        if (!shouldShowEffects()) return;

        element.classList.add('burning');
    }

    /**
     * Remove burning effect from an enemy element
     */
    function removeBurningEffect(element) {
        element.classList.remove('burning');
    }

    /**
     * Trigger starfield warp effect (level complete)
     */
    function triggerWarpEffect() {
        if (!shouldShowComplexEffects()) return;

        var warp = document.createElement('div');
        warp.className = 'starfield-warp';
        document.body.appendChild(warp);

        // Remove after animation
        setTimeout(function() {
            if (warp.parentNode) {
                warp.parentNode.removeChild(warp);
            }
        }, 600);
    }

    /**
     * Combo milestone effect — screen flash + floating text at 5/10/15/20+ kills
     * @param {number} comboCount - current combo count
     */
    function comboMilestone(comboCount) {
        if (!shouldShowEffects()) return;

        // Determine milestone tier
        var tier = '';
        if (comboCount >= 20) tier = 'legendary';
        else if (comboCount >= 15) tier = 'epic';
        else if (comboCount >= 10) tier = 'great';
        else if (comboCount >= 5) tier = 'nice';
        else return; // Not a milestone

        // Screen flash
        screenFlash('combo');

        // Floating milestone text
        var text = document.createElement('div');
        text.className = 'combo-milestone combo-' + tier;
        text.textContent = comboCount + 'x COMBO!';
        document.body.appendChild(text);

        setTimeout(function() {
            if (text.parentNode) {
                text.parentNode.removeChild(text);
            }
        }, 1500);
    }

    /**
     * Boss phase change red pulse — screen edge pulsing red glow
     */
    function bossPhaseRedPulse() {
        if (!shouldShowEffects()) return;

        var pulse = document.querySelector('.boss-rage-pulse');
        if (!pulse) {
            pulse = document.createElement('div');
            pulse.className = 'boss-rage-pulse';
            document.body.appendChild(pulse);
        }

        pulse.classList.add('active');

        setTimeout(function() {
            pulse.classList.remove('active');
        }, 3000);
    }

    /**
     * Show floating damage number at a position
     * @param {number} x - Map-local X position
     * @param {number} y - Map-local Y position
     * @param {number} amount - Damage amount to display
     * @param {string} type - 'normal', 'boss', or 'crit'
     */
    function showDamageNumber(x, y, amount, type) {
        if (!shouldShowEffects()) return;

        var mapEl = document.getElementById('map');
        if (!mapEl) return;

        type = type || 'normal';

        var el;
        if (typeof Pool !== 'undefined') {
            el = Pool.acquire('damageNumber', 'dmg-' + type);
        } else {
            el = document.createElement('div');
            el.className = 'damage-number dmg-' + type;
        }

        el.textContent = Math.round(amount);

        // Small random horizontal offset to prevent stacking
        var offsetX = (Math.random() - 0.5) * 20;
        el.style.left = (x + offsetX) + 'px';
        el.style.top = y + 'px';

        mapEl.appendChild(el);

        // Remove after animation
        setTimeout(function() {
            if (typeof Pool !== 'undefined' && el.dataset.poolType) {
                Pool.release(el);
            } else if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, 800);
    }

    /**
     * Create directional death burst particles
     * @param {number} x - Map-local X position
     * @param {number} y - Map-local Y position
     * @param {string} enemyType - Enemy type for color matching
     * @param {number} count - Number of particles (optional)
     */
    function createDeathBurst(x, y, enemyType, count) {
        if (!shouldShowEffects()) return;

        var mapEl = document.getElementById('map');
        if (!mapEl) return;

        // Determine particle count based on performance and enemy type
        if (!count) {
            if (enemyType === 'boss' || enemyType === 'taniwha') {
                count = 16;
            } else {
                count = 8;
            }
        }

        // Reduce on medium performance
        if (performanceLevel === PERFORMANCE_LEVELS.MEDIUM) {
            count = Math.max(2, Math.floor(count / 2));
        }

        for (var i = 0; i < count; i++) {
            var particle;
            if (typeof Pool !== 'undefined') {
                particle = Pool.acquire('particle', 'death-burst burst-' + enemyType);
            } else {
                particle = document.createElement('div');
                particle.className = 'death-particles death-burst burst-' + enemyType;
            }

            // Calculate direction for this particle (evenly distributed + some randomness)
            var angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            var distance = 20 + Math.random() * 30;
            var burstX = Math.cos(angle) * distance;
            var burstY = Math.sin(angle) * distance;

            particle.style.cssText = '';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.setProperty('--burst-x', burstX + 'px');
            particle.style.setProperty('--burst-y', burstY + 'px');

            mapEl.appendChild(particle);

            // Remove after animation
            (function(p) {
                setTimeout(function() {
                    if (typeof Pool !== 'undefined' && p.dataset.poolType) {
                        Pool.release(p);
                    } else if (p.parentNode) {
                        p.parentNode.removeChild(p);
                    }
                }, 600);
            })(particle);
        }
    }

    /**
     * Camera shake effect on the outer game container
     * @param {number} intensity - Shake intensity (1-3)
     */
    function cameraShake(intensity) {
        if (!shouldShowEffects()) return;

        var gameArea = document.getElementById('gameArea') || document.body;
        intensity = intensity || 1;

        var shakeClass = intensity >= 2 ? 'shake-heavy' : 'shake-light';
        var duration = intensity >= 2 ? 400 : 250;

        gameArea.classList.add(shakeClass);

        setTimeout(function() {
            gameArea.classList.remove(shakeClass);
        }, duration);
    }

    /**
     * Synergy activation flash between two towers
     * @param {object} tower1 - first tower {x, y}
     * @param {object} tower2 - second tower {x, y}
     */
    function synergyFlash(tower1, tower2) {
        if (!shouldShowComplexEffects()) return;

        var mapEl = document.getElementById('map');
        if (!mapEl) return;

        var mapWidth = Path.GRID_COLS * Path.CELL_SIZE;
        var mapHeight = Path.GRID_ROWS * Path.CELL_SIZE;

        // Convert world coords to map-local
        var x1 = tower1.x + (mapWidth / 2);
        var y1 = tower1.y + (mapHeight / 2);
        var x2 = tower2.x + (mapWidth / 2);
        var y2 = tower2.y + (mapHeight / 2);

        var dx = x2 - x1;
        var dy = y2 - y1;
        var length = Math.sqrt(dx * dx + dy * dy);
        var angle = Math.atan2(dy, dx) * (180 / Math.PI);

        var line = document.createElement('div');
        line.className = 'synergy-flash-line';
        line.style.left = x1 + 'px';
        line.style.top = y1 + 'px';
        line.style.width = length + 'px';
        line.style.transform = 'rotate(' + angle + 'deg)';
        mapEl.appendChild(line);

        setTimeout(function() {
            if (line.parentNode) {
                line.parentNode.removeChild(line);
            }
        }, 600);
    }

    /**
     * Boss kill dramatic sequence - slowmo + zoom + flash
     */
    function bossKillSequence() {
        if (!shouldShowEffects()) return;

        document.body.classList.add('boss-kill-slowmo');
        var gameArea = document.getElementById('gameArea');
        if (gameArea) {
            gameArea.classList.add('boss-kill-zoom');
        }

        screenFlash('gold');

        setTimeout(function() {
            document.body.classList.remove('boss-kill-slowmo');
            if (gameArea) {
                gameArea.classList.remove('boss-kill-zoom');
            }
        }, 1500);
    }

    /**
     * Perfect wave celebration - golden confetti particles
     */
    function perfectWaveCelebration() {
        if (!shouldShowComplexEffects()) return;

        for (var i = 0; i < 12; i++) {
            (function(index) {
                setTimeout(function() {
                    var particle = document.createElement('div');
                    particle.className = 'perfect-particle';
                    particle.style.left = (Math.random() * 100) + 'vw';
                    particle.style.top = '0px';
                    document.body.appendChild(particle);

                    setTimeout(function() {
                        if (particle.parentNode) {
                            particle.parentNode.removeChild(particle);
                        }
                    }, 1500);
                }, index * 100);
            })(i);
        }
    }

    // Public API
    return {
        init: init,
        setEffectsEnabled: setEffectsEnabled,
        setPerformanceLevel: setPerformanceLevel,
        getPerformanceLevel: getPerformanceLevel,
        stopMonitoring: stopMonitoring,
        shouldShowEffects: shouldShowEffects,
        shouldShowComplexEffects: shouldShowComplexEffects,
        screenFlash: screenFlash,
        applyBurningEffect: applyBurningEffect,
        removeBurningEffect: removeBurningEffect,
        triggerWarpEffect: triggerWarpEffect,
        comboMilestone: comboMilestone,
        bossPhaseRedPulse: bossPhaseRedPulse,
        synergyFlash: synergyFlash,
        showDamageNumber: showDamageNumber,
        createDeathBurst: createDeathBurst,
        cameraShake: cameraShake,
        bossKillSequence: bossKillSequence,
        perfectWaveCelebration: perfectWaveCelebration,
        LEVELS: PERFORMANCE_LEVELS
    };
})();
