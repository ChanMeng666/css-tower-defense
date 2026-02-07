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
        LEVELS: PERFORMANCE_LEVELS
    };
})();
