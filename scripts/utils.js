/**
 * CSS Tower Defense - Utility Functions
 * Provides throttle, debounce, lerp, distance and other helper functions
 */

var Utils = (function() {
    'use strict';

    // Store for throttle timers (keyed)
    var throttleTimers = {};

    /**
     * Throttle a function call by key
     * Ensures the function is called at most once per delay period
     * @param {string} key - Unique key for this throttle
     * @param {Function} fn - Function to throttle
     * @param {number} delay - Minimum time between calls in ms
     * @returns {boolean} - Whether the function was executed
     */
    function throttle(key, fn, delay) {
        var now = performance.now();
        var lastTime = throttleTimers[key] || 0;

        if (now - lastTime >= delay) {
            throttleTimers[key] = now;
            fn();
            return true;
        }
        return false;
    }

    /**
     * Create a debounced version of a function
     * The function will only be called after delay ms have passed without another call
     * @param {Function} fn - Function to debounce
     * @param {number} delay - Delay in ms
     * @returns {Function} - Debounced function
     */
    function debounce(fn, delay) {
        var timeoutId = null;

        return function() {
            var context = this;
            var args = arguments;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(function() {
                fn.apply(context, args);
                timeoutId = null;
            }, delay);
        };
    }

    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} - Interpolated value
     */
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Calculate distance between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} - Distance
     */
    function distance(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate squared distance between two points (faster, no sqrt)
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} - Squared distance
     */
    function distanceSquared(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return dx * dx + dy * dy;
    }

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Clamped value
     */
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Map a value from one range to another
     * @param {number} value - Value to map
     * @param {number} inMin - Input range minimum
     * @param {number} inMax - Input range maximum
     * @param {number} outMin - Output range minimum
     * @param {number} outMax - Output range maximum
     * @returns {number} - Mapped value
     */
    function map(value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
    }

    /**
     * Get a random number between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Random value
     */
    function randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    /**
     * Get a random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Random integer
     */
    function randomInt(min, max) {
        return Math.floor(min + Math.random() * (max - min + 1));
    }

    /**
     * Normalize an angle to 0-360 degrees
     * @param {number} angle - Angle in degrees
     * @returns {number} - Normalized angle
     */
    function normalizeAngle(angle) {
        angle = angle % 360;
        if (angle < 0) angle += 360;
        return angle;
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} - Angle in radians
     */
    function degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Convert radians to degrees
     * @param {number} radians - Angle in radians
     * @returns {number} - Angle in degrees
     */
    function radToDeg(radians) {
        return radians * (180 / Math.PI);
    }

    /**
     * Smooth step interpolation (ease in/out)
     * @param {number} t - Input value (0-1)
     * @returns {number} - Smoothed value
     */
    function smoothStep(t) {
        return t * t * (3 - 2 * t);
    }

    /**
     * Reset all throttle timers (for game restart)
     */
    function resetThrottles() {
        throttleTimers = {};
    }

    // Public API
    return {
        throttle: throttle,
        debounce: debounce,
        lerp: lerp,
        distance: distance,
        distanceSquared: distanceSquared,
        clamp: clamp,
        map: map,
        randomRange: randomRange,
        randomInt: randomInt,
        normalizeAngle: normalizeAngle,
        degToRad: degToRad,
        radToDeg: radToDeg,
        smoothStep: smoothStep,
        resetThrottles: resetThrottles
    };
})();
