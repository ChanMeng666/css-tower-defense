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
        elements.loadingScreen = document.getElementById('loadingScreen');
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
                           'color: #FFD700; padding: 15px 30px; ' +
                           'font-size: 1.5rem; font-weight: bold; ' +
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
     * Show start screen (unified loading/start screen)
     */
    function showStartScreen() {
        if (elements.loadingScreen) {
            elements.loadingScreen.classList.remove('hidden');
        }
    }

    /**
     * Hide start screen (unified loading/start screen)
     */
    function hideStartScreen() {
        if (elements.loadingScreen) {
            elements.loadingScreen.classList.add('hidden');
        }
    }
    
    /**
     * Format duration in seconds to M:SS or H:MM:SS
     */
    function formatDuration(seconds) {
        var mins = Math.floor(seconds / 60);
        var secs = seconds % 60;
        if (mins >= 60) {
            var hrs = Math.floor(mins / 60);
            mins = mins % 60;
            return hrs + ':' + (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
        }
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    /**
     * Show game over screen with optional stats
     */
    function showGameOverScreen(isVictory, score, stats) {
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

            // Populate post-game stats grid
            if (stats) {
                var goStats = document.getElementById('gameOverStats');
                if (goStats) goStats.classList.remove('hidden');

                var goWaves = document.getElementById('goWaves');
                var goEnemies = document.getElementById('goEnemies');
                var goTowers = document.getElementById('goTowers');
                var goGold = document.getElementById('goGold');
                var goDuration = document.getElementById('goDuration');
                var goRank = document.getElementById('goRank');

                if (goWaves) goWaves.textContent = stats.waveReached || '-';
                if (goEnemies) goEnemies.textContent = stats.enemiesKilled || '0';
                if (goTowers) goTowers.textContent = stats.towersBuilt || '0';
                if (goGold) goGold.textContent = stats.goldEarned || '0';
                if (goDuration) goDuration.textContent = stats.durationSeconds ? formatDuration(stats.durationSeconds) : '-';
                if (goRank) goRank.textContent = '-';
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

        // Center the indicator - no rotateX needed since parent map is already rotated
        indicator.style.transform = 'translate(-50%, -50%)';
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
     * Show range preview when placing a tower
     * @param {number} gridX - Grid X position
     * @param {number} gridY - Grid Y position
     * @param {number} range - Tower range in pixels
     * @param {string} towerType - Tower type for color styling
     */
    function showPlacementRange(gridX, gridY, range, towerType) {
        hidePlacementRange();

        var indicator = document.createElement('div');
        indicator.className = 'range-indicator placement-range';
        indicator.id = 'placementRange';

        // Add tower type class for color styling
        if (towerType) {
            indicator.classList.add('range-' + towerType);
        }

        var size = range * 2;
        indicator.style.width = size + 'px';
        indicator.style.height = size + 'px';

        // Convert grid to world position
        var worldPos = Path.gridToWorld(gridX, gridY);
        var mapWidth = Path.GRID_COLS * Path.CELL_SIZE;
        var mapHeight = Path.GRID_ROWS * Path.CELL_SIZE;

        indicator.style.left = (worldPos.x + mapWidth / 2) + 'px';
        indicator.style.top = (worldPos.y + mapHeight / 2) + 'px';

        // Center the indicator - no rotateX needed since parent map is already rotated
        indicator.style.transform = 'translate(-50%, -50%)';
        indicator.style.transformOrigin = 'center center';

        document.getElementById('map').appendChild(indicator);
    }

    /**
     * Hide placement range preview
     */
    function hidePlacementRange() {
        var indicator = document.getElementById('placementRange');
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

    /**
     * Show combo display
     */
    function showCombo(count, bonus) {
        var comboEl = document.getElementById('comboDisplay');
        if (!comboEl) {
            comboEl = document.createElement('div');
            comboEl.id = 'comboDisplay';
            comboEl.className = 'combo-display';
            document.body.appendChild(comboEl);
        }

        comboEl.innerHTML = '<div class="combo-count">' + count + 'x</div>' +
                           '<div class="combo-label">COMBO!</div>';
        comboEl.classList.add('active');

        // Scale animation based on combo size
        var scale = Math.min(1 + (count - 3) * 0.1, 1.5);
        comboEl.style.transform = 'translateX(-50%) scale(' + scale + ')';
    }

    /**
     * Hide combo display
     */
    function hideCombo() {
        var comboEl = document.getElementById('comboDisplay');
        if (comboEl) {
            comboEl.classList.remove('active');
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type: 'info', 'success', 'error'
     */
    function showToast(message, type) {
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + (type || 'info');
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(function() {
            toast.classList.add('show');
        }, 10);

        // Remove after 3 seconds
        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() {
                if (toast.parentNode) toast.remove();
            }, 300);
        }, 3000);
    }

    // =========================================
    // Environment Bar
    // =========================================

    // SVG icon paths for environment indicators
    var ENV_ICONS = {
        sun: '<circle cx="12" cy="12" r="5" fill="#F2D864" stroke="#1A1614" stroke-width="1.5"/>' +
             '<line x1="12" y1="2" x2="12" y2="5" stroke="#F2D864" stroke-width="2" stroke-linecap="round"/>' +
             '<line x1="12" y1="19" x2="12" y2="22" stroke="#F2D864" stroke-width="2" stroke-linecap="round"/>' +
             '<line x1="2" y1="12" x2="5" y2="12" stroke="#F2D864" stroke-width="2" stroke-linecap="round"/>' +
             '<line x1="19" y1="12" x2="22" y2="12" stroke="#F2D864" stroke-width="2" stroke-linecap="round"/>',
        moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#E8E0D8" stroke="#1A1614" stroke-width="1.5"/>',
        clear: '<circle cx="12" cy="12" r="5" fill="#F2D864" stroke="#1A1614" stroke-width="1.5"/>' +
               '<line x1="12" y1="3" x2="12" y2="6" stroke="#F2D864" stroke-width="1.5" stroke-linecap="round"/>' +
               '<line x1="12" y1="18" x2="12" y2="21" stroke="#F2D864" stroke-width="1.5" stroke-linecap="round"/>',
        rain: '<path d="M4 14h.01M8 14h.01" stroke="#4A90C4" stroke-width="2" stroke-linecap="round"/>' +
              '<path d="M20 10a4 4 0 0 0-8 0 3 3 0 0 0-3 3h14a3 3 0 0 0-3-3z" fill="#A0AAB4" stroke="#1A1614" stroke-width="1.5"/>' +
              '<line x1="8" y1="17" x2="7" y2="21" stroke="#4A90C4" stroke-width="1.5" stroke-linecap="round"/>' +
              '<line x1="14" y1="17" x2="13" y2="21" stroke="#4A90C4" stroke-width="1.5" stroke-linecap="round"/>',
        snow: '<circle cx="12" cy="12" r="2" fill="#FFF8F0" stroke="#4A90C4" stroke-width="1"/>' +
              '<line x1="12" y1="4" x2="12" y2="20" stroke="#4A90C4" stroke-width="1.5"/>' +
              '<line x1="5" y1="8" x2="19" y2="16" stroke="#4A90C4" stroke-width="1.5"/>' +
              '<line x1="5" y1="16" x2="19" y2="8" stroke="#4A90C4" stroke-width="1.5"/>',
        wind: '<path d="M5 12h14M5 8h10a3 3 0 0 0 0-6M5 16h8a3 3 0 0 1 0 6" fill="none" stroke="#A0AAB4" stroke-width="2" stroke-linecap="round"/>',
        summer: '<circle cx="12" cy="12" r="6" fill="#F2D864" stroke="#E88A42" stroke-width="2"/>',
        autumn: '<path d="M12 2C9 7 5 10 5 14a7 7 0 0 0 14 0c0-4-4-7-7-12z" fill="#D4884A" stroke="#1A1614" stroke-width="1.5"/>',
        winter: '<circle cx="12" cy="12" r="2" fill="#FFF8F0"/>' +
                '<line x1="12" y1="3" x2="12" y2="21" stroke="#4A90C4" stroke-width="1.5"/>' +
                '<line x1="4" y1="7.5" x2="20" y2="16.5" stroke="#4A90C4" stroke-width="1.5"/>' +
                '<line x1="4" y1="16.5" x2="20" y2="7.5" stroke="#4A90C4" stroke-width="1.5"/>',
        spring: '<circle cx="12" cy="12" r="4" fill="#F2D864" stroke="#1A1614" stroke-width="1"/>' +
                '<ellipse cx="12" cy="5" rx="3" ry="2" fill="#E8635A" stroke="#1A1614" stroke-width="0.8"/>' +
                '<ellipse cx="18" cy="10" rx="3" ry="2" fill="#E8635A" stroke="#1A1614" stroke-width="0.8" transform="rotate(60 18 10)"/>' +
                '<ellipse cx="16" cy="17" rx="3" ry="2" fill="#E8635A" stroke="#1A1614" stroke-width="0.8" transform="rotate(120 16 17)"/>' +
                '<ellipse cx="8" cy="17" rx="3" ry="2" fill="#E8635A" stroke="#1A1614" stroke-width="0.8" transform="rotate(60 8 17)"/>' +
                '<ellipse cx="6" cy="10" rx="3" ry="2" fill="#E8635A" stroke="#1A1614" stroke-width="0.8" transform="rotate(120 6 10)"/>'
    };

    /**
     * Update the environment bar with current conditions
     */
    function updateEnvironment() {
        var timeIcon = document.getElementById('envTimeIcon');
        var timeLabel = document.getElementById('envTimeLabel');
        var weatherIcon = document.getElementById('envWeatherIcon');
        var weatherLabel = document.getElementById('envWeatherLabel');
        var seasonIcon = document.getElementById('envSeasonIcon');
        var seasonLabel = document.getElementById('envSeasonLabel');
        var envEvent = document.getElementById('envEvent');
        var envEventLabel = document.getElementById('envEventLabel');
        var timePill = document.getElementById('envTime');
        var weatherPill = document.getElementById('envWeather');
        var seasonPill = document.getElementById('envSeason');

        // Time of day
        if (timeIcon && timeLabel) {
            var isNight = (typeof Weather !== 'undefined' && Weather.isNight) ? Weather.isNight() : false;
            timeIcon.innerHTML = isNight ? ENV_ICONS.moon : ENV_ICONS.sun;
            timeLabel.textContent = isNight ? 'Night' : 'Day';
        }

        // Weather
        if (weatherIcon && weatherLabel) {
            var weather = (typeof Weather !== 'undefined' && Weather.getCurrentWeather) ? Weather.getCurrentWeather() : 'clear';
            weatherIcon.innerHTML = ENV_ICONS[weather] || ENV_ICONS.clear;
            weatherLabel.textContent = weather.charAt(0).toUpperCase() + weather.slice(1);
        }

        // Season
        if (seasonIcon && seasonLabel) {
            var season = (typeof Seasons !== 'undefined' && Seasons.getCurrentSeason) ? Seasons.getCurrentSeason() : 'summer';
            var seasonName = (typeof Seasons !== 'undefined' && Seasons.getSeasonName) ? Seasons.getSeasonName() : 'Summer';
            seasonIcon.innerHTML = ENV_ICONS[season] || ENV_ICONS.summer;
            seasonLabel.textContent = seasonName;
        }

        // Special event
        if (envEvent && envEventLabel) {
            var activeEvt = (typeof Wave !== 'undefined' && Wave.getActiveEvent) ? Wave.getActiveEvent() : null;
            var isBloodMoon = (typeof Weather !== 'undefined' && Weather.isBloodMoon) ? Weather.isBloodMoon() : false;
            if (isBloodMoon || (activeEvt && activeEvt.type === 'bloodMoon')) {
                envEvent.classList.remove('hidden');
                envEventLabel.textContent = 'Blood Moon';
            } else if (activeEvt && activeEvt.type === 'eliteSwarm') {
                envEvent.classList.remove('hidden');
                envEventLabel.textContent = 'Elite Swarm';
            } else if (activeEvt && activeEvt.type === 'luckyStar') {
                envEvent.classList.remove('hidden');
                envEventLabel.textContent = 'Lucky Star';
            } else {
                envEvent.classList.add('hidden');
            }
        }
    }

    // Listen for environment change events
    document.addEventListener('waveStarted', function () {
        setTimeout(updateEnvironment, 100); // Small delay to let systems update
    });
    document.addEventListener('weatherChanged', function () {
        updateEnvironment();
    });
    document.addEventListener('seasonChanged', function () {
        updateEnvironment();
    });

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
        showPlacementRange: showPlacementRange,
        hidePlacementRange: hidePlacementRange,
        showAnnouncement: showAnnouncement,
        hideAnnouncement: hideAnnouncement,
        showCombo: showCombo,
        hideCombo: hideCombo,
        showToast: showToast,
        updateEnvironment: updateEnvironment
    };
})();
