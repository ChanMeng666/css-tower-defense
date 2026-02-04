/**
 * CSS Tower Defense - Inventory System
 * Manages loot drops and materials (Terraria-inspired)
 */

var Inventory = (function() {
    'use strict';

    // Material types with rarity
    var MATERIALS = {
        scrap: { name: 'Scrap Metal', rarity: 'common', color: '#888888' },
        core: { name: 'Power Core', rarity: 'rare', color: '#0088FF' },
        crystal: { name: 'Magic Crystal', rarity: 'epic', color: '#AA00FF' }
    };

    // Drop chances by enemy type
    var DROP_CHANCES = {
        slime: { scrap: 0.10, core: 0.01, crystal: 0 },
        goblin: { scrap: 0.15, core: 0.03, crystal: 0 },
        knight: { scrap: 0.20, core: 0.05, crystal: 0.01 },
        boss: { scrap: 1.0, core: 1.0, crystal: 1.0 }
    };

    // Variant modifiers
    var VARIANT_MULTIPLIERS = {
        elite: { scrap: 1.5, core: 2.0, crystal: 1.5 },
        armored: { scrap: 1.3, core: 1.5, crystal: 1.2 },
        speedy: { scrap: 1.2, core: 1.2, crystal: 1.0 },
        toxic: { scrap: 1.4, core: 1.8, crystal: 1.3 }
    };

    // Player inventory
    var inventory = {
        scrap: 0,
        core: 0,
        crystal: 0
    };

    // Drop rate multiplier (for Lucky Star event)
    var dropRateMultiplier = 1.0;

    /**
     * Initialize the inventory system
     */
    function init() {
        inventory = { scrap: 0, core: 0, crystal: 0 };
        dropRateMultiplier = 1.0;

        // Listen for enemy kills
        document.addEventListener('enemyKilled', function(e) {
            var enemy = e.detail.enemy;
            rollForDrops(enemy);
        });

        updateUI();
    }

    /**
     * Roll for loot drops when an enemy dies
     */
    function rollForDrops(enemy) {
        var chances = DROP_CHANCES[enemy.type] || DROP_CHANCES.slime;
        var variantMult = enemy.variant ? VARIANT_MULTIPLIERS[enemy.variant] : null;

        var dropped = [];

        // Roll for each material type
        for (var material in chances) {
            var baseChance = chances[material];
            if (variantMult) {
                baseChance *= variantMult[material] || 1;
            }
            baseChance *= dropRateMultiplier;

            if (Math.random() < baseChance) {
                // Determine quantity (bosses drop more)
                var qty = enemy.type === 'boss' ? Math.floor(Math.random() * 3) + 2 : 1;
                addMaterial(material, qty);
                dropped.push({ type: material, qty: qty });
            }
        }

        // Show drop visual
        if (dropped.length > 0) {
            showDropEffect(enemy, dropped);
        }
    }

    /**
     * Add material to inventory
     */
    function addMaterial(type, amount) {
        if (inventory.hasOwnProperty(type)) {
            inventory[type] += amount;
            updateUI();
        }
    }

    /**
     * Remove material from inventory
     */
    function removeMaterial(type, amount) {
        if (inventory.hasOwnProperty(type) && inventory[type] >= amount) {
            inventory[type] -= amount;
            updateUI();
            return true;
        }
        return false;
    }

    /**
     * Check if player has enough materials
     */
    function hasMaterials(requirements) {
        for (var type in requirements) {
            if (!inventory.hasOwnProperty(type) || inventory[type] < requirements[type]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get current inventory
     */
    function getInventory() {
        return Object.assign({}, inventory);
    }

    /**
     * Set drop rate multiplier (for Lucky Star event)
     */
    function setDropMultiplier(mult) {
        dropRateMultiplier = mult;
    }

    /**
     * Show visual drop effect at enemy position
     */
    function showDropEffect(enemy, drops) {
        var mapWidth = Path.GRID_COLS * Path.CELL_SIZE;
        var mapHeight = Path.GRID_ROWS * Path.CELL_SIZE;
        var x = enemy.x + (mapWidth / 2);
        var y = enemy.y + (mapHeight / 2);

        drops.forEach(function(drop, index) {
            var mat = MATERIALS[drop.type];
            var el = document.createElement('div');
            el.className = 'loot-drop loot-' + mat.rarity;
            el.textContent = '+' + drop.qty + ' ' + mat.name;
            el.style.cssText =
                'position: absolute; left: ' + x + 'px; top: ' + (y - 20 - index * 25) + 'px; ' +
                'color: ' + mat.color + '; font-family: "Bangers", cursive; font-size: 1rem; ' +
                'text-shadow: 2px 2px 0 #000; pointer-events: none; z-index: 1000; ' +
                'animation: loot-float 1.5s ease-out forwards;';

            var map = document.getElementById('map');
            if (map) map.appendChild(el);

            setTimeout(function() {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 1500);
        });
    }

    /**
     * Update inventory UI display
     */
    function updateUI() {
        var scrapEl = document.getElementById('invScrap');
        var coreEl = document.getElementById('invCore');
        var crystalEl = document.getElementById('invCrystal');

        if (scrapEl) scrapEl.textContent = inventory.scrap;
        if (coreEl) coreEl.textContent = inventory.core;
        if (crystalEl) crystalEl.textContent = inventory.crystal;
    }

    // Public API
    return {
        init: init,
        addMaterial: addMaterial,
        removeMaterial: removeMaterial,
        hasMaterials: hasMaterials,
        getInventory: getInventory,
        setDropMultiplier: setDropMultiplier,
        MATERIALS: MATERIALS
    };
})();
