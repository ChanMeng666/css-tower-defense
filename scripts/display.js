/**
 * CSS Tower Defense - Display System
 * Manages UI updates and visual feedback
 */

/**
 * Announcer class for stage-style announcements
 */
function Announcer(el) {
    var self = this;
    self.container = el;
    self.hideTimeout = null;

    /**
     * Show an announcement message
     * @param {object} message - { title, subtitle }
     * @param {boolean} autoHide - Auto-hide after delay
     * @param {number} duration - Auto-hide duration in ms
     */
    self.showMessage = function(message, autoHide, duration) {
        autoHide = autoHide !== false; // Default to true
        duration = duration || 3000;

        // Clear any pending hide
        if (self.hideTimeout) {
            clearTimeout(self.hideTimeout);
            self.hideTimeout = null;
        }

        setTitle(message.title);
        setSubtitle(message.subtitle);
        self.container.classList.add('visible');

        if (autoHide) {
            self.hideTimeout = setTimeout(function() {
                self.hideMessage();
            }, duration);
        }
    };

    /**
     * Hide the announcement
     */
    self.hideMessage = function() {
        self.container.classList.remove('visible');
        if (self.hideTimeout) {
            clearTimeout(self.hideTimeout);
            self.hideTimeout = null;
        }
    };

    function setTitle(title) {
        var titleEl = self.container.querySelector('.announcement-title');
        if (titleEl) {
            titleEl.innerHTML = (typeof title === 'undefined') ? '' : title;
        }
    }

    function setSubtitle(subtitle) {
        var subtitleEl = self.container.querySelector('.announcement-subtitle');
        if (subtitleEl) {
            subtitleEl.innerHTML = (typeof subtitle === 'undefined') ? '' : subtitle;
        }
    }
}

