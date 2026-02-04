/**
 * CSS Tower Defense - Object Pool System
 * Reduces GC pressure by reusing DOM elements and objects
 */

var Pool = (function() {
    'use strict';

    // Pool storage by type
    var pools = {};

    // Pool configurations
    var POOL_CONFIG = {
        enemy: {
            initialSize: 50,
            maxSize: 100,
            createElement: createEnemyElement
        },
        projectile: {
            initialSize: 100,
            maxSize: 200,
            createElement: createProjectileElement
        },
        impact: {
            initialSize: 50,
            maxSize: 100,
            createElement: createImpactElement
        },
        particle: {
            initialSize: 100,
            maxSize: 200,
            createElement: createParticleElement
        }
    };

    /**
     * Initialize all pools
     */
    function init() {
        for (var type in POOL_CONFIG) {
            if (POOL_CONFIG.hasOwnProperty(type)) {
                initPool(type, POOL_CONFIG[type]);
            }
        }
    }

    /**
     * Initialize a single pool
     * @param {string} type - Pool type name
     * @param {object} config - Pool configuration
     */
    function initPool(type, config) {
        pools[type] = {
            available: [],
            inUse: [],
            config: config,
            stats: {
                created: 0,
                acquired: 0,
                released: 0,
                maxInUse: 0
            }
        };

        // Pre-allocate initial elements
        for (var i = 0; i < config.initialSize; i++) {
            var element = config.createElement();
            element.dataset.poolType = type;
            element.style.display = 'none';
            pools[type].available.push(element);
            pools[type].stats.created++;
        }
    }

    /**
     * Acquire an element from the pool
     * @param {string} type - Pool type
     * @param {string} subType - Optional subtype for element class customization
     * @returns {HTMLElement} - DOM element from pool
     */
    function acquire(type, subType) {
        var pool = pools[type];
        if (!pool) {
            console.warn('Pool type not found:', type);
            return null;
        }

        var element;

        if (pool.available.length > 0) {
            // Reuse existing element
            element = pool.available.pop();
        } else if (pool.inUse.length < pool.config.maxSize) {
            // Create new element (pool not at max)
            element = pool.config.createElement();
            element.dataset.poolType = type;
            pool.stats.created++;
        } else {
            // Pool exhausted, create temporary element
            console.warn('Pool exhausted for type:', type);
            element = pool.config.createElement();
            element.dataset.poolType = type;
            element.dataset.poolTemp = 'true';
        }

        // Reset element state
        resetElement(element, type, subType);
        element.style.display = '';

        // Track usage
        pool.inUse.push(element);
        pool.stats.acquired++;
        pool.stats.maxInUse = Math.max(pool.stats.maxInUse, pool.inUse.length);

        return element;
    }

    /**
     * Release an element back to the pool
     * @param {HTMLElement} element - Element to release
     */
    function release(element) {
        if (!element) return;

        var type = element.dataset.poolType;
        var pool = pools[type];

        if (!pool) {
            // Element wasn't from a pool, just remove it
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            return;
        }

        // Remove from inUse array
        var index = pool.inUse.indexOf(element);
        if (index > -1) {
            pool.inUse.splice(index, 1);
        }

        // Hide element
        element.style.display = 'none';

        // If temporary (overflow) element, just discard
        if (element.dataset.poolTemp === 'true') {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            return;
        }

        // Return to available pool
        pool.available.push(element);
        pool.stats.released++;
    }

    /**
     * Reset element to default state
     * @param {HTMLElement} element - Element to reset
     * @param {string} type - Pool type
     * @param {string} subType - Optional subtype
     */
    function resetElement(element, type, subType) {
        // Clear inline styles except display
        element.style.cssText = '';

        // Remove all classes and restore base class
        element.className = getBaseClass(type);

        // Add subtype class if provided
        if (subType) {
            element.className += ' ' + subType;
        }

        // Clear innerHTML for types that need it
        if (type === 'impact' || type === 'particle') {
            element.innerHTML = '';
        }

        // Remove custom data attributes (except pool ones)
        var attrs = element.dataset;
        for (var key in attrs) {
            if (key !== 'poolType' && key !== 'poolTemp') {
                delete element.dataset[key];
            }
        }
    }

    /**
     * Get base CSS class for pool type
     * @param {string} type - Pool type
     * @returns {string} - Base CSS class
     */
    function getBaseClass(type) {
        switch (type) {
            case 'enemy': return 'enemy';
            case 'projectile': return 'projectile';
            case 'impact': return 'impact';
            case 'particle': return 'death-particles';
            default: return '';
        }
    }

    /**
     * Create base enemy element
     */
    function createEnemyElement() {
        var el = document.createElement('div');
        el.className = 'enemy';
        return el;
    }

    /**
     * Create base projectile element
     */
    function createProjectileElement() {
        var el = document.createElement('div');
        el.className = 'projectile';
        return el;
    }

    /**
     * Create base impact element
     */
    function createImpactElement() {
        var el = document.createElement('div');
        el.className = 'impact';
        return el;
    }

    /**
     * Create base particle element
     */
    function createParticleElement() {
        var el = document.createElement('div');
        el.className = 'death-particles';
        return el;
    }

    /**
     * Get pool statistics
     * @param {string} type - Pool type (optional, returns all if not provided)
     * @returns {object} - Pool statistics
     */
    function getStats(type) {
        if (type) {
            var pool = pools[type];
            if (!pool) return null;
            return {
                available: pool.available.length,
                inUse: pool.inUse.length,
                created: pool.stats.created,
                acquired: pool.stats.acquired,
                released: pool.stats.released,
                maxInUse: pool.stats.maxInUse
            };
        }

        // Return all stats
        var allStats = {};
        for (var t in pools) {
            if (pools.hasOwnProperty(t)) {
                allStats[t] = getStats(t);
            }
        }
        return allStats;
    }

    /**
     * Clear all pools and return elements
     */
    function clear() {
        for (var type in pools) {
            if (pools.hasOwnProperty(type)) {
                var pool = pools[type];

                // Release all in-use elements
                while (pool.inUse.length > 0) {
                    var element = pool.inUse.pop();
                    element.style.display = 'none';
                    pool.available.push(element);
                }
            }
        }
    }

    /**
     * Destroy all pools (for cleanup)
     */
    function destroy() {
        for (var type in pools) {
            if (pools.hasOwnProperty(type)) {
                var pool = pools[type];

                // Remove all elements from DOM
                pool.available.concat(pool.inUse).forEach(function(element) {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                });

                pool.available = [];
                pool.inUse = [];
            }
        }
    }

    /**
     * Prewarm a pool by creating elements
     * @param {string} type - Pool type
     * @param {number} count - Number of elements to create
     */
    function prewarm(type, count) {
        var pool = pools[type];
        if (!pool) return;

        var toCreate = Math.min(count, pool.config.maxSize - pool.available.length - pool.inUse.length);

        for (var i = 0; i < toCreate; i++) {
            var element = pool.config.createElement();
            element.dataset.poolType = type;
            element.style.display = 'none';
            pool.available.push(element);
            pool.stats.created++;
        }
    }

    // Public API
    return {
        init: init,
        acquire: acquire,
        release: release,
        getStats: getStats,
        clear: clear,
        destroy: destroy,
        prewarm: prewarm
    };
})();
