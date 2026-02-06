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
                { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'The kehua spirits approach...' } },
                { time: 2000, type: 'spawn', data: [{ type: 'kehua', count: 5, interval: 1500 }] }
            ],
            reward: 25
        },
        // Wave 2
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'More kehua incoming!' } },
                { time: 2000, type: 'spawn', data: [{ type: 'kehua', count: 8, interval: 1200 }] }
            ],
            reward: 30
        },
        // Wave 3 - Introduce patupaiarehe
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 3', subtitle: 'Patupaiarehe join the fray!' } },
                { time: 2000, type: 'spawn', data: [
                    { type: 'kehua', count: 5, interval: 1500 },
                    { type: 'patupaiarehe', count: 3, interval: 2000 }
                ] }
            ],
            reward: 40
        },
        // Wave 4
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 4', subtitle: 'Forest spirits emerge!' } },
                { time: 2000, type: 'spawn', data: [
                    { type: 'patupaiarehe', count: 6, interval: 1200 },
                    { type: 'kehua', count: 4, interval: 1000 }
                ] }
            ],
            reward: 50
        },
        // Wave 5 - Introduce toa warriors
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 5', subtitle: 'Toa warriors approach!' } },
                { time: 1500, type: 'warning', data: { message: 'Toa have high armor!' } },
                { time: 3000, type: 'spawn', data: [
                    { type: 'kehua', count: 8, interval: 1000 },
                    { type: 'patupaiarehe', count: 5, interval: 1500 },
                    { type: 'toa', count: 2, interval: 3000 }
                ] }
            ],
            reward: 75
        },
        // Wave 6 - Can trigger Te Rongoā if low on lives
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 6', subtitle: 'The assault continues' } },
                { time: 2000, type: 'spawn', data: [
                    { type: 'patupaiarehe', count: 8, interval: 1000 },
                    { type: 'toa', count: 4, interval: 2500 }
                ] }
            ],
            reward: 80
        },
        // Wave 7 - Special event: Te Haumi (Abundance)
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 7', subtitle: 'Te Haumi! (Abundance)' } },
                { time: 1000, type: 'specialEvent', data: { type: 'teHaumi', bonus: 50 } },
                { time: 2500, type: 'spawn', data: [
                    { type: 'kehua', count: 10, interval: 800, variant: 'tere' },
                    { type: 'patupaiarehe', count: 6, interval: 1200 },
                    { type: 'toa', count: 5, interval: 2000 }
                ] }
            ],
            reward: 100
        },
        // Wave 8 - Rangatira forces
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 8', subtitle: 'Rangatira forces!' } },
                { time: 2000, type: 'spawn', data: [
                    { type: 'toa', count: 8, interval: 1500 },
                    { type: 'patupaiarehe', count: 10, interval: 1000, variant: 'rangatira' }
                ] }
            ],
            reward: 120
        },
        // Wave 9 - Pre-boss: Te Taua (War Party)
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'Wave 9', subtitle: 'Te Taua approaches!' } },
                { time: 1500, type: 'warning', data: { message: 'Prepare for the Taniwha!' } },
                { time: 3000, type: 'spawn', data: [
                    { type: 'kehua', count: 15, interval: 600 },
                    { type: 'patupaiarehe', count: 10, interval: 800 },
                    { type: 'toa', count: 6, interval: 1800 }
                ] }
            ],
            reward: 150
        },
        // Wave 10 - Boss wave: Taniwha
        {
            events: [
                { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'The Taniwha awakens!' } },
                { time: 2500, type: 'warning', data: { message: 'TANIWHA INCOMING!' } },
                { time: 4000, type: 'spawn', data: [
                    { type: 'toa', count: 4, interval: 2000 }
                ] },
                { time: 10000, type: 'bossSpawn', data: { type: 'taniwha' } }
            ],
            reward: 200
        }
    ];

    // Store default wave data for reset
    var defaultWaveData = waveData;

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
        // Enhance subtitle with environmental context
        var envSubtitle = data.subtitle || '';
        if (typeof Seasons !== 'undefined' && Seasons.getSeasonName) {
            var season = Seasons.getSeasonName();
            var timeOfDay = (typeof Weather !== 'undefined' && Weather.isNight && Weather.isNight()) ? 'Night' : 'Day';
            envSubtitle = season + ' ' + timeOfDay + ' — ' + envSubtitle;
        }

        // Use Display announcer if available
        if (typeof Display !== 'undefined' && Display.showAnnouncement) {
            Display.showAnnouncement(data.title, envSubtitle);
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
     * Handle special event (Māori-themed)
     */
    function handleSpecialEvent(data) {
        switch (data.type) {
            case 'teHaumi':
                // Te Haumi (Abundance) - bonus gold
                if (typeof Game !== 'undefined' && Game.addGold) {
                    Game.addGold(data.bonus);
                }
                if (typeof Display !== 'undefined') {
                    Display.showMessage('Te Haumi! (Abundance)');
                }
                break;

            case 'teHau':
                // Te Hau (Wind Blessing) - tower fire rate boost
                activeEvent = { type: 'teHau', duration: 10 };
                eventTimer = 10;
                if (typeof Display !== 'undefined') {
                    Display.showAnnouncement('TE HAU!', 'Wind Blessing - towers fire 50% faster!');
                }
                break;

            case 'teRongoa':
                // Te Rongoā (Healing) - restore lives
                if (typeof Game !== 'undefined') {
                    Game.addLives(5);
                }
                if (typeof Display !== 'undefined') {
                    Display.showMessage('Te Rongoā! (Healing) +5 lives!');
                }
                break;

            case 'maramaToto':
                // Marama Toto (Blood Moon) - enemies stronger but more gold
                activeEvent = { type: 'maramaToto' };
                if (typeof Display !== 'undefined') {
                    Display.showAnnouncement('MARAMA TOTO!', 'Blood Moon - Enemies +30% HP, +50% gold!');
                }
                // Apply to map visual
                document.body.classList.add('blood-moon');
                // Set blood moon modifiers in weather system
                if (typeof Weather !== 'undefined' && Weather.setBloodMoon) {
                    Weather.setBloodMoon(true);
                }
                break;

            case 'teTaua':
                // Te Taua (War Party) - all enemies are rangatira
                activeEvent = { type: 'teTaua' };
                if (typeof Display !== 'undefined') {
                    Display.showAnnouncement('TE TAUA!', 'War Party - All enemies are Rangatira!');
                }
                break;

            case 'matariki':
                // Matariki (Pleiades/Māori New Year) - double drop rate
                if (typeof Inventory !== 'undefined') {
                    Inventory.setDropMultiplier(2.0);
                }
                activeEvent = { type: 'matariki' };
                if (typeof Display !== 'undefined') {
                    Display.showMessage('Matariki! Double drop rate!');
                }
                break;

            // Keep backwards compatibility for old event names
            case 'goldRush':
                handleSpecialEvent({ type: 'teHaumi', bonus: data.bonus });
                return;
            case 'speedBoost':
                handleSpecialEvent({ type: 'teHau' });
                return;
            case 'repair':
                handleSpecialEvent({ type: 'teRongoa' });
                return;
            case 'bloodMoon':
                handleSpecialEvent({ type: 'maramaToto' });
                return;
            case 'eliteSwarm':
                handleSpecialEvent({ type: 'teTaua' });
                return;
            case 'luckyStar':
                handleSpecialEvent({ type: 'matariki' });
                return;
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
        if (activeEvent && activeEvent.type === 'maramaToto') {
            document.body.classList.remove('blood-moon');
            if (typeof Weather !== 'undefined' && Weather.setBloodMoon) {
                Weather.setBloodMoon(false);
            }
        }
        if (activeEvent && activeEvent.type === 'matariki' && typeof Inventory !== 'undefined') {
            Inventory.setDropMultiplier(1.0);
        }
        activeEvent = null;

        // Marama Toto (Blood Moon) - night waves only (even), scaling probability
        var isNightWave = (waveNum % 2 === 0);
        if (isNightWave && waveNum >= 2) {
            // Wave 2: 5%, Wave 4: 10%, Wave 6: 15%, Wave 8: 20%, Wave 10: 25%
            var bloodMoonChance = waveNum * 0.025;
            if (Math.random() < bloodMoonChance) {
                handleSpecialEvent({ type: 'maramaToto' });
                return;
            }
        }

        // Te Taua (War Party) - wave 5+, 10% chance
        if (waveNum >= 5 && Math.random() < 0.10) {
            handleSpecialEvent({ type: 'teTaua' });
            return;
        }

        // Matariki (Māori New Year) - 10% chance after wave 4
        if (waveNum >= 4 && Math.random() < 0.10) {
            handleSpecialEvent({ type: 'matariki' });
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
     * Handle boss spawn event - Taniwha
     */
    function handleBossSpawn(data) {
        // Trigger boss entrance visual effect
        triggerBossEntranceEffect();

        // Show boss warning
        if (typeof Display !== 'undefined' && Display.showAnnouncement) {
            Display.showAnnouncement('TANIWHA', 'The water guardian emerges!');
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
            warningText.textContent = 'TANIWHA!';
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

        // Seasons are now wave-driven (set on waveStarted event in seasons.js)

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
        return Math.min(currentWave + 1, waveData.length);
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

    /**
     * Set current wave (for loading saved games)
     * @param {number} wave - 1-indexed wave number
     */
    function setCurrentWave(wave) {
        currentWave = Math.max(0, Math.min(wave - 1, waveData.length));
    }

    /**
     * Set custom wave data (for challenges)
     */
    function setWaveData(customWaves) {
        if (customWaves && customWaves.length > 0) {
            waveData = customWaves;
        }
    }

    /**
     * Reset wave data to default (after challenge ends)
     */
    function resetWaveData() {
        waveData = defaultWaveData;
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
        setCurrentWave: setCurrentWave,
        setWaveData: setWaveData,
        resetWaveData: resetWaveData,
        EVENT_TYPES: EVENT_TYPES
    };
})();
