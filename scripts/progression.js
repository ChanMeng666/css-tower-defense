/**
 * CSS Tower Defense - Progression System
 * Manages XP, Levels, and Tech Tree Upgrades
 * Persists to localStorage and syncs to server when logged in
 */

var Progression = (function () {
    'use strict';

    // State
    var xp = 0;
    var level = 1;
    var skillPoints = 0;

    // Config
    var XP_PER_LEVEL_BASE = 100;
    var XP_SCALING = 1.5;

    // Debounce timer for server saves
    var serverSaveTimer = null;
    var SERVER_SAVE_DEBOUNCE = 5000;

    // Upgrades
    var UPGRADES = {
        'cheaper_towers': { name: 'Budget Engineering', description: 'Towers cost 10% less', maxLevel: 3, currentLevel: 0, cost: 1 },
        'start_gold': { name: 'Trust Fund', description: '+50 Starting Gold', maxLevel: 3, currentLevel: 0, cost: 1 },
        'damage_boost': { name: 'Heavy Rounds', description: '+10% Tower Damage', maxLevel: 3, currentLevel: 0, cost: 2 },
        'attack_speed': { name: 'Rapid Fire', description: '+10% Attack Speed', maxLevel: 3, currentLevel: 0, cost: 2 },
        'range_boost': { name: 'Eagle Eye', description: '+10% Tower Range', maxLevel: 3, currentLevel: 0, cost: 1 },
        'crit_chance': { name: 'Lucky Shot', description: '+5% Crit Chance', maxLevel: 3, currentLevel: 0, cost: 2 },
        'gold_bonus': { name: 'Greed', description: '+15% Gold from kills', maxLevel: 3, currentLevel: 0, cost: 2 },
        'slow_boost': { name: 'Deep Freeze', description: '+20% Slow Duration', maxLevel: 2, currentLevel: 0, cost: 2 },
        'splash_boost': { name: 'Blast Radius', description: '+20% Splash Range', maxLevel: 2, currentLevel: 0, cost: 2 },
        'extra_lives': { name: 'Reinforcements', description: '+5 Starting Lives', maxLevel: 2, currentLevel: 0, cost: 3 }
    };

    // DOM
    var modal = null;
    var openBtn = null;
    var closeBtn = null;
    var grid = null;

    function init() {
        modal = document.getElementById('techModal');
        openBtn = document.getElementById('techBtn');
        closeBtn = document.getElementById('closeTechBtn');
        grid = document.getElementById('techGrid');

        if (openBtn) openBtn.addEventListener('click', toggleModal);
        if (closeBtn) closeBtn.addEventListener('click', toggleModal);

        // Reset progression - will load from server when user logs in
        resetProgression();

        // Listen for game events
        document.addEventListener('enemyKilled', function (e) {
            gainXP(e.detail.reward * 2);
        });

        document.addEventListener('waveComplete', function (e) {
            gainXP(e.detail.reward);
        });

        // Sync on auth state change
        document.addEventListener('authStateChanged', function (e) {
            if (e.detail && e.detail.user) {
                loadFromServer();
            } else {
                resetProgression();
            }
        });

        renderUI();
    }

    function toggleModal() {
        if (!modal) return;
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
            renderUI();
        }
    }

    function gainXP(amount) {
        xp += amount;
        checkLevelUp();
        updateUI();
        debouncedServerSave();
    }

    function checkLevelUp() {
        var reqXP = getXPRequired(level);
        while (xp >= reqXP) {
            xp -= reqXP;
            level++;
            skillPoints++;
            Display.showMessage('LEVEL UP! Level ' + level);
            reqXP = getXPRequired(level);
        }
    }

    function getXPRequired(lvl) {
        return Math.floor(XP_PER_LEVEL_BASE * Math.pow(XP_SCALING, lvl - 1));
    }

    function upgrade(id) {
        var tech = UPGRADES[id];
        if (!tech) return false;

        if (skillPoints >= tech.cost && tech.currentLevel < tech.maxLevel) {
            skillPoints -= tech.cost;
            tech.currentLevel++;
            updateUI();
            debouncedServerSave();
            return true;
        }
        return false;
    }

    // ── Persistence helpers ──

    function getUpgradeState() {
        var state = {};
        for (var id in UPGRADES) {
            state[id] = UPGRADES[id].currentLevel;
        }
        return state;
    }

    function applyUpgradeState(state) {
        if (!state) return;
        for (var id in state) {
            if (UPGRADES[id] && typeof state[id] === 'number') {
                UPGRADES[id].currentLevel = Math.min(state[id], UPGRADES[id].maxLevel);
            }
        }
    }

    function resetProgression() {
        xp = 0;
        level = 1;
        skillPoints = 0;
        for (var id in UPGRADES) {
            UPGRADES[id].level = 0;
        }
    }

    function saveToServer() {
        if (typeof API === 'undefined' || typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
        API.saveProgression({
            xp: xp,
            level: level,
            skillPoints: skillPoints,
            upgrades: getUpgradeState()
        });
    }

    function loadFromServer() {
        if (typeof API === 'undefined' || typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            resetProgression();
            renderUI();
            return;
        }
        API.getProgression().then(function (data) {
            resetProgression(); // Always reset first
            if (data) {
                xp = data.xp || 0;
                level = data.level || 1;
                skillPoints = data.skillPoints || 0;
                if (data.upgrades) {
                    applyUpgradeState(data.upgrades);
                }
            }
            renderUI();
        });
    }

    function debouncedServerSave() {
        if (serverSaveTimer) clearTimeout(serverSaveTimer);
        serverSaveTimer = setTimeout(function () {
            saveToServer();
            serverSaveTimer = null;
        }, SERVER_SAVE_DEBOUNCE);
    }

    // Getters for other systems to apply effects
    function getTowerCostMultiplier() {
        return 1.0 - (UPGRADES['cheaper_towers'].currentLevel * 0.1);
    }

    function getStartingGoldBonus() {
        return UPGRADES['start_gold'].currentLevel * 50;
    }

    function getDamageMultiplier() {
        return 1.0 + (UPGRADES['damage_boost'].currentLevel * 0.1);
    }

    function getAttackSpeedMultiplier() {
        return 1.0 + (UPGRADES['attack_speed'].currentLevel * 0.1);
    }

    function getRangeMultiplier() {
        return 1.0 + (UPGRADES['range_boost'].currentLevel * 0.1);
    }

    function getCritChance() {
        return UPGRADES['crit_chance'].currentLevel * 0.05;
    }

    function getGoldMultiplier() {
        return 1.0 + (UPGRADES['gold_bonus'].currentLevel * 0.15);
    }

    function getSlowDurationMultiplier() {
        return 1.0 + (UPGRADES['slow_boost'].currentLevel * 0.2);
    }

    function getSplashRadiusMultiplier() {
        return 1.0 + (UPGRADES['splash_boost'].currentLevel * 0.2);
    }

    function getExtraLives() {
        return UPGRADES['extra_lives'].currentLevel * 5;
    }

    /**
     * Update the Level and SP display elements
     */
    function updateUI() {
        var levelEl = document.getElementById('playerLevel');
        var spEl = document.getElementById('skillPoints');

        if (levelEl) levelEl.textContent = level;
        if (spEl) spEl.textContent = skillPoints;

        // Re-render cards to update availability
        renderUI();
    }

    /**
     * Render the tech tree cards into the grid
     */
    function renderUI() {
        if (!grid) return;

        // Clear existing cards
        grid.innerHTML = '';

        // Create a card for each upgrade
        var upgradeIds = Object.keys(UPGRADES);
        for (var i = 0; i < upgradeIds.length; i++) {
            var id = upgradeIds[i];
            var tech = UPGRADES[id];

            var card = document.createElement('div');
            card.className = 'tech-card';
            card.dataset.upgradeId = id;

            // Check if maxed
            var isMaxed = tech.currentLevel >= tech.maxLevel;
            var canAfford = skillPoints >= tech.cost;

            if (isMaxed) {
                card.classList.add('maxed');
            } else if (!canAfford) {
                card.classList.add('unavailable');
            }

            // Card content
            var levelDisplay = tech.currentLevel + '/' + tech.maxLevel;
            card.innerHTML =
                '<h3>' + tech.name + '</h3>' +
                '<p>' + tech.description + '</p>' +
                '<p class="tech-level">Level: ' + levelDisplay + '</p>' +
                '<p class="tech-cost">' + (isMaxed ? 'MAXED' : 'Cost: ' + tech.cost + ' SP') + '</p>';

            // Click handler for upgrading
            if (!isMaxed) {
                (function(upgradeId) {
                    card.addEventListener('click', function() {
                        if (upgrade(upgradeId)) {
                            if (typeof Sfx !== 'undefined') Sfx.play('upgrade');
                            if (typeof Display !== 'undefined') {
                                Display.showMessage('Upgraded ' + UPGRADES[upgradeId].name + '!');
                            }
                        } else {
                            if (typeof Sfx !== 'undefined') Sfx.play('error');
                            if (typeof Display !== 'undefined') {
                                Display.showMessage('Not enough SP!');
                            }
                        }
                    });
                })(id);
            }

            grid.appendChild(card);
        }

        // Update level/SP display
        var levelEl = document.getElementById('playerLevel');
        var spEl = document.getElementById('skillPoints');
        if (levelEl) levelEl.textContent = level;
        if (spEl) spEl.textContent = skillPoints;
    }

    return {
        init: init,
        upgrade: upgrade,
        getTowerCostMultiplier: getTowerCostMultiplier,
        getStartingGoldBonus: getStartingGoldBonus,
        getDamageMultiplier: getDamageMultiplier,
        getAttackSpeedMultiplier: getAttackSpeedMultiplier,
        getRangeMultiplier: getRangeMultiplier,
        getCritChance: getCritChance,
        getGoldMultiplier: getGoldMultiplier,
        getSlowDurationMultiplier: getSlowDurationMultiplier,
        getSplashRadiusMultiplier: getSplashRadiusMultiplier,
        getExtraLives: getExtraLives,
        getLevel: function () { return level; },
        getXP: function () { return xp; },
        getSkillPoints: function () { return skillPoints; },
        getUpgrades: function () { return UPGRADES; },
        getUpgradeState: getUpgradeState,
        applyUpgradeState: applyUpgradeState,
        loadFromServer: loadFromServer,
        saveToServer: saveToServer
    };
})();
