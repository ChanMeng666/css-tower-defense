/**
 * CSS Tower Defense - Crafting System
 * Consumable items crafted from materials (scrap, core, crystal)
 */

var Crafting = (function() {
    'use strict';

    var RECIPES = {
        iron_skin: {
            name: 'Iron Skin',
            description: '+3 lives (permanent)',
            cost: { scrap: 5 },
            type: 'instant',
            effect: function() {
                if (typeof Game !== 'undefined' && Game.addLives) {
                    Game.addLives(3);
                    Display.showMessage('+3 Lives!');
                }
            }
        },
        overcharge: {
            name: 'Overcharge',
            description: '+25% tower damage (1 wave)',
            cost: { core: 3 },
            type: 'wave_buff',
            buff: { damage_mult: 1.25 }
        },
        frost_trap: {
            name: 'Frost Trap',
            description: 'Enemies 30% slower (1 wave)',
            cost: { scrap: 2, core: 1 },
            type: 'wave_buff',
            buff: { slow_enemies: 0.7 }
        },
        gold_magnet: {
            name: 'Gold Magnet',
            description: '+50% gold (1 wave)',
            cost: { scrap: 3, core: 2 },
            type: 'wave_buff',
            buff: { gold_mult: 1.5 }
        },
        crystal_shield: {
            name: 'Crystal Shield',
            description: 'Block next 3 hits',
            cost: { crystal: 1, scrap: 2 },
            type: 'shield',
            charges: 3
        },
        arcane_barrage: {
            name: 'Arcane Barrage',
            description: '+50% attack speed (1 wave)',
            cost: { crystal: 2, core: 1 },
            type: 'wave_buff',
            buff: { attack_speed_mult: 1.5 }
        }
    };

    // Active buffs
    var activeBuffs = [];
    var shieldCharges = 0;

    function init() {
        activeBuffs = [];
        shieldCharges = 0;

        document.addEventListener('waveComplete', function() {
            onWaveComplete();
        });
    }

    /**
     * Craft a recipe
     */
    function craft(recipeId) {
        var recipe = RECIPES[recipeId];
        if (!recipe) return false;

        if (typeof Inventory === 'undefined' || !Inventory.hasMaterials(recipe.cost)) {
            if (typeof Display !== 'undefined') Display.showMessage('Not enough materials!');
            if (typeof Sfx !== 'undefined') Sfx.play('error');
            return false;
        }

        // Deduct materials
        for (var mat in recipe.cost) {
            Inventory.removeMaterial(mat, recipe.cost[mat]);
        }

        // Apply effect
        if (recipe.type === 'instant') {
            recipe.effect();
        } else if (recipe.type === 'wave_buff') {
            activeBuffs.push({
                id: recipeId,
                name: recipe.name,
                buff: recipe.buff,
                wavesRemaining: 1
            });
        } else if (recipe.type === 'shield') {
            shieldCharges += recipe.charges;
        }

        if (typeof Display !== 'undefined') Display.showMessage('Crafted ' + recipe.name + '!');
        if (typeof Sfx !== 'undefined') Sfx.play('powerup');
        return true;
    }

    /**
     * Get combined multiplier for a stat type
     */
    function getMultiplier(type) {
        var mult = 1.0;
        for (var i = 0; i < activeBuffs.length; i++) {
            if (activeBuffs[i].buff && activeBuffs[i].buff[type]) {
                mult *= activeBuffs[i].buff[type];
            }
        }
        return mult;
    }

    /**
     * Absorb damage with shield charges
     * Returns remaining damage after shield
     */
    function absorbDamage(amount) {
        if (shieldCharges <= 0) return amount;
        shieldCharges--;
        if (shieldCharges <= 0) {
            if (typeof Display !== 'undefined') Display.showMessage('Shield depleted!');
        }
        return 0;
    }

    /**
     * Tick down wave-duration buffs
     */
    function onWaveComplete() {
        for (var i = activeBuffs.length - 1; i >= 0; i--) {
            activeBuffs[i].wavesRemaining--;
            if (activeBuffs[i].wavesRemaining <= 0) {
                activeBuffs.splice(i, 1);
            }
        }
    }

    function getActiveBuffs() {
        return activeBuffs.slice();
    }

    function getShieldCharges() {
        return shieldCharges;
    }

    function isActive() {
        return activeBuffs.length > 0 || shieldCharges > 0;
    }

    return {
        init: init,
        craft: craft,
        getMultiplier: getMultiplier,
        absorbDamage: absorbDamage,
        onWaveComplete: onWaveComplete,
        getActiveBuffs: getActiveBuffs,
        getShieldCharges: getShieldCharges,
        isActive: isActive,
        RECIPES: RECIPES
    };
})();
