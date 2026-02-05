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

        // Init auth first, then game (session check is async but non-blocking)
        if (typeof Auth !== 'undefined') {
            Auth.init();
        }

        Game.init();

        // Setup event listeners
        setupStartScreen();
        setupRestartButton();
        setupWaveButton();
        setupMapInteraction();
        setupKeyboardControls();
        setupSaveLoad();

        // Load leaderboard preview on start screen
        loadLeaderboardPreview();

        // Show/hide save button based on auth state
        document.addEventListener('authStateChanged', function(e) {
            var saveGameBtn = document.getElementById('saveGameBtn');
            if (saveGameBtn) {
                if (e.detail && e.detail.user) {
                    saveGameBtn.classList.remove('hidden');
                } else {
                    saveGameBtn.classList.add('hidden');
                }
            }
        });

        console.log('CSS Tower Defense initialized!');
    });

    /**
     * Setup unified start screen (combines loading and start)
     */
    function setupStartScreen() {
        var loadingScreen = document.getElementById('loadingScreen');
        var startBtn = document.getElementById('startBtn');

        if (!loadingScreen || !startBtn) return;

        // Start menu music after user interaction (for autoplay policy)
        var musicStarted = false;
        function startMenuMusic() {
            if (!musicStarted) {
                musicStarted = true;
                Sfx.playMusic('menu');
            }
        }

        // Start music on any click
        loadingScreen.addEventListener('click', startMenuMusic, { once: true });

        // Difficulty selection
        var difficultyBtns = document.querySelectorAll('.difficulty-btn');
        difficultyBtns.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                // Remove selected from all
                difficultyBtns.forEach(function(b) { b.classList.remove('selected'); });
                // Add selected to clicked
                btn.classList.add('selected');
                // Set difficulty in game
                Game.setDifficulty(btn.dataset.difficulty);
                Sfx.playEffect('button');
            });
        });

        // Start game when clicking the button
        startBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            Sfx.playEffect('button');
            loadingScreen.classList.add('hidden');
            Game.start();
        });
    }
    
    /**
     * Setup restart button
     */
    function setupRestartButton() {
        var restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', function() {
                Sfx.playEffect('button');
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
                Sfx.playEffect('ready');
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
                    var success = Game.placeTower(gridX, gridY);
                    Display.clearHighlights();
                    // If placement failed (e.g., not enough gold), selection is already cleared by placeTower
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
                Display.hidePlacementRange();
                hoveredCell = cell;

                if (cell && Game.getSelectedTowerType()) {
                    var gridX = parseInt(cell.dataset.x);
                    var gridY = parseInt(cell.dataset.y);
                    var canBuild = Path.canBuild(gridX, gridY);
                    Display.highlightCell(gridX, gridY, canBuild);

                    // Show range preview
                    var towerType = Tower.getType(Game.getSelectedTowerType());
                    if (towerType) {
                        Display.showPlacementRange(gridX, gridY, towerType.range, Game.getSelectedTowerType());
                    }
                }
            }
        });
        
        // Mouseleave to clear highlights
        map.addEventListener('mouseleave', function() {
            Display.clearHighlights();
            Display.hidePlacementRange();
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
                    }
                    break;
                    
                // Mute (M key)
                case 'm':
                    var muted = Sfx.toggleMute();
                    Display.showMessage(muted ? 'Sound Off' : 'Sound On');
                    break;

                // Leaderboard (L key)
                case 'l':
                    showLeaderboardModal();
                    break;
            }
        });
    }
    
    /**
     * Load leaderboard preview on start screen
     */
    function loadLeaderboardPreview() {
        if (typeof API === 'undefined') return;

        var listEl = document.getElementById('leaderboardList');
        if (!listEl) return;

        API.getLeaderboard('normal', 10, 0)
            .then(function(data) {
                if (!data || !data.entries || data.entries.length === 0) {
                    listEl.innerHTML = '<div class="leaderboard-loading">No scores yet. Be the first!</div>';
                    return;
                }

                listEl.innerHTML = '';
                data.entries.forEach(function(entry) {
                    var row = document.createElement('div');
                    row.className = 'leaderboard-row';
                    row.innerHTML =
                        '<span class="leaderboard-rank">#' + entry.rank + '</span>' +
                        '<span class="leaderboard-name">' + escapeHtml(entry.displayName) + '</span>' +
                        '<span class="leaderboard-score">' + entry.score + '</span>';
                    listEl.appendChild(row);
                });
            })
            .catch(function() {
                listEl.innerHTML = '<div class="leaderboard-loading">Leaderboard unavailable</div>';
            });
    }

    /**
     * Escape HTML for safe display
     */
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Setup save/load functionality
     */
    function setupSaveLoad() {
        // Create save/load button on start screen
        var loadingScreen = document.getElementById('loadingScreen');
        if (!loadingScreen) return;

        var saveLoadBtn = document.createElement('button');
        saveLoadBtn.className = 'auth-btn hidden';
        saveLoadBtn.id = 'saveLoadBtn';
        saveLoadBtn.textContent = 'Load Game';
        saveLoadBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showSaveLoadModal();
        });

        var authContainer = document.getElementById('authContainer');
        if (authContainer) {
            authContainer.appendChild(saveLoadBtn);
        }

        // In-game save button
        var saveGameBtn = document.getElementById('saveGameBtn');
        if (saveGameBtn) {
            saveGameBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (Game.getState() === Game.STATES.PLAYING && typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
                    quickSave(0);
                }
            });
        }

        // In-game save button (keyboard shortcut: F5)
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F5' && Game.getState() === Game.STATES.PLAYING && typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
                e.preventDefault();
                quickSave(0);
            }
            if (e.key === 'F9' && Game.getState() === Game.STATES.PLAYING && typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
                e.preventDefault();
                quickLoad(0);
            }
        });
    }

    /**
     * Quick save to slot 0
     */
    function quickSave(slot) {
        if (typeof API === 'undefined' || typeof Game === 'undefined') return;

        var state = Game.getGameStateForSave();
        API.saveGame(slot, state).then(function(result) {
            if (result) {
                Display.showMessage('Game Saved!');
                Sfx.play('powerup');
            }
        });
    }

    /**
     * Quick load from slot 0
     */
    function quickLoad(slot) {
        if (typeof API === 'undefined') return;

        API.getSaves().then(function(result) {
            if (result && result.saves && result.saves[slot]) {
                Game.loadFromSave(result.saves[slot]);
                Display.showMessage('Game Loaded!');
            } else {
                Display.showMessage('No save in slot ' + (slot + 1));
            }
        });
    }

    /**
     * Show save/load modal
     */
    function showSaveLoadModal() {
        if (typeof API === 'undefined') return;

        // Create or update modal
        var existing = document.getElementById('saveLoadModal');
        if (existing) existing.parentNode.removeChild(existing);

        var modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.id = 'saveLoadModal';
        modal.innerHTML =
            '<div class="auth-modal-content save-load-content">' +
                '<h2 class="auth-modal-title">Load Game</h2>' +
                '<div class="save-slots" id="saveSlots">' +
                    '<div class="save-slot-loading">Loading saves...</div>' +
                '</div>' +
                '<button class="auth-close" id="saveLoadClose">&times;</button>' +
            '</div>';
        document.body.appendChild(modal);

        document.getElementById('saveLoadClose').addEventListener('click', function() {
            modal.parentNode.removeChild(modal);
        });

        // Load saves
        API.getSaves().then(function(result) {
            var slotsEl = document.getElementById('saveSlots');
            if (!slotsEl) return;
            slotsEl.innerHTML = '';

            if (!result || !result.saves) {
                slotsEl.innerHTML = '<div class="save-slot-empty">Could not load saves</div>';
                return;
            }

            for (var i = 0; i < 3; i++) {
                var save = result.saves[i];
                var slotEl = document.createElement('div');
                slotEl.className = 'save-slot' + (save ? '' : ' save-slot-empty');

                if (save) {
                    slotEl.innerHTML =
                        '<div class="save-slot-name">' + (save.saveName || 'Save ' + (i + 1)) + '</div>' +
                        '<div class="save-slot-info">' +
                            'Wave ' + save.currentWave + ' | ' +
                            'Score: ' + save.score + ' | ' +
                            save.difficulty +
                        '</div>' +
                        '<div class="save-slot-actions">' +
                            '<button class="save-slot-btn load-btn" data-slot="' + i + '">Load</button>' +
                            '<button class="save-slot-btn delete-btn" data-slot="' + i + '">Delete</button>' +
                        '</div>';
                } else {
                    slotEl.innerHTML =
                        '<div class="save-slot-name">Slot ' + (i + 1) + '</div>' +
                        '<div class="save-slot-info">Empty</div>';
                }

                slotsEl.appendChild(slotEl);
            }

            // Wire up load buttons
            slotsEl.querySelectorAll('.load-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var slot = parseInt(btn.dataset.slot);
                    modal.parentNode.removeChild(modal);
                    quickLoad(slot);
                    // Hide start screen
                    var ls = document.getElementById('loadingScreen');
                    if (ls) ls.classList.add('hidden');
                });
            });

            // Wire up delete buttons
            slotsEl.querySelectorAll('.delete-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var slot = parseInt(btn.dataset.slot);
                    API.deleteSave(slot).then(function() {
                        showSaveLoadModal(); // Refresh
                    });
                });
            });
        });
    }

    /**
     * Show full leaderboard modal with difficulty tabs
     */
    function showLeaderboardModal() {
        if (typeof API === 'undefined') return;

        var existing = document.getElementById('leaderboardModal');
        if (existing) existing.parentNode.removeChild(existing);

        var modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.id = 'leaderboardModal';
        modal.innerHTML =
            '<div class="auth-modal-content save-load-content">' +
                '<h2 class="auth-modal-title">Leaderboard</h2>' +
                '<div class="lb-tabs">' +
                    '<button class="lb-tab selected" data-diff="normal">Normal</button>' +
                    '<button class="lb-tab" data-diff="hard">Hard</button>' +
                    '<button class="lb-tab" data-diff="expert">Expert</button>' +
                '</div>' +
                '<div class="leaderboard-list lb-full-list" id="lbFullList">' +
                    '<div class="leaderboard-loading">Loading...</div>' +
                '</div>' +
                '<div class="lb-my-rank" id="lbMyRank"></div>' +
                '<button class="auth-close" id="lbClose">&times;</button>' +
            '</div>';
        document.body.appendChild(modal);

        document.getElementById('lbClose').addEventListener('click', function() {
            modal.parentNode.removeChild(modal);
        });

        var tabs = modal.querySelectorAll('.lb-tab');
        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                tabs.forEach(function(t) { t.classList.remove('selected'); });
                tab.classList.add('selected');
                loadLeaderboardData(tab.dataset.diff);
            });
        });

        loadLeaderboardData('normal');
    }

    function loadLeaderboardData(difficulty) {
        var listEl = document.getElementById('lbFullList');
        var rankEl = document.getElementById('lbMyRank');
        if (!listEl) return;

        listEl.innerHTML = '<div class="leaderboard-loading">Loading...</div>';
        if (rankEl) rankEl.innerHTML = '';

        API.getLeaderboard(difficulty, 50, 0)
            .then(function(data) {
                if (!data || !data.entries || data.entries.length === 0) {
                    listEl.innerHTML = '<div class="leaderboard-loading">No scores yet</div>';
                    return;
                }

                listEl.innerHTML = '';
                data.entries.forEach(function(entry) {
                    var row = document.createElement('div');
                    row.className = 'leaderboard-row';
                    row.innerHTML =
                        '<span class="leaderboard-rank">#' + entry.rank + '</span>' +
                        '<span class="leaderboard-name">' + escapeHtml(entry.displayName) + '</span>' +
                        '<span class="leaderboard-score">' + entry.score + '</span>';
                    listEl.appendChild(row);
                });
            })
            .catch(function() {
                listEl.innerHTML = '<div class="leaderboard-loading">Failed to load</div>';
            });

        // Show my rank if logged in
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            API.getMyRank(difficulty).then(function(data) {
                if (data && data.rank && rankEl) {
                    rankEl.innerHTML = '<div class="lb-my-rank-text">Your rank: <strong>#' + data.rank + '</strong></div>';
                }
            });
        }
    }

    /**
     * Show player stats dashboard
     */
    function showStatsModal() {
        if (typeof API === 'undefined' || typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;

        var existing = document.getElementById('statsModal');
        if (existing) existing.parentNode.removeChild(existing);

        var modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.id = 'statsModal';
        modal.innerHTML =
            '<div class="auth-modal-content save-load-content">' +
                '<h2 class="auth-modal-title">My Stats</h2>' +
                '<div id="statsContent"><div class="leaderboard-loading">Loading...</div></div>' +
                '<button class="auth-close" id="statsClose">&times;</button>' +
            '</div>';
        document.body.appendChild(modal);

        document.getElementById('statsClose').addEventListener('click', function() {
            modal.parentNode.removeChild(modal);
        });

        API.getMyStats().then(function(data) {
            var content = document.getElementById('statsContent');
            if (!content || !data) {
                if (content) content.innerHTML = '<div class="leaderboard-loading">No stats yet</div>';
                return;
            }

            var s = data.stats;
            content.innerHTML =
                '<div class="stats-grid">' +
                    '<div class="stat-card">' +
                        '<div class="stat-card-label">Games Played</div>' +
                        '<div class="stat-card-value">' + s.totalGames + '</div>' +
                    '</div>' +
                    '<div class="stat-card">' +
                        '<div class="stat-card-label">Win Rate</div>' +
                        '<div class="stat-card-value">' + s.winRate + '%</div>' +
                    '</div>' +
                    '<div class="stat-card">' +
                        '<div class="stat-card-label">Best Score</div>' +
                        '<div class="stat-card-value">' + s.maxScore + '</div>' +
                    '</div>' +
                    '<div class="stat-card">' +
                        '<div class="stat-card-label">Avg Score</div>' +
                        '<div class="stat-card-value">' + s.avgScore + '</div>' +
                    '</div>' +
                '</div>';

            // Recent games
            if (data.recentGames && data.recentGames.length > 0) {
                var recentHtml = '<h3 style="color:#F2D864;font-family:Bangers;margin:15px 0 8px;">Recent Games</h3>';
                data.recentGames.forEach(function(g) {
                    var outcomeColor = g.outcome === 'victory' ? '#5EA65E' : '#E8635A';
                    recentHtml +=
                        '<div class="leaderboard-row">' +
                            '<span style="color:' + outcomeColor + ';width:60px;">' + g.outcome + '</span>' +
                            '<span class="leaderboard-name">Wave ' + g.waveReached + '</span>' +
                            '<span class="leaderboard-score">' + g.score + '</span>' +
                        '</div>';
                });
                content.innerHTML += recentHtml;
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
     * Handle window focus (auto-resume)
     */
    window.addEventListener('focus', function() {
        if (Game.getState() === Game.STATES.PAUSED) {
            Game.resume();
        }
    });
    
    /**
     * Prevent context menu on game area
     */
    document.addEventListener('contextmenu', function(e) {
        if (e.target.closest('.map')) {
            e.preventDefault();
        }
    });
    
})();
