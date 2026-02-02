/**
 * CSS Tower Defense - Controller
 * Handles user input and initializes the game
 */

(function() {
    'use strict';
    
    // Mouse state
    var mouseX = 0;
    var mouseY = 0;
    var hoveredCell = null;
    
    /**
     * Initialize everything when DOM is ready
     */
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize all systems
        Sfx.init();
        Display.init();
        Shop.init();
        Game.init();
        
        // Setup event listeners
        setupStartButton();
        setupRestartButton();
        setupWaveButton();
        setupMapInteraction();
        setupKeyboardControls();
        
        console.log('CSS Tower Defense initialized!');
    });
    
    /**
     * Setup start button
     */
    function setupStartButton() {
        var startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', function() {
                Game.start();
            });
        }
    }
    
    /**
     * Setup restart button
     */
    function setupRestartButton() {
        var restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', function() {
                Game.start();
            });
        }
    }
    
    /**
     * Setup wave start button
     */
    function setupWaveButton() {
        var waveBtn = document.getElementById('startWaveBtn');
        if (waveBtn) {
            waveBtn.addEventListener('click', function() {
                Game.startNextWave();
            });
        }
    }
    
    /**
     * Setup map interaction (cell clicking)
     */
    function setupMapInteraction() {
        var map = document.getElementById('map');
        if (!map) return;
        
        // Click handler for placing towers
        map.addEventListener('click', function(e) {
            var cell = e.target.closest('.cell');
            if (!cell) return;
            
            var gridX = parseInt(cell.dataset.x);
            var gridY = parseInt(cell.dataset.y);
            
            // If we have a tower type selected, try to place it
            if (Game.getSelectedTowerType()) {
                if (Path.canBuild(gridX, gridY)) {
                    Game.placeTower(gridX, gridY);
                    Display.clearHighlights();
                }
            } else {
                // Check if there's a tower at this location
                var tower = Tower.getAt(gridX, gridY);
                if (tower) {
                    Shop.selectPlacedTower(tower);
                } else {
                    Shop.deselectTower();
                }
            }
        });
        
        // Mousemove for hover effects
        map.addEventListener('mousemove', function(e) {
            var cell = e.target.closest('.cell');
            
            if (cell !== hoveredCell) {
                // Clear previous highlight
                Display.clearHighlights();
                hoveredCell = cell;
                
                if (cell && Game.getSelectedTowerType()) {
                    var gridX = parseInt(cell.dataset.x);
                    var gridY = parseInt(cell.dataset.y);
                    var canBuild = Path.canBuild(gridX, gridY);
                    Display.highlightCell(gridX, gridY, canBuild);
                }
            }
        });
        
        // Mouseleave to clear highlights
        map.addEventListener('mouseleave', function() {
            Display.clearHighlights();
            hoveredCell = null;
        });
        
        // Right-click to deselect tower type
        map.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            Game.selectTowerType(null);
            Shop.deselectTower();
            Display.clearHighlights();
        });
    }
    
    /**
     * Setup keyboard controls
     */
    function setupKeyboardControls() {
        document.addEventListener('keydown', function(e) {
            // Ignore if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (e.key.toLowerCase()) {
                // Tower hotkeys
                case '1':
                    Game.selectTowerType('arrow');
                    break;
                case '2':
                    Game.selectTowerType('cannon');
                    break;
                case '3':
                    Game.selectTowerType('ice');
                    break;
                case '4':
                    Game.selectTowerType('magic');
                    break;
                    
                // Cancel selection
                case 'escape':
                    Game.selectTowerType(null);
                    Shop.deselectTower();
                    Display.clearHighlights();
                    break;
                    
                // Start wave
                case ' ':
                case 'enter':
                    e.preventDefault();
                    if (Game.getState() === Game.STATES.MENU) {
                        Game.start();
                    } else if (Game.getState() === Game.STATES.PLAYING) {
                        Game.startNextWave();
                    }
                    break;
                    
                // Pause (P key)
                case 'p':
                    if (Game.getState() === Game.STATES.PLAYING) {
                        Game.pause();
                        Display.showMessage('Paused - Press P to resume');
                    } else if (Game.getState() === Game.STATES.PAUSED) {
                        Game.resume();
                        Display.showMessage('Resumed');
                    }
                    break;
                    
                // Mute (M key)
                case 'm':
                    var muted = Sfx.toggleMute();
                    Display.showMessage(muted ? 'Sound Off' : 'Sound On');
                    break;
            }
        });
    }
    
    /**
     * Track mouse position globally (for potential future use)
     */
    document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    /**
     * Handle window blur (auto-pause)
     */
    window.addEventListener('blur', function() {
        if (Game.getState() === Game.STATES.PLAYING) {
            Game.pause();
            Display.showMessage('Paused');
        }
    });
    
    /**
     * Prevent context menu on game area
     */
    document.addEventListener('contextmenu', function(e) {
        if (e.target.closest('.scene') || e.target.closest('.game-ui')) {
            e.preventDefault();
        }
    });
    
})();