var Display = (function() {
    'use strict';

    // DOM elements cache
    var elements = {};
    var messageTimeout = null;
    var announcer = null;
    
    /**
     * Initialize the display system
     */
    function init() {
        // Cache DOM elements
        elements.startScreen = document.getElementById('startScreen');
        elements.gameOverScreen = document.getElementById('gameOverScreen');
        elements.gameOverTitle = document.getElementById('gameOverTitle');
        elements.finalScore = document.getElementById('finalScore');
        elements.gameUI = document.getElementById('gameUI');
        elements.lives = document.getElementById('lives');
        elements.gold = document.getElementById('gold');
        elements.wave = document.getElementById('wave');
        elements.totalWaves = document.getElementById('totalWaves');
        elements.score = document.getElementById('score');
        elements.startWaveBtn = document.getElementById('startWaveBtn');
        elements.shopPanel = document.getElementById('shopPanel');
        elements.towerOptions = document.querySelectorAll('.tower-option');
        elements.announcer = document.getElementById('announcer');

        // Initialize announcer
        if (elements.announcer) {
            announcer = new Announcer(elements.announcer);
        }

        // Create message element
        createMessageElement();
    }
    
    /**
     * Create the floating message element
     */
    function createMessageElement() {
        var msg = document.createElement('div');
        msg.id = 'gameMessage';
        msg.className = 'game-message';
        msg.style.cssText = 'position: fixed; top: 20%; left: 50%; transform: translateX(-50%); ' +
                           'background: rgba(0,0,0,0.8); color: #FFD700; padding: 15px 30px; ' +
                           'border-radius: 10px; font-size: 1.5rem; font-weight: bold; ' +
                           'z-index: 1000; opacity: 0; transition: opacity 0.3s ease; ' +
                           'pointer-events: none; text-align: center;';
        document.body.appendChild(msg);
        elements.message = msg;
    }
    
    /**
     * Update gold display
     */
    function updateGold(amount) {
        if (elements.gold) {
            elements.gold.textContent = amount;
            
            // Flash effect
            elements.gold.style.transform = 'scale(1.2)';
            setTimeout(function() {
                elements.gold.style.transform = 'scale(1)';
            }, 150);
        }
        
        // Update tower affordability
        updateTowerAffordability();
    }
    
    /**
     * Update lives display
     */
    function updateLives(amount) {
        if (elements.lives) {
            elements.lives.textContent = amount;
            
            // Flash red if low
            if (amount <= 5) {
                elements.lives.style.color = '#F44336';
            } else {
                elements.lives.style.color = '';
            }
        }
    }
    
    /**
     * Update wave display
     */
    function updateWave(current, total) {
        if (elements.wave) {
            elements.wave.textContent = current;
        }
        if (elements.totalWaves) {
            elements.totalWaves.textContent = total;
        }
        
        // Update wave button
        updateWaveButton();
    }
    
    /**
     * Update score display
     */
    function updateScore(amount) {
        if (elements.score) {
            elements.score.textContent = amount;
        }
    }
    
    /**
     * Update wave start button state
     */
    function updateWaveButton() {
        if (!elements.startWaveBtn) return;
        
        if (Wave.isWaveInProgress()) {
            elements.startWaveBtn.disabled = true;
            elements.startWaveBtn.textContent = 'Wave in Progress...';
        } else if (Wave.getCurrentWave() > Wave.getTotalWaves()) {
            elements.startWaveBtn.disabled = true;
            elements.startWaveBtn.textContent = 'All Waves Complete!';
        } else {
            elements.startWaveBtn.disabled = false;
            elements.startWaveBtn.textContent = 'Start Wave ' + Wave.getCurrentWave();
        }
    }
    
    /**
     * Update tower affordability in shop
     */
    function updateTowerAffordability() {
        elements.towerOptions.forEach(function(option) {
            var type = option.dataset.tower;
            var cost = parseInt(option.dataset.cost);
            
            if (Game.getGold() >= cost) {
                option.classList.remove('disabled');
            } else {
                option.classList.add('disabled');
            }
        });
    }
    
    /**
     * Select a tower type in the shop
     */
    function selectTower(type) {
        elements.towerOptions.forEach(function(option) {
            if (option.dataset.tower === type) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }
    
    /**
     * Show a floating message
     */
    function showMessage(text, duration) {
        if (!elements.message) return;
        
        duration = duration || 2000;
        
        // Clear existing timeout
        if (messageTimeout) {
            clearTimeout(messageTimeout);
        }
        
        // Show message
        elements.message.textContent = text;
        elements.message.style.opacity = '1';
        
        // Hide after duration
        messageTimeout = setTimeout(function() {
            elements.message.style.opacity = '0';
        }, duration);
    }
    
    /**
     * Show start screen
     */
    function showStartScreen() {
        if (elements.startScreen) {
            elements.startScreen.classList.remove('hidden');
        }
    }
    
    /**
     * Hide start screen
     */
    function hideStartScreen() {
        if (elements.startScreen) {
            elements.startScreen.classList.add('hidden');
        }
    }
    
    /**
     * Show game over screen
     */
    function showGameOverScreen(isVictory, score) {
        if (elements.gameOverScreen) {
            elements.gameOverScreen.classList.remove('hidden');
            
            if (elements.gameOverTitle) {
                if (isVictory) {
                    elements.gameOverTitle.textContent = 'Victory!';
                    elements.gameOverTitle.classList.add('victory');
                } else {
                    elements.gameOverTitle.textContent = 'Game Over';
                    elements.gameOverTitle.classList.remove('victory');
                }
            }
            
            if (elements.finalScore) {
                elements.finalScore.textContent = score;
            }
        }
    }
    
    /**
     * Hide game over screen
     */
    function hideGameOverScreen() {
        if (elements.gameOverScreen) {
            elements.gameOverScreen.classList.add('hidden');
        }
    }
    
    /**
     * Show game UI
     */
    function showGameUI() {
        if (elements.gameUI) {
            elements.gameUI.classList.remove('hidden');
        }
        updateWaveButton();
        updateTowerAffordability();
    }
    
    /**
     * Hide game UI
     */
    function hideGameUI() {
        if (elements.gameUI) {
            elements.gameUI.classList.add('hidden');
        }
    }
    
    /**
     * Highlight a cell for tower placement
     */
    function highlightCell(x, y, isValid) {
        var cell = document.querySelector('.cell[data-x="' + x + '"][data-y="' + y + '"]');
        if (cell) {
            cell.classList.remove('valid-placement', 'invalid-placement');
            if (isValid) {
                cell.classList.add('valid-placement');
            } else {
                cell.classList.add('invalid-placement');
            }
        }
    }
    
    /**
     * Clear cell highlights
     */
    function clearHighlights() {
        var cells = document.querySelectorAll('.cell.valid-placement, .cell.invalid-placement');
        cells.forEach(function(cell) {
            cell.classList.remove('valid-placement', 'invalid-placement');
        });
    }
    
    /**
     * Show range indicator for a tower
     */
    function showRangeIndicator(tower) {
        hideRangeIndicator();

        var indicator = document.createElement('div');
        indicator.className = 'range-indicator';

        // Add tower type class for color styling
        if (tower.type) {
            indicator.classList.add('range-' + tower.type);
        }

        indicator.id = 'rangeIndicator';

        var size = tower.range * 2;
        indicator.style.width = size + 'px';
        indicator.style.height = size + 'px';

        var mapWidth = Path.GRID_COLS * Path.CELL_SIZE;
        var mapHeight = Path.GRID_ROWS * Path.CELL_SIZE;

        indicator.style.left = (tower.x + mapWidth / 2) + 'px';
        indicator.style.top = (tower.y + mapHeight / 2) + 'px';

        // Apply 3D perspective transform to match the map rotation
        // The map is rotated 55deg on X-axis, so we need to counter-rotate the indicator
        // to make it appear flat on the ground
        indicator.style.transform = 'translate(-50%, -50%) rotateX(55deg)';
        indicator.style.transformOrigin = 'center center';

        document.getElementById('map').appendChild(indicator);
    }
    
    /**
     * Hide range indicator
     */
    function hideRangeIndicator() {
        var indicator = document.getElementById('rangeIndicator');
        if (indicator) {
            indicator.parentNode.removeChild(indicator);
        }
    }

    /**
     * Show a stage-style announcement
     * @param {string} title - Main title text
     * @param {string} subtitle - Subtitle text
     * @param {number} duration - Display duration in ms (default 3000)
     */
    function showAnnouncement(title, subtitle, duration) {
        if (announcer) {
            announcer.showMessage({
                title: title,
                subtitle: subtitle
            }, true, duration || 3000);
        } else {
            // Fallback to regular message if announcer not available
            showMessage(title + (subtitle ? ' - ' + subtitle : ''), duration || 3000);
        }
    }

    /**
     * Hide the current announcement
     */
    function hideAnnouncement() {
        if (announcer) {
            announcer.hideMessage();
        }
    }

    // Public API
    return {
        init: init,
        updateGold: updateGold,
        updateLives: updateLives,
        updateWave: updateWave,
        updateScore: updateScore,
        updateWaveButton: updateWaveButton,
        updateTowerAffordability: updateTowerAffordability,
        selectTower: selectTower,
        showMessage: showMessage,
        showStartScreen: showStartScreen,
        hideStartScreen: hideStartScreen,
        showGameOverScreen: showGameOverScreen,
        hideGameOverScreen: hideGameOverScreen,
        showGameUI: showGameUI,
        hideGameUI: hideGameUI,
        highlightCell: highlightCell,
        clearHighlights: clearHighlights,
        showRangeIndicator: showRangeIndicator,
        hideRangeIndicator: hideRangeIndicator,
        showAnnouncement: showAnnouncement,
        hideAnnouncement: hideAnnouncement
    };
})();
