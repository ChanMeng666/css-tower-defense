/**
 * CSS Tower Defense - Wave Management System
 * Manages enemy waves, spawning, and progression
 */

var Wave = (function() {
    'use strict';
    
    // Wave definitions
    var waveData = [
        // Wave 1 - Tutorial wave
        {
            enemies: [
                { type: 'slime', count: 5, interval: 1500 }
            ],
            reward: 25
        },
        // Wave 2
        {
            enemies: [
                { type: 'slime', count: 8, interval: 1200 }
            ],
            reward: 30
        },
        // Wave 3 - Introduce goblins
        {
            enemies: [
                { type: 'slime', count: 5, interval: 1500 },
                { type: 'goblin', count: 3, interval: 2000 }
            ],
            reward: 40
        },
        // Wave 4
        {
            enemies: [
                { type: 'goblin', count: 6, interval: 1200 },
                { type: 'slime', count: 4, interval: 1000 }
            ],
            reward: 50
        },
        // Wave 5 - Introduce knights
        {
            enemies: [
                { type: 'slime', count: 8, interval: 1000 },
                { type: 'goblin', count: 5, interval: 1500 },
                { type: 'knight', count: 2, interval: 3000 }
            ],
            reward: 75
        },
        // Wave 6
        {
            enemies: [
                { type: 'goblin', count: 8, interval: 1000 },
                { type: 'knight', count: 4, interval: 2500 }
            ],
            reward: 80
        },
        // Wave 7
        {
            enemies: [
                { type: 'slime', count: 10, interval: 800 },
                { type: 'goblin', count: 6, interval: 1200 },
                { type: 'knight', count: 5, interval: 2000 }
            ],
            reward: 100
        },
        // Wave 8 - Heavy wave
        {
            enemies: [
                { type: 'knight', count: 8, interval: 1500 },
                { type: 'goblin', count: 10, interval: 1000 }
            ],
            reward: 120
        },
        // Wave 9 - Pre-boss
        {
            enemies: [
                { type: 'slime', count: 15, interval: 600 },
                { type: 'goblin', count: 10, interval: 800 },
                { type: 'knight', count: 6, interval: 1800 }
            ],
            reward: 150
        },
        // Wave 10 - Boss wave
        {
            enemies: [
                { type: 'knight', count: 4, interval: 2000 },
                { type: 'boss', count: 1, interval: 5000 }
            ],
            reward: 200
        }
    ];
    
    // Current state
    var currentWave = 0;
    var waveInProgress = false;
    var spawnQueue = [];
    var spawnTimer = 0;
    var totalEnemiesSpawned = 0;
    var totalEnemiesInWave = 0;
    
    /**
     * Initialize the wave system
     */
    function init() {
        currentWave = 0;
        waveInProgress = false;
        spawnQueue = [];
        spawnTimer = 0;
        totalEnemiesSpawned = 0;
        totalEnemiesInWave = 0;
    }
    
    /**
     * Start the next wave
     */
    function startWave() {
        if (waveInProgress) return false;
        if (currentWave >= waveData.length) return false;
        
        waveInProgress = true;
        var wave = waveData[currentWave];
        
        // Build spawn queue
        spawnQueue = [];
        totalEnemiesInWave = 0;
        totalEnemiesSpawned = 0;
        
        for (var i = 0; i < wave.enemies.length; i++) {
            var enemyGroup = wave.enemies[i];
            for (var j = 0; j < enemyGroup.count; j++) {
                spawnQueue.push({
                    type: enemyGroup.type,
                    delay: j * enemyGroup.interval + (i * 500) // Stagger groups
                });
                totalEnemiesInWave++;
            }
        }
        
        // Sort by delay
        spawnQueue.sort(function(a, b) {
            return a.delay - b.delay;
        });
        
        // Reset timer
        spawnTimer = 0;
        
        // Dispatch event
        var event = new CustomEvent('waveStarted', {
            detail: {
                wave: currentWave + 1,
                totalWaves: waveData.length
            }
        });
        document.dispatchEvent(event);
        
        return true;
    }
    
    /**
     * Update wave spawning
     */
    function update(dt) {
        if (!waveInProgress) return;
        
        spawnTimer += dt * 1000; // Convert to milliseconds
        
        // Spawn enemies whose delay has passed
        while (spawnQueue.length > 0 && spawnQueue[0].delay <= spawnTimer) {
            var spawn = spawnQueue.shift();
            Enemy.spawn(spawn.type);
            totalEnemiesSpawned++;
        }
        
        // Check if wave is complete
        if (spawnQueue.length === 0 && Enemy.count() === 0) {
            completeWave();
        }
    }
    
    /**
     * Complete the current wave
     */
    function completeWave() {
        if (!waveInProgress) return;
        
        waveInProgress = false;
        var wave = waveData[currentWave];
        
        // Dispatch event with reward
        var event = new CustomEvent('waveComplete', {
            detail: {
                wave: currentWave + 1,
                reward: wave.reward,
                isLastWave: currentWave >= waveData.length - 1
            }
        });
        document.dispatchEvent(event);
        
        // Advance to next wave
        currentWave++;
    }
    
    /**
     * Check if all waves are complete
     */
    function isGameComplete() {
        return currentWave >= waveData.length && !waveInProgress && Enemy.count() === 0;
    }
    
    /**
     * Get current wave number (1-indexed)
     */
    function getCurrentWave() {
        return currentWave + 1;
    }
    
    /**
     * Get total number of waves
     */
    function getTotalWaves() {
        return waveData.length;
    }
    
    /**
     * Check if wave is in progress
     */
    function isWaveInProgress() {
        return waveInProgress;
    }
    
    /**
     * Get wave progress (0-1)
     */
    function getProgress() {
        if (!waveInProgress) return 1;
        if (totalEnemiesInWave === 0) return 0;
        
        var spawned = totalEnemiesSpawned;
        var remaining = Enemy.count();
        var killed = spawned - remaining;
        
        return killed / totalEnemiesInWave;
    }
    
    /**
     * Get info about upcoming wave
     */
    function getNextWaveInfo() {
        if (currentWave >= waveData.length) return null;
        
        var wave = waveData[currentWave];
        var enemies = {};
        var total = 0;
        
        for (var i = 0; i < wave.enemies.length; i++) {
            var group = wave.enemies[i];
            enemies[group.type] = (enemies[group.type] || 0) + group.count;
            total += group.count;
        }
        
        return {
            wave: currentWave + 1,
            enemies: enemies,
            totalEnemies: total,
            reward: wave.reward
        };
    }
    
    // Public API
    return {
        init: init,
        startWave: startWave,
        update: update,
        isGameComplete: isGameComplete,
        getCurrentWave: getCurrentWave,
        getTotalWaves: getTotalWaves,
        isWaveInProgress: isWaveInProgress,
        getProgress: getProgress,
        getNextWaveInfo: getNextWaveInfo
    };
})();
