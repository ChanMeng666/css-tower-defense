/**
 * CSS Tower Defense - Perlin Noise System
 * Provides smooth noise functions for natural movement patterns
 */

/**
 * Simple 1D Perlin noise generator
 * Used for single-axis variations (e.g., speed fluctuations)
 */
function Simple1DNoise() {
    var MAX_VERTICES = 256;
    var MAX_VERTICES_MASK = MAX_VERTICES - 1;
    var amplitude = 1;
    var scale = 1;

    var r = [];

    // Initialize random values
    for (var i = 0; i < MAX_VERTICES; ++i) {
        r.push(Math.random());
    }

    /**
     * Linear interpolation
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} - Interpolated value
     */
    var lerp = function(a, b, t) {
        return a * (1 - t) + b * t;
    };

    /**
     * Get noise value at position x
     * @param {number} x - Position
     * @returns {number} - Noise value
     */
    var getVal = function(x) {
        var scaledX = x * scale;
        var xFloor = Math.floor(scaledX);
        var t = scaledX - xFloor;
        var tRemapSmoothstep = t * t * (3 - 2 * t);

        // Modulo using bitwise AND
        var xMin = xFloor & MAX_VERTICES_MASK;
        var xMax = (xMin + 1) & MAX_VERTICES_MASK;

        var y = lerp(r[xMin], r[xMax], tRemapSmoothstep);

        return y * amplitude;
    };

    // Return the API
    return {
        getVal: getVal,
        setAmplitude: function(newAmplitude) {
            amplitude = newAmplitude;
        },
        setScale: function(newScale) {
            scale = newScale;
        }
    };
}

/**
 * Simple 2D Perlin noise generator
 * Used for 2D path offsets (x, y movement variations)
 */
function Simple2DNoise() {
    var MAX_VERTICES = 256;
    var MAX_VERTICES_MASK = MAX_VERTICES - 1;
    var amplitude = 1;
    var scale = 1;

    // Initialize 2D grid of random values
    var r = [];
    for (var i = 0; i < MAX_VERTICES; i++) {
        r[i] = [];
        for (var j = 0; j < MAX_VERTICES; j++) {
            r[i][j] = Math.random();
        }
    }

    /**
     * Linear interpolation
     */
    var lerp = function(a, b, t) {
        return a * (1 - t) + b * t;
    };

    /**
     * Smoothstep interpolation
     */
    var smoothstep = function(t) {
        return t * t * (3 - 2 * t);
    };

    /**
     * Get noise value at position (x, y)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {number} - Noise value
     */
    var getVal = function(x, y) {
        var scaledX = x * scale;
        var scaledY = y * scale;

        var xFloor = Math.floor(scaledX);
        var yFloor = Math.floor(scaledY);

        var tx = smoothstep(scaledX - xFloor);
        var ty = smoothstep(scaledY - yFloor);

        // Get grid cell corners
        var x0 = xFloor & MAX_VERTICES_MASK;
        var x1 = (x0 + 1) & MAX_VERTICES_MASK;
        var y0 = yFloor & MAX_VERTICES_MASK;
        var y1 = (y0 + 1) & MAX_VERTICES_MASK;

        // Get random values at corners
        var c00 = r[x0][y0];
        var c10 = r[x1][y0];
        var c01 = r[x0][y1];
        var c11 = r[x1][y1];

        // Bilinear interpolation
        var nx0 = lerp(c00, c10, tx);
        var nx1 = lerp(c01, c11, tx);
        var value = lerp(nx0, nx1, ty);

        return (value - 0.5) * 2 * amplitude; // Center around 0
    };

    // Return the API
    return {
        getVal: getVal,
        setAmplitude: function(newAmplitude) {
            amplitude = newAmplitude;
        },
        setScale: function(newScale) {
            scale = newScale;
        }
    };
}

/**
 * Noise system for enemy movement
 * Provides pre-configured noise generators for different purposes
 */
var Noise = (function() {
    'use strict';

    // Shared noise instances for consistency
    var pathNoiseX = null;
    var pathNoiseY = null;
    var speedNoise = null;

    /**
     * Initialize noise generators
     */
    function init() {
        // Create noise generator for path X offset
        pathNoiseX = new Simple2DNoise();
        pathNoiseX.setAmplitude(15); // 15px max offset
        pathNoiseX.setScale(0.5);

        // Create noise generator for path Y offset
        pathNoiseY = new Simple2DNoise();
        pathNoiseY.setAmplitude(15); // 15px max offset
        pathNoiseY.setScale(0.5);

        // Create noise generator for speed variation
        speedNoise = new Simple1DNoise();
        speedNoise.setAmplitude(0.2); // 20% speed variation
        speedNoise.setScale(1);
    }

    /**
     * Get path offset for an entity at given position/time
     * @param {number} id - Entity unique ID (for variation)
     * @param {number} time - Current time/distance traveled
     * @returns {object} - {x, y} offset values
     */
    function getPathOffset(id, time) {
        if (!pathNoiseX || !pathNoiseY) {
            return { x: 0, y: 0 };
        }

        return {
            x: pathNoiseX.getVal(id * 0.1, time * 0.01),
            y: pathNoiseY.getVal(id * 0.1 + 100, time * 0.01)
        };
    }

    /**
     * Get speed multiplier for an entity
     * @param {number} id - Entity unique ID
     * @param {number} time - Current time
     * @returns {number} - Speed multiplier (0.8 - 1.2 range typically)
     */
    function getSpeedMultiplier(id, time) {
        if (!speedNoise) {
            return 1;
        }

        return 1 + speedNoise.getVal(id + time * 0.1);
    }

    /**
     * Create a new 1D noise instance with custom settings
     * @param {number} amplitude - Noise amplitude
     * @param {number} scale - Noise scale
     * @returns {object} - Noise instance
     */
    function create1D(amplitude, scale) {
        var noise = new Simple1DNoise();
        noise.setAmplitude(amplitude || 1);
        noise.setScale(scale || 1);
        return noise;
    }

    /**
     * Create a new 2D noise instance with custom settings
     * @param {number} amplitude - Noise amplitude
     * @param {number} scale - Noise scale
     * @returns {object} - Noise instance
     */
    function create2D(amplitude, scale) {
        var noise = new Simple2DNoise();
        noise.setAmplitude(amplitude || 1);
        noise.setScale(scale || 1);
        return noise;
    }

    // Public API
    return {
        init: init,
        getPathOffset: getPathOffset,
        getSpeedMultiplier: getSpeedMultiplier,
        create1D: create1D,
        create2D: create2D
    };
})();
