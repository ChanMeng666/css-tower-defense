/**
 * CSS Tower Defense - Shop System
 * Handles tower purchasing and upgrades
 */

var Shop = (function() {
    'use strict';
    
    // Selected tower for info/upgrade
    var selectedTower = null;
    
    /**
     * Initialize the shop system
     */
    function init() {
        setupTowerSelection();
    }
    
    /**
     * Setup tower selection in shop panel
     */
    function setupTowerSelection() {
        var towerOptions = document.querySelectorAll('.tower-option');
        
        towerOptions.forEach(function(option) {
            option.addEventListener('click', function(e) {
                var type = this.dataset.tower;
                var cost = parseInt(this.dataset.cost);

                // If already selected same type, allow deselection (don't check affordability)
                if (Game.getSelectedTowerType() === type) {
                    Game.selectTowerType(null);
                    return;
                }

                // Selecting new type - check if can afford
                if (Game.getGold() < cost) {
                    Display.showMessage('Not enough gold!');
                    Sfx.play('error');
                    return;
                }

                // Select the new tower type
                Game.selectTowerType(type);
            });
            
            // Hover effect - show tower info
            option.addEventListener('mouseenter', function() {
                var type = this.dataset.tower;
                showTowerInfo(type);
            });
            
            option.addEventListener('mouseleave', function() {
                hideTowerInfo();
            });
        });
    }
    
    /**
     * Show tower info tooltip
     */
    function showTowerInfo(type) {
        var config = Tower.getType(type);
        if (!config) return;
        
        // Could create a tooltip here
        // For now, info is shown in the shop panel itself
    }
    
    /**
     * Hide tower info tooltip
     */
    function hideTowerInfo() {
        // Hide tooltip
    }
    
    /**
     * Select a placed tower for upgrade/sell
     */
    function selectPlacedTower(tower) {
        if (selectedTower === tower) {
            deselectTower();
            return;
        }
        
        selectedTower = tower;
        tower.element.classList.add('selected');
        Display.showRangeIndicator(tower);
        
        // Show upgrade/sell UI
        showTowerActions(tower);
    }
    
    /**
     * Deselect the current tower
     */
    function deselectTower() {
        if (selectedTower) {
            selectedTower.element.classList.remove('selected');
            Display.hideRangeIndicator();
            hideTowerActions();
            selectedTower = null;
        }
    }
    
    /**
     * Show upgrade/sell actions for a tower
     */
    function showTowerActions(tower) {
        // Remove existing action panel
        hideTowerActions();
        
        var panel = document.createElement('div');
        panel.id = 'towerActions';
        panel.className = 'tower-actions';
        panel.style.cssText = 'position: fixed; bottom: 200px; left: 50%; transform: translateX(-50%); ' +
                             'background: rgba(0,0,0,0.9); border-radius: 10px; padding: 15px; ' +
                             'display: flex; gap: 15px; z-index: 200; pointer-events: auto;';
        
        // Tower info
        var info = document.createElement('div');
        info.className = 'tower-action-info';
        info.style.cssText = 'color: #fff; text-align: center; min-width: 100px;';

        // Build tower name with prefix if present
        var towerName = tower.config.name;
        var prefixColor = '#FFD700';
        if (tower.prefix && Tower.PREFIXES[tower.prefix]) {
            var p = Tower.PREFIXES[tower.prefix];
            towerName = p.name + ' ' + tower.config.name;
            prefixColor = p.color;
        }

        info.innerHTML = '<div style="font-weight: bold; color: ' + prefixColor + ';">' + towerName + '</div>' +
                        '<div style="font-size: 0.8rem; margin-top: 5px;">Level ' + tower.level + '</div>' +
                        '<div style="font-size: 0.8rem;">Damage: ' + tower.damage + '</div>' +
                        '<div style="font-size: 0.8rem;">Range: ' + Math.round(tower.range) + '</div>';
        panel.appendChild(info);
        
        // Upgrade button
        if (tower.level < 3) {
            var upgradeCost = tower.getUpgradeCost();
            var upgradeBtn = document.createElement('button');
            upgradeBtn.className = 'action-btn upgrade-btn';
            upgradeBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; ' +
                                       'background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%); color: #fff; ' +
                                       'font-size: 0.9rem;';
            upgradeBtn.innerHTML = 'Upgrade<br><span style="font-size: 0.75rem;">' + upgradeCost + 'g</span>';
            
            if (Game.getGold() < upgradeCost) {
                upgradeBtn.style.opacity = '0.5';
                upgradeBtn.style.cursor = 'not-allowed';
            } else {
                upgradeBtn.addEventListener('click', function() {
                    upgradeTower(tower);
                });
            }
            
            panel.appendChild(upgradeBtn);
        }
        
        // Reforge button (Terraria-style)
        var reforgeCost = tower.getReforgeCost();
        var reforgeBtn = document.createElement('button');
        reforgeBtn.className = 'action-btn reforge-btn';
        reforgeBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; ' +
                                   'background: linear-gradient(135deg, #9C27B0 0%, #6A1B9A 100%); color: #fff; ' +
                                   'font-size: 0.9rem;';
        reforgeBtn.innerHTML = 'Reforge<br><span style="font-size: 0.75rem;">' + reforgeCost + 'g</span>';

        if (Game.getGold() < reforgeCost) {
            reforgeBtn.style.opacity = '0.5';
            reforgeBtn.style.cursor = 'not-allowed';
        } else {
            reforgeBtn.addEventListener('click', function() {
                reforgeTower(tower);
            });
        }
        panel.appendChild(reforgeBtn);

        // Sell button
        var sellValue = tower.getSellValue();
        var sellBtn = document.createElement('button');
        sellBtn.className = 'action-btn sell-btn';
        sellBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; ' +
                               'background: linear-gradient(135deg, #F44336 0%, #C62828 100%); color: #fff; ' +
                               'font-size: 0.9rem;';
        sellBtn.innerHTML = 'Sell<br><span style="font-size: 0.75rem;">' + sellValue + 'g</span>';
        sellBtn.addEventListener('click', function() {
            sellTower(tower);
        });
        panel.appendChild(sellBtn);
        
        document.body.appendChild(panel);
    }
    
    /**
     * Hide tower actions panel
     */
    function hideTowerActions() {
        var panel = document.getElementById('towerActions');
        if (panel) {
            panel.parentNode.removeChild(panel);
        }
    }
    
    /**
     * Upgrade the selected tower
     */
    function upgradeTower(tower) {
        var cost = tower.getUpgradeCost();
        
        if (Game.getGold() < cost) {
            Display.showMessage('Not enough gold!');
            Sfx.play('error');
            return false;
        }
        
        if (tower.upgrade()) {
            Game.spendGold(cost);
            Display.showMessage('Tower upgraded!');
            Sfx.play('upgrade');
            
            // Refresh the action panel
            showTowerActions(tower);
            Display.showRangeIndicator(tower);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Reforge the selected tower (Terraria-style)
     */
    function reforgeTower(tower) {
        var cost = tower.getReforgeCost();

        if (Game.getGold() < cost) {
            Display.showMessage('Not enough gold!');
            Sfx.play('error');
            return false;
        }

        Game.spendGold(cost);
        var prefix = tower.reforge();

        // Show result with rarity color
        var rarityText = prefix.rarity.charAt(0).toUpperCase() + prefix.rarity.slice(1);
        Display.showMessage(prefix.name + ' ' + tower.config.name + '! (' + rarityText + ')');
        Sfx.play('reforge');

        // Check achievement
        if (typeof Achievements !== 'undefined') {
            Achievements.checkReforgeAchievement(prefix);
        }

        // Refresh the action panel
        showTowerActions(tower);
        Display.showRangeIndicator(tower);

        return true;
    }

    /**
     * Sell the selected tower
     */
    function sellTower(tower) {
        var value = Tower.sell(tower);
        Display.showMessage('Tower Sold!');
        deselectTower();
    }
    
    /**
     * Get the selected placed tower
     */
    function getSelectedTower() {
        return selectedTower;
    }
    
    // Public API
    return {
        init: init,
        selectPlacedTower: selectPlacedTower,
        deselectTower: deselectTower,
        getSelectedTower: getSelectedTower,
        hideTowerActions: hideTowerActions
    };
})();
