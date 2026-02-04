/**
 * CSS Tower Defense - Progression System
 * Manages XP, Levels, and Tech Tree Upgrades
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

    // Upgrades
    var UPGRADES = {
        'cheaper_towers': { name: 'Budget Engineering', description: 'Towers cost 10% less', maxLevel: 3, currentLevel: 0, cost: 1 },
        'start_gold': { name: 'Trust Fund', description: '+50 Starting Gold', maxLevel: 3, currentLevel: 0, cost: 1 },
        'damage_boost': { name: 'Heavy Rounds', description: '+10% Tower Damage', maxLevel: 3, currentLevel: 0, cost: 2 }
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

        // Listen for game events
        document.addEventListener('enemyKilled', function (e) {
            gainXP(e.detail.reward * 2);
        });

        document.addEventListener('waveComplete', function (e) {
            gainXP(e.detail.reward);
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
            return true;
        }
        return false;
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

    // Temporary console UI update until we have real DOM
    function updateUI() {
        // console.log('Lvl:', level, 'XP:', xp, 'SP:', skillPoints);
        // Dispatch event for UI to catch? Or direct update if Display handles it.
    }

    function renderUI() {
        // To be implemented with DOM
    }

    return {
        init: init,
        upgrade: upgrade,
        getTowerCostMultiplier: getTowerCostMultiplier,
        getStartingGoldBonus: getStartingGoldBonus,
        getDamageMultiplier: getDamageMultiplier,
        getLevel: function () { return level; },
        getSkillPoints: function () { return skillPoints; },
        getUpgrades: function () { return UPGRADES; }
    };
})();
