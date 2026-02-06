/**
 * Te Pā Tiaki - Daily Challenge System
 * Client-side challenge constraint tracker
 */

var Challenge = (function() {
    'use strict';

    // Challenge templates (mirrors server definitions) - Māori themed
    var TEMPLATES = {
        speed_run: { name: 'Te Oma Tere', description: 'Complete in under 15 minutes', constraint: 'time_limit' },
        taiaha_only: { name: "Ara Taiaha", description: 'Taiaha towers only', allowedTowers: ['taiaha'], scoreBonus: 1.5 },
        no_sell: { name: 'Kore Hoko', description: 'Cannot sell towers', scoreBonus: 1.25 },
        budget: { name: 'Pēneti Iti', description: 'Start with only 50 gold', startGold: 50, scoreBonus: 2.0 },
        fragile: { name: 'Maroro', description: 'Only 5 starting lives', startLives: 5 },
        taniwha_rush: { name: 'Taniwha Rush', description: 'Start at wave 8 with 500 gold', startWave: 8, startGold: 500, scoreBonus: 2.0 },
        moana: { name: 'Te Moana', description: 'Taiaha and Tangaroa towers only', allowedTowers: ['taiaha', 'tangaroa'], scoreBonus: 1.75 },
        taonga_hunter: { name: 'Kaikohi Taonga', description: 'Score based on taonga collected' },
        combo_master: { name: 'Kaiwhakatū', description: 'Bonus for combos of 5+' },
        tower_limit: { name: 'Ngāwari', description: 'Maximum 6 towers', maxTowers: 6, scoreBonus: 2.5 }
    };

    var active = false;
    var currentTemplate = null;
    var currentTemplateId = null;
    var trackingData = {};

    function startChallenge(templateId) {
        var template = TEMPLATES[templateId];
        if (!template) return false;
        active = true;
        currentTemplateId = templateId;
        currentTemplate = template;
        trackingData = { comboSum: 0, materialsCollected: 0 };

        // Show challenge banner
        showBanner();
        return true;
    }

    function showBanner() {
        var existing = document.getElementById('challengeBanner');
        if (existing) existing.parentNode.removeChild(existing);

        if (!active || !currentTemplate) return;

        var banner = document.createElement('div');
        banner.className = 'challenge-banner';
        banner.id = 'challengeBanner';
        banner.textContent = 'Challenge: ' + currentTemplate.name;
        document.body.appendChild(banner);
    }

    function hideBanner() {
        var el = document.getElementById('challengeBanner');
        if (el) el.parentNode.removeChild(el);
    }

    function isActive() {
        return active;
    }

    function getTemplate() {
        return currentTemplate;
    }

    function getTemplateId() {
        return currentTemplateId;
    }

    function getTrackingData() {
        return trackingData;
    }

    function isTowerAllowed(type) {
        if (!active || !currentTemplate) return true;
        if (currentTemplate.allowedTowers) {
            return currentTemplate.allowedTowers.indexOf(type) !== -1;
        }
        return true;
    }

    function isSellAllowed() {
        if (!active || !currentTemplate) return true;
        return currentTemplateId !== 'no_sell';
    }

    function getMaxTowers() {
        if (!active || !currentTemplate) return Infinity;
        return currentTemplate.maxTowers || Infinity;
    }

    function getStartModifiers() {
        if (!active || !currentTemplate) return {};
        var mods = {};
        if (currentTemplate.startGold !== undefined) mods.gold = currentTemplate.startGold;
        if (currentTemplate.startLives !== undefined) mods.lives = currentTemplate.startLives;
        if (currentTemplate.startWave !== undefined) mods.startWave = currentTemplate.startWave;
        return mods;
    }

    function getScoreBonus() {
        if (!active || !currentTemplate) return 1.0;
        return currentTemplate.scoreBonus || 1.0;
    }

    function end() {
        active = false;
        currentTemplate = null;
        currentTemplateId = null;
        trackingData = {};
        hideBanner();
    }

    return {
        startChallenge: startChallenge,
        isActive: isActive,
        getTemplate: getTemplate,
        getTemplateId: getTemplateId,
        getTrackingData: getTrackingData,
        isTowerAllowed: isTowerAllowed,
        isSellAllowed: isSellAllowed,
        getMaxTowers: getMaxTowers,
        getStartModifiers: getStartModifiers,
        getScoreBonus: getScoreBonus,
        end: end,
        TEMPLATES: TEMPLATES
    };
})();
