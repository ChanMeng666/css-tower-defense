/**
 * CSS Tower Defense - Wave Management System
 * Data-driven wave system with events, announcements, and special mechanics
 */

var Wave = (function() {
    'use strict';

    // Event types for wave system
    var EVENT_TYPES = {
        ANNOUNCEMENT: 'announcement',
        SPAWN: 'spawn',
        SPECIAL_EVENT: 'specialEvent',
        BOSS_SPAWN: 'bossSpawn',
        WARNING: 'warning',
        DELAY: 'delay'
    };

    // Wave definitions with event-based structure
    var waveData = [
        // Wave 1 - Tutorial wave
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'The slimes approach...' } },
                { time: 2000, type: 'spawn', data: [{ type: 'slime', count: 5, interval: 1500 }] }
            ],
            reward: 25
        },
        // Wave 2
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'More slimes incoming!' } },
                { time: 2000, type: 'spawn', data: [{ type: 'slime', count: 8, interval: 1200 }] }
            ],
            reward: 30
        },
        // Wave 3 - Introduce goblins
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 3', subtitle: 'Goblins join the fray!' } },
                { time: 2000, type: 'spawn', data: [
                    { type: 'slime', count: 5, interval: 1500 },
                    { type: 'goblin', count: 3, interval: 2000 }
                ] }
            ],
            reward: 40
        },
        // Wave 4
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 4', subtitle: 'Goblin raiders!' } },
                { time: 2000, type: 'spawn', data: [
                    { type: 'goblin', count: 6, interval: 1200 },
                    { type: 'slime', count: 4, interval: 1000 }
                ] }
            ],
            reward: 50
        },
        // Wave 5 - Introduce knights
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 5', subtitle: 'Armored knights approach!' } },
                { time: 1500, type: 'warning', data: { message: 'Knights have high armor!' } },
                { time: 3000, type: 'spawn', data: [
                    { type: 'slime', count: 8, interval: 1000 },
                    { type: 'goblin', count: 5, interval: 1500 },
                    { type: 'knight', count: 2, interval: 3000 }
                ] }
            ],
            reward: 75
        },
        // Wave 6 - Can trigger repair if low on lives
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 6', subtitle: 'The assault continues' } },
                { time: 2000, type: 'spawn', data: [
                    { type: 'goblin', count: 8, interval: 1000 },
                    { type: 'knight', count: 4, interval: 2500 }
                ] }
            ],
            reward: 80
        },
        // Wave 7 - Special event
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 7', subtitle: 'Gold rush!' } },
                { time: 1000, type: 'specialEvent', data: { type: 'goldRush', bonus: 50 } },
                { time: 2500, type: 'spawn', data: [
                    { type: 'slime', count: 10, interval: 800, variant: 'speedy' },
                    { type: 'goblin', count: 6, interval: 1200 },
                    { type: 'knight', count: 5, interval: 2000 }
                ] }
            ],
            reward: 100
        },
        // Wave 8 - Heavy wave
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 8', subtitle: 'Elite forces!' } },
                { time: 2000, type: 'spawn', data: [
                    { type: 'knight', count: 8, interval: 1500 },
                    { type: 'goblin', count: 10, interval: 1000, variant: 'elite' }
                ] }
            ],
            reward: 120
        },
        // Wave 9 - Pre-boss
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 9', subtitle: 'The horde approaches!' } },
                { time: 1500, type: 'warning', data: { message: 'Prepare for the boss!' } },
                { time: 3000, type: 'spawn', data: [
                    { type: 'slime', count: 15, interval: 600 },
                    { type: 'goblin', count: 10, interval: 800 },
                    { type: 'knight', count: 6, interval: 1800 }
                ] }
            ],
            reward: 150
        },
        // Wave 10 - Boss wave
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'The Dark Lord awakens!' } },
                { time: 2500, type: 'warning', data: { message: 'BOSS INCOMING!' } },
                { time: 4000, type: 'spawn', data: [
                    { type: 'knight', count: 4, interval: 2000 }
                ] },
                { time: 10000, type: 'bossSpawn', data: { type: 'boss' } }
            ],
            reward: 200
        }
    ];

    // Current state
    var currentWave = 0;
    var waveInProgress = false;
    var waveElapsedTime = 0;  // Accumulated elapsed time (not wall clock) - used for both events and spawning
    var eventIndex = 0;
    var spawnQueue = [];
    var totalEnemiesSpawned = 0;
    var totalEnemiesInWave = 0;

    /**
     * Initialize the wave system
     */
    function init() {
        currentWave = 0;
        waveInProgress = false;
        waveElapsedTime = 0;
        eventIndex = 0;
        spawnQueue = [];
        totalEnemiesSpawned = 0;
        totalEnemiesInWave = 0;

        // Initialize Noise system if available
        if (typeof Noise !== 'undefined') {
            Noise.init();
        }
    }

    /**
     * Start the next wave
     */
    function startWave() {
        if (waveInProgress) {
            if (typeof Display !== 'undefined') {
                Display.showMessage('Wave already in progress!');
            }
            return false;
        }
        if (currentWave >= waveData.length) {
            if (typeof Display !== 'undefined') {
                Display.showMessage('All waves complete!');
            }
            return false;
        }

        waveInProgress = true;
        waveElapsedTime = 0;  // Reset accumulated time
        eventIndex = 0;
        spawnQueue = [];
        totalEnemiesSpawned = 0;
        totalEnemiesInWave = calculateTotalEnemies(currentWave);

        // Roll for random events (Terraria-style)
        rollRandomEvents(currentWave + 1);

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
     * Calculate total enemies in a wave
     */
    function calculateTotalEnemies(waveIndex) {
        var wave = waveData[waveIndex];
        var total = 0;

        for (var i = 0; i < wave.events.length; i++) {
            var evt = wave.events[i];
            if (evt.type === 'spawn') {
                for (var j = 0; j < evt.data.length; j++) {
                    total += evt.data[j].count;
                }
            } else if (evt.type === 'bossSpawn') {
                total += 1;
            }
        }

        return total;
    }

    /**
     * Update wave spawning and events
     */
    function update(dt) {
        if (!waveInProgress) return;

        // Use accumulated elapsed time instead of wall clock time
        // This ensures pausing works correctly
        waveElapsedTime += dt * 1000;
        var wave = waveData[currentWave];

        // Process events that should trigger
        while (eventIndex < wave.events.length) {
            var evt = wave.events[eventIndex];
            if (evt.time <= waveElapsedTime) {
                processEvent(evt);
                eventIndex++;
            } else {
                break;
            }
        }

        // Process spawn queue using the same timing source as events
        while (spawnQueue.length > 0 && spawnQueue[0].spawnTime <= waveElapsedTime) {
            var spawn = spawnQueue.shift();
            Enemy.spawn(spawn.type, spawn.variant);
            totalEnemiesSpawned++;
        }

        // Check if wave is complete
        if (eventIndex >= wave.events.length && spawnQueue.length === 0 && Enemy.count() === 0) {
            completeWave();
        }
    }

    /**
     * Process a wave event
     */
    function processEvent(evt) {
        switch (evt.type) {
            case EVENT_TYPES.ANNOUNCEMENT:
                handleAnnouncement(evt.data);
                break;

            case EVENT_TYPES.SPAWN:
                handleSpawn(evt.data);
                break;

            case EVENT_TYPES.SPECIAL_EVENT:
                handleSpecialEvent(evt.data);
                break;

            case EVENT_TYPES.BOSS_SPAWN:
                handleBossSpawn(evt.data);
                break;

            case EVENT_TYPES.WARNING:
                handleWarning(evt.data);
                break;

            case EVENT_TYPES.DELAY:
                // Just a timing marker, no action needed
                break;
        }
    }

    /**
     * Handle announcement event
     */
    function handleAnnouncement(data) {
        // Use Display announcer if available
        if (typeof Display !== 'undefined' && Display.showAnnouncement) {
            Display.showAnnouncement(data.title, data.subtitle);
        }

        // Emit event for other systems
        if (typeof emitGameEvent === 'function') {
            emitGameEvent(EVENTS.WAVE_ANNOUNCEMENT, data);
        }
    }

    /**
     * Handle spawn event - add enemies to spawn queue
     * Uses waveElapsedTime as the base time for consistent timing
     */
    function handleSpawn(groups) {
        // Use waveElapsedTime as base - this is the same timer used for event processing
        var queueBaseTime = waveElapsedTime;

        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            for (var j = 0; j < group.count; j++) {
                spawnQueue.push({
                    type: group.type,
                    variant: group.variant || null,
                    // spawnTime is when this enemy should spawn (absolute time since wave start)
                    spawnTime: queueBaseTime + (j * group.interval) + (i * 500)
                });
            }
        }

        // Sort by spawn time
        spawnQueue.sort(function(a, b) {
            return a.spawnTime - b.spawnTime;
        });
    }

    // Random event state
    var activeEvent = null;
    var eventTimer = 0;

    /**
     * Handle special event (gold rush, etc.)
     */
    function handleSpecialEvent(data) {
        switch (data.type) {
            case 'goldRush':
                // Award bonus gold
                if (typeof Game !== 'undefined' && Game.addGold) {
                    Game.addGold(data.bonus);
                }
                if (typeof Display !== 'undefined') {
                    Display.showMessage('Gold Rush! +' + data.bonus + ' gold!');
                }
                break;

            case 'speedBoost':
                // Temporary tower fire rate boost
                activeEvent = { type: 'speedBoost', duration: 10 };
                eventTimer = 10;
                if (typeof Display !== 'undefined') {
                    Display.showAnnouncement('SPEED BOOST!', 'All towers fire 50% faster!');
                }
                break;

            case 'repair':
                // Restore lives
                if (typeof Game !== 'undefined') {
                    Game.addLives(5);
                }
                if (typeof Display !== 'undefined') {
                    Display.showMessage('Repair Drone! +5 lives!');
                }
                break;

            case 'bloodMoon':
                // Blood Moon - enemies stronger but more gold
                activeEvent = { type: 'bloodMoon' };
                if (typeof Display !== 'undefined') {
                    Display.showAnnouncement('BLOOD MOON!', 'Enemies +30% HP, +50% gold!');
                }
                // Apply to map visual
                document.body.classList.add('blood-moon');
                break;

            case 'eliteSwarm':
                // All enemies in this wave are elite
                activeEvent = { type: 'eliteSwarm' };
                if (typeof Display !== 'undefined') {
                    Display.showAnnouncement('ELITE SWARM!', 'All enemies are Elite!');
                }
                break;

            case 'luckyStar':
                // Double drop rate for next wave
                if (typeof Inventory !== 'undefined') {
                    Inventory.setDropMultiplier(2.0);
                }
                activeEvent = { type: 'luckyStar' };
                if (typeof Display !== 'undefined') {
                    Display.showMessage('Lucky Star! Double drop rate!');
                }
                break;
        }

        // Emit event
        if (typeof emitGameEvent === 'function') {
            emitGameEvent(EVENTS.SPECIAL_EVENT, data);
        }
    }

    /**
     * Roll for random events at wave start
     */
    function rollRandomEvents(waveNum) {
        // Clear previous event
        if (activeEvent && activeEvent.type === 'bloodMoon') {
            document.body.classList.remove('blood-moon');
        }
        if (activeEvent && activeEvent.type === 'luckyStar' && typeof Inventory !== 'undefined') {
            Inventory.setDropMultiplier(1.0);
        }
        activeEvent = null;

        // Blood Moon - wave 3+, 15% chance
        if (waveNum >= 3 && Math.random() < 0.15) {
            handleSpecialEvent({ type: 'bloodMoon' });
            return;
        }

        // Elite Swarm - wave 5+, 10% chance
        if (waveNum >= 5 && Math.random() < 0.10) {
            handleSpecialEvent({ type: 'eliteSwarm' });
            return;
        }

        // Lucky Star - 10% chance after wave 4
        if (waveNum >= 4 && Math.random() < 0.10) {
            handleSpecialEvent({ type: 'luckyStar' });
            return;
        }
    }

    /**
     * Roll for post-wave events (called at wave completion)
     */
    function rollPostWaveEvents(waveNum) {
        // Repair Drone - wave 6+, 20% chance if lives < 10
        if (typeof Game !== 'undefined' && waveNum >= 6) {
            // We'll check this from game.js where we have access to lives
        }
    }

    /**
     * Get active event (for other systems to check)
     */
    function getActiveEvent() {
        return activeEvent;
    }

    /**
     * Handle boss spawn event
     */
    function handleBossSpawn(data) {
        // Trigger boss entrance visual effect
        triggerBossEntranceEffect();

        // Show boss warning
        if (typeof Display !== 'undefined' && Display.showAnnouncement) {
            Display.showAnnouncement('BOSS', 'The Dark Lord has arrived!');
        }

        // Add boss to spawn queue with delay (respects pause, unlike setTimeout)
        spawnQueue.push({
            type: data.type,
            variant: null,
            spawnTime: waveElapsedTime + 1500  // 1.5 second delay for entrance effect
        });

        // Play boss music/sound
        if (typeof Sfx !== 'undefined') {
            Sfx.play('bossSpawn');
        }
    }

    /**
     * Trigger the boss entrance visual effect
     * Creates neon grid tunnel overlay
     */
    function triggerBossEntranceEffect() {
        // Create overlay element if it doesn't exist
        var overlay = document.querySelector('.boss-entrance-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'boss-entrance-overlay';
            document.body.appendChild(overlay);
        }

        // Create warning text element if it doesn't exist
        var warningText = document.querySelector('.boss-warning-text');
        if (!warningText) {
            warningText = document.createElement('div');
            warningText.className = 'boss-warning-text';
            warningText.textContent = 'BOSS!';
            document.body.appendChild(warningText);
        }

        // Trigger the animations
        overlay.classList.add('active');
        warningText.classList.add('active');

        // Remove active classes after animation completes
        setTimeout(function() {
            overlay.classList.remove('active');
            warningText.classList.remove('active');
        }, 3000);

        // Emit boss entrance event for other systems (audio, screen shake, etc.)
        if (typeof emitGameEvent === 'function') {
            emitGameEvent(EVENTS.BOSS_ENTRANCE, { type: 'boss' });
        }
    }

    /**
     * Handle warning event
     */
    function handleWarning(data) {
        if (typeof Display !== 'undefined') {
            Display.showMessage(data.message, 2500);
        }

        // Emit event
        if (typeof emitGameEvent === 'function') {
            emitGameEvent(EVENTS.WARNING, data);
        }
    }

    /**
     * Complete the current wave
     */
    function completeWave() {
        if (!waveInProgress) return;

        waveInProgress = false;
        var wave = waveData[currentWave];
        var completedWaveNum = currentWave + 1;
        var isLastWave = currentWave >= waveData.length - 1;

        // Advance to next wave BEFORE dispatching event
        // so getCurrentWave() returns the correct next wave number
        currentWave++;

        // Advance season (every 2 waves)
        if (typeof Seasons !== 'undefined' && Seasons.nextSeason && completedWaveNum % 2 === 0) {
            Seasons.nextSeason();
        }

        // Dispatch event with reward (uses completedWaveNum for the wave that just finished)
        var event = new CustomEvent('waveComplete', {
            detail: {
                wave: completedWaveNum,
                reward: wave.reward,
                isLastWave: isLastWave
            }
        });
        document.dispatchEvent(event);
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

        for (var i = 0; i < wave.events.length; i++) {
            var evt = wave.events[i];
            if (evt.type === 'spawn') {
                for (var j = 0; j < evt.data.length; j++) {
                    var group = evt.data[j];
                    enemies[group.type] = (enemies[group.type] || 0) + group.count;
                    total += group.count;
                }
            } else if (evt.type === 'bossSpawn') {
                enemies['boss'] = 1;
                total += 1;
            }
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
        getNextWaveInfo: getNextWaveInfo,
        getActiveEvent: getActiveEvent,
        EVENT_TYPES: EVENT_TYPES
    };
})();
