/**
 * CSS Tower Defense - Inventory System
 * Manages loot drops and materials (Terraria-inspired)
 */

var Inventory = (function() {
    'use strict';

    // Material types with rarity - Māori treasures (taonga)
    var MATERIALS = {
        pipi: { name: 'Pipi', rarity: 'common', color: '#F5F5DC' },     // Shell - coastal gathering
        koiwi: { name: 'Koiwi', rarity: 'rare', color: '#FFFFF0' },     // Carved bone - ancestral power
        pounamu: { name: 'Pounamu', rarity: 'epic', color: '#3CB371' }  // Greenstone - sacred treasure
    };

    // Drop chances by enemy type
    var DROP_CHANCES = {
        kehua: { pipi: 0.10, koiwi: 0.01, pounamu: 0 },
        patupaiarehe: { pipi: 0.15, koiwi: 0.03, pounamu: 0 },
        toa: { pipi: 0.20, koiwi: 0.05, pounamu: 0.01 },
        taniwha: { pipi: 1.0, koiwi: 1.0, pounamu: 1.0 }
    };

    // Variant modifiers
    var VARIANT_MULTIPLIERS = {
        rangatira: { pipi: 1.5, koiwi: 2.0, pounamu: 1.5 },
        pakanga: { pipi: 1.3, koiwi: 1.5, pounamu: 1.2 },
        tere: { pipi: 1.2, koiwi: 1.2, pounamu: 1.0 },
        mate: { pipi: 1.4, koiwi: 1.8, pounamu: 1.3 }
    };

    // Player inventory
    var inventory = {
        pipi: 0,
        koiwi: 0,
        pounamu: 0
    };

    // Drop rate multiplier (for Lucky Star event)
    var dropRateMultiplier = 1.0;

    /**
     * Initialize the inventory system
     */
    function init() {
        inventory = { pipi: 0, koiwi: 0, pounamu: 0 };
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
        var chances = DROP_CHANCES[enemy.type] || DROP_CHANCES.kehua;
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
        var pipiEl = document.getElementById('invPipi');
        var koiwiEl = document.getElementById('invKoiwi');
        var pounamuEl = document.getElementById('invPounamu');

        if (pipiEl) pipiEl.textContent = inventory.pipi;
        if (koiwiEl) koiwiEl.textContent = inventory.koiwi;
        if (pounamuEl) pounamuEl.textContent = inventory.pounamu;
    }

    // Public API
    return {
        init: init,
        addMaterial: addMaterial,
        removeMaterial: removeMaterial,
        hasMaterials: hasMaterials,
        getInventory: getInventory,
        getState: getInventory,
        setDropMultiplier: setDropMultiplier,
        MATERIALS: MATERIALS
    };
})();
