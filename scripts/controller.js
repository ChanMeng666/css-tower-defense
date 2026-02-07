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

    // Pause menu state
    var pauseMenuOpen = false;
    var autoPaused = false;
    
    /**
     * Initialize everything when DOM is ready
     */
    document.addEventListener('DOMContentLoaded', function() {
        // Clear old localStorage data (all data now comes from server)
        localStorage.removeItem('td_achievements');
        localStorage.removeItem('td_progression');
        localStorage.removeItem('towerDefenseHighScore');

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

        // Setup crafting button
        setupCraftButton();

        // Setup developer modal
        setupDeveloperModal();

        // Load leaderboard preview and daily challenge on start screen
        loadLeaderboardPreview();
        loadDailyChallenge();

        // Show/hide save button + stats button based on auth state
        document.addEventListener('authStateChanged', function(e) {
            var saveGameBtn = document.getElementById('saveGameBtn');
            var statsBtn = document.getElementById('statsBtn');
            if (e.detail && e.detail.user) {
                if (saveGameBtn) saveGameBtn.classList.remove('hidden');
                if (statsBtn) statsBtn.classList.remove('hidden');
            } else {
                if (saveGameBtn) saveGameBtn.classList.add('hidden');
                if (statsBtn) statsBtn.classList.add('hidden');
            }
        });

        // Add stats + achievements buttons to start screen auth container
        setupStartScreenButtons();

        console.log('CSS Tower Defense initialized!');
    });

    /**
     * Setup unified start screen (combines loading and start)
     */
    function setupStartScreen() {
        var loadingScreen = document.getElementById('loadingScreen');
        var startBtn = document.getElementById('startBtn');

        if (!loadingScreen || !startBtn) return;

        // Add 'ready' class after loading animation completes (2s progress bar)
        // This hides the loading dots and progress bar
        setTimeout(function() {
            loadingScreen.classList.add('ready');
        }, 2100);

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

        // Map and difficulty dropdowns
        setupMapDropdown();
        setupDifficultyDropdown();

        // More Options menu
        setupMoreOptionsMenu();

        // Start game when clicking the button
        startBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            Sfx.playEffect('button');
            requireLogin(function() {
                loadingScreen.classList.add('hidden');
                Game.start();
            });
        });
    }

    /**
     * Setup difficulty dropdown (compact replacement for 3 buttons)
     */
    function setupDifficultyDropdown() {
        var toggle = document.getElementById('difficultyToggle');
        var options = document.getElementById('difficultyOptions');
        var label = document.getElementById('difficultyLabel');

        if (!toggle || !options) return;

        // Toggle dropdown
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            var isOpen = !options.classList.contains('hidden');
            options.classList.toggle('hidden');
            toggle.classList.toggle('open', !isOpen);
            Sfx.playEffect('button');
        });

        // Select difficulty option
        options.querySelectorAll('button').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                // Update selection state
                options.querySelectorAll('button').forEach(function(b) {
                    b.classList.remove('selected');
                });
                btn.classList.add('selected');
                // Update label
                if (label) label.textContent = btn.textContent;
                // Set difficulty in game
                Game.setDifficulty(btn.dataset.difficulty);
                // Close dropdown
                options.classList.add('hidden');
                toggle.classList.remove('open');
                Sfx.playEffect('button');
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.difficulty-dropdown')) {
                options.classList.add('hidden');
                toggle.classList.remove('open');
            }
        });
    }

    /**
     * Setup map selection dropdown
     */
    function setupMapDropdown() {
        var toggle = document.getElementById('mapToggle');
        var options = document.getElementById('mapOptions');
        var label = document.getElementById('mapLabel');

        if (!toggle || !options) return;

        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            var isOpen = !options.classList.contains('hidden');
            options.classList.toggle('hidden');
            toggle.classList.toggle('open', !isOpen);
            Sfx.playEffect('button');
        });

        options.querySelectorAll('button').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                options.querySelectorAll('button').forEach(function(b) {
                    b.classList.remove('selected');
                });
                btn.classList.add('selected');
                // Extract just the map name (not the subtitle)
                var mapName = btn.childNodes[0].textContent.trim();
                if (label) label.textContent = mapName;
                // Set map in Path system
                Path.setMap(btn.dataset.map);
                options.classList.add('hidden');
                toggle.classList.remove('open');
                Sfx.playEffect('button');
            });
        });

        document.addEventListener('click', function(e) {
            if (!e.target.closest('#mapDropdown')) {
                options.classList.add('hidden');
                toggle.classList.remove('open');
            }
        });
    }

    /**
     * Setup More Options menu (consolidated secondary buttons)
     */
    function setupMoreOptionsMenu() {
        var moreBtn = document.getElementById('moreOptionsBtn');
        var moreMenu = document.getElementById('moreOptionsMenu');

        if (!moreBtn || !moreMenu) return;

        // Toggle menu
        moreBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var isOpen = !moreMenu.classList.contains('hidden');
            moreMenu.classList.toggle('hidden');
            moreBtn.classList.toggle('open', !isOpen);
            Sfx.playEffect('button');
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.more-options-container')) {
                moreMenu.classList.add('hidden');
                moreBtn.classList.remove('open');
            }
        });

        // Wire up menu items
        var leaderboardBtn = document.getElementById('leaderboardBtn');
        var challengeBtn = document.getElementById('challengeBtn');
        var saveLoadBtn = document.getElementById('saveLoadBtn');
        var statsBtn = document.getElementById('statsBtn');
        var achievementsBtn = document.getElementById('achievementsBtn');

        if (leaderboardBtn) {
            leaderboardBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                moreMenu.classList.add('hidden');
                moreBtn.classList.remove('open');
                showLeaderboardModal();
            });
        }

        if (saveLoadBtn) {
            saveLoadBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                moreMenu.classList.add('hidden');
                moreBtn.classList.remove('open');
                showSaveLoadModal();
            });
        }

        if (statsBtn) {
            statsBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                moreMenu.classList.add('hidden');
                moreBtn.classList.remove('open');
                showStatsModal();
            });
        }

        if (achievementsBtn) {
            achievementsBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                moreMenu.classList.add('hidden');
                moreBtn.classList.remove('open');
                showAchievementGallery();
            });
        }

        // Settings button
        var settingsMenuBtn = document.getElementById('settingsMenuBtn');
        if (settingsMenuBtn) {
            settingsMenuBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                moreMenu.classList.add('hidden');
                moreBtn.classList.remove('open');
                showSettingsPanel('menu');
            });
        }

        // Developer button
        var developerBtn = document.getElementById('developerBtn');
        if (developerBtn) {
            developerBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                moreMenu.classList.add('hidden');
                moreBtn.classList.remove('open');
                showDeveloperModal();
            });
        }

        // Challenge button is wired up separately by loadDailyChallenge()
    }

    /**
     * Show developer info modal
     */
    function showDeveloperModal() {
        var modal = document.getElementById('devModal');
        if (modal) {
            modal.classList.remove('hidden');
            Sfx.playEffect('button');
        }
    }

    /**
     * Setup developer modal close handlers
     */
    function setupDeveloperModal() {
        var modal = document.getElementById('devModal');
        var closeBtn = document.getElementById('devModalClose');

        if (!modal) return;

        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                modal.classList.add('hidden');
            });
        }

        // Click backdrop to close
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        // ESC key to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
            }
        });
    }

    /**
     * Require user to login before playing (no guest mode)
     */
    function requireLogin(callback) {
        // Skip prompt if already logged in
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            callback();
            return;
        }

        // Create modal
        var modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.id = 'loginRequiredModal';
        modal.innerHTML =
            '<div class="auth-modal-content">' +
                '<h2 class="auth-modal-title">Login Required</h2>' +
                '<p style="font-family: Comic Neue, sans-serif; color: #FFF8F0; margin-bottom: 20px; text-align: center;">' +
                    'Please sign in to play the game. Your progress will be saved to your account.' +
                '</p>' +
                '<div style="display: flex; gap: 12px; justify-content: center;">' +
                    '<button class="auth-btn" id="loginRequiredBtn">Login / Sign Up</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);

        // Login button - opens auth modal
        document.getElementById('loginRequiredBtn').addEventListener('click', function() {
            modal.remove();
            if (typeof Auth !== 'undefined' && Auth.showLoginModal) {
                Auth.showLoginModal(callback);
            }
        });

        // Clicking backdrop does nothing - must login
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

        var menuBtn = document.getElementById('returnMenuBtn');
        if (menuBtn) {
            menuBtn.addEventListener('click', function() {
                Sfx.playEffect('button');
                Game.returnToMenu();
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
                // Tower hotkeys (Māori weapons)
                case '1':
                    Game.selectTowerType('taiaha');
                    break;
                case '2':
                    Game.selectTowerType('mere');
                    break;
                case '3':
                    Game.selectTowerType('tangaroa');
                    break;
                case '4':
                    Game.selectTowerType('tohunga');
                    break;
                case '5':
                    Game.selectTowerType('tawhiri');
                    break;
                case '6':
                    Game.selectTowerType('mahuika');
                    break;
                    
                // Cancel selection or open pause menu
                case 'escape':
                    if (Game.getState() === Game.STATES.PLAYING) {
                        if (Game.getSelectedTowerType()) {
                            Game.selectTowerType(null);
                            Shop.deselectTower();
                            Display.clearHighlights();
                        } else {
                            showPauseMenu();
                        }
                    } else if (Game.getState() === Game.STATES.PAUSED && pauseMenuOpen) {
                        closePauseMenu();
                    }
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
                        showPauseMenu();
                    } else if (Game.getState() === Game.STATES.PAUSED && pauseMenuOpen) {
                        closePauseMenu();
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

                // Stats (S key - start screen only)
                case 's':
                    if (Game.getState() === Game.STATES.MENU) {
                        showStatsModal();
                    }
                    break;

                // Achievements (A key - start screen only)
                case 'a':
                    if (Game.getState() === Game.STATES.MENU) {
                        showAchievementGallery();
                    }
                    break;
            }
        });
    }
    
    /**
     * Wire leaderboard button on start screen
     * Note: Now handled in setupMoreOptionsMenu() but kept for backwards compatibility
     */
    function loadLeaderboardPreview() {
        // Leaderboard button is now in More Options menu, wired by setupMoreOptionsMenu()
    }

    /**
     * Wire daily challenge button on start screen (in More Options menu)
     */
    function loadDailyChallenge() {
        if (typeof API === 'undefined' || !API.getDailyChallenge) return;

        var btn = document.getElementById('challengeBtn');
        var moreMenu = document.getElementById('moreOptionsMenu');
        var moreBtn = document.getElementById('moreOptionsBtn');
        if (!btn) return;

        // Fetch challenge data in background
        var challengeData = null;

        API.getDailyChallenge().then(function(data) {
            if (!data || !data.challenge) return;
            challengeData = data;
            btn.classList.remove('hidden');
        }).catch(function() { /* keep hidden */ });

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            // Close More Options menu
            if (moreMenu) moreMenu.classList.add('hidden');
            if (moreBtn) moreBtn.classList.remove('open');
            if (challengeData) showChallengeModal(challengeData);
        });
    }

    /**
     * Show daily challenge in a modal
     */
    function showChallengeModal(data) {
        var existing = document.getElementById('challengeModal');
        if (existing) existing.parentNode.removeChild(existing);

        var modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.id = 'challengeModal';

        // Look up client-side template for extra details
        var clientTemplate = (typeof Challenge !== 'undefined' && Challenge.TEMPLATES) ? Challenge.TEMPLATES[data.challenge.id] : null;
        var category = (clientTemplate && clientTemplate.category) || data.challenge.category || 'constraint';
        var waveCount = clientTemplate && clientTemplate.waves ? clientTemplate.waves.length : (data.challenge.waveCount || 10);
        var timeLimit = clientTemplate ? (clientTemplate.timeLimit || null) : null;
        var scoreBonus = (clientTemplate && clientTemplate.scoreBonus) || data.challenge.scoreBonus || 1.0;

        // Category badge colors
        var catColors = {
            constraint: '#4A90C4',
            survival: '#E8635A',
            speed: '#F2D864',
            boss: '#D4A8E8',
            themed: '#5EA65E',
            economy: '#E88A42'
        };
        var catColor = catColors[category] || '#4A90C4';
        var catLabel = category.charAt(0).toUpperCase() + category.slice(1);

        // Wave count label
        var waveLabel = category === 'survival' ? 'Survival' : (category === 'boss' ? (waveCount === 1 ? 'Boss Fight' : waveCount + ' Waves') : waveCount + ' Waves');

        // Build details row
        var detailsHtml =
            '<div class="challenge-details">' +
                '<span class="challenge-category" style="background:' + catColor + ';">' + catLabel + '</span>' +
                '<span class="challenge-waves">' + waveLabel + '</span>' +
                (timeLimit ? '<span class="challenge-time-limit">' + Math.floor(timeLimit / 60) + ' min</span>' : '') +
                (scoreBonus > 1 ? '<span class="challenge-multiplier">' + scoreBonus + 'x Score</span>' : '') +
            '</div>';

        var topHtml = '';
        if (data.topScores && data.topScores.length > 0) {
            topHtml = '<div class="challenge-lb-section">';
            data.topScores.slice(0, 5).forEach(function(entry, i) {
                topHtml += '<div class="leaderboard-row">' +
                    '<span class="leaderboard-rank">#' + (i + 1) + '</span>' +
                    '<span class="leaderboard-name">' + escapeHtml(entry.displayName) + '</span>' +
                    '<span class="leaderboard-score">' + entry.score + '</span>' +
                    '</div>';
            });
            topHtml += '</div>';
        }

        modal.innerHTML =
            '<div class="auth-modal-content">' +
                '<h2 class="auth-modal-title">Daily Challenge</h2>' +
                '<div class="challenge-modal-name">' + escapeHtml(data.challenge.name) + '</div>' +
                '<div class="challenge-modal-desc">' + escapeHtml(data.challenge.description) + '</div>' +
                detailsHtml +
                topHtml +
                '<div class="challenge-modal-status" id="challengeStatus"></div>' +
                '<div class="challenge-modal-actions">' +
                    '<button class="challenge-play-btn" id="challengePlayBtn">Play Challenge</button>' +
                '</div>' +
                '<button class="auth-close" id="challengeClose">&times;</button>' +
            '</div>';

        document.body.appendChild(modal);

        // Close button
        document.getElementById('challengeClose').addEventListener('click', function() {
            modal.parentNode.removeChild(modal);
        });

        // Click backdrop to close
        modal.addEventListener('click', function(ev) {
            if (ev.target === modal) modal.parentNode.removeChild(modal);
        });

        var playBtn = document.getElementById('challengePlayBtn');
        var statusEl = document.getElementById('challengeStatus');

        // Check completion status if logged in
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn() && API.getMyChallenges) {
            API.getMyChallenges().then(function(myData) {
                if (!myData) return;
                var today = new Date().toISOString().slice(0, 10);
                var completedToday = myData.completions && myData.completions.some(function(c) {
                    return c.date === today;
                });
                if (completedToday && playBtn) {
                    playBtn.textContent = 'Completed';
                    playBtn.disabled = true;
                    playBtn.style.opacity = '0.6';
                    playBtn.style.cursor = 'default';
                }
                if (myData.streak > 0 && statusEl) {
                    statusEl.textContent = myData.streak + ' day streak';
                }
            }).catch(function() { /* ignore */ });
        }

        // Play button
        if (playBtn) {
            playBtn.addEventListener('click', function() {
                if (playBtn.disabled) return;
                modal.parentNode.removeChild(modal);
                if (typeof Challenge !== 'undefined') {
                    Game.setDifficulty('normal');
                    Challenge.startChallenge(data.challenge.id);
                    var loadingScreen = document.getElementById('loadingScreen');
                    if (loadingScreen) loadingScreen.classList.add('hidden');
                    Game.start();
                }
            });
        }
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
        // Save/Load button is now in More Options menu HTML, wired by setupMoreOptionsMenu()

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
                    '<button class="lb-tab" data-diff="challenge">Challenge</button>' +
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
                if (tab.dataset.diff === 'challenge') {
                    loadChallengeLeaderboard();
                } else {
                    loadLeaderboardData(tab.dataset.diff);
                }
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
                    if (entry.userId) {
                        row.style.cursor = 'pointer';
                        row.addEventListener('click', function() {
                            showPlayerProfile(entry.userId);
                        });
                    }
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

    function loadChallengeLeaderboard(dateOverride) {
        var listEl = document.getElementById('lbFullList');
        var rankEl = document.getElementById('lbMyRank');
        if (!listEl) return;

        listEl.innerHTML = '<div class="leaderboard-loading">Loading...</div>';
        if (rankEl) rankEl.innerHTML = '';

        var dateStr = dateOverride || new Date().toISOString().slice(0, 10);
        var isLoggedIn = typeof Auth !== 'undefined' && Auth.isLoggedIn();

        var fetches = [
            API.getDailyChallenge(),
            API.getChallengeLeaderboard(dateStr)
        ];
        if (isLoggedIn) {
            fetches.push(API.getMyChallenges());
        }

        Promise.all(fetches).then(function(results) {
            var challengeData = results[0];
            var lbData = results[1];
            var myData = results[2] || null;

            if (!lbData) {
                listEl.innerHTML = '<div class="leaderboard-loading">Failed to load</div>';
                return;
            }

            listEl.innerHTML = '';

            // Date navigation
            var dateNav = document.createElement('div');
            dateNav.className = 'lb-date-nav';
            var prevDate = new Date(dateStr);
            prevDate.setDate(prevDate.getDate() - 1);
            var nextDate = new Date(dateStr);
            nextDate.setDate(nextDate.getDate() + 1);
            var today = new Date().toISOString().slice(0, 10);
            var isToday = dateStr === today;

            dateNav.innerHTML =
                '<button class="lb-date-arrow" id="lbDatePrev">&larr;</button>' +
                '<span class="lb-date-label">' + (isToday ? 'Today' : dateStr) + '</span>' +
                '<button class="lb-date-arrow' + (isToday ? ' disabled' : '') + '" id="lbDateNext"' +
                    (isToday ? ' disabled' : '') + '>&rarr;</button>';
            listEl.appendChild(dateNav);

            document.getElementById('lbDatePrev').addEventListener('click', function() {
                loadChallengeLeaderboard(prevDate.toISOString().slice(0, 10));
            });
            if (!isToday) {
                document.getElementById('lbDateNext').addEventListener('click', function() {
                    loadChallengeLeaderboard(nextDate.toISOString().slice(0, 10));
                });
            }

            // Challenge info header (only for today)
            if (isToday && challengeData && challengeData.challenge) {
                var ch = challengeData.challenge;
                var catColors = {
                    constraint: '#4A90C4', survival: '#E8635A', speed: '#F2D864',
                    boss: '#D4A8E8', themed: '#5EA65E', economy: '#E88A42'
                };
                var info = document.createElement('div');
                info.className = 'lb-challenge-info';
                info.innerHTML =
                    '<span class="lb-challenge-name">' + escapeHtml(ch.name) + '</span>' +
                    '<span class="challenge-category" style="background:' +
                        (catColors[ch.category] || '#888') + '">' + escapeHtml(ch.category) + '</span>' +
                    '<span class="lb-challenge-desc">' + escapeHtml(ch.description) + '</span>';
                listEl.appendChild(info);
            }

            // Leaderboard entries
            if (!lbData.entries || lbData.entries.length === 0) {
                var empty = document.createElement('div');
                empty.className = 'leaderboard-loading';
                empty.textContent = isToday ? 'Be the first to complete today\'s challenge!' : 'No scores for this date';
                listEl.appendChild(empty);
            } else {
                lbData.entries.forEach(function(entry) {
                    var row = document.createElement('div');
                    row.className = 'leaderboard-row';
                    var durationStr = '';
                    if (entry.durationSeconds) {
                        var mins = Math.floor(entry.durationSeconds / 60);
                        var secs = entry.durationSeconds % 60;
                        durationStr = '<span class="leaderboard-duration">' +
                            mins + ':' + (secs < 10 ? '0' : '') + secs + '</span>';
                    }
                    row.innerHTML =
                        '<span class="leaderboard-rank">#' + entry.rank + '</span>' +
                        '<span class="leaderboard-name">' + escapeHtml(entry.displayName) + '</span>' +
                        durationStr +
                        '<span class="leaderboard-score">' + entry.score + '</span>';
                    listEl.appendChild(row);
                });
            }

            // Show player's own challenge stats in the rank section
            if (rankEl && myData && myData.completions) {
                var myCompletion = null;
                for (var i = 0; i < myData.completions.length; i++) {
                    if (myData.completions[i].date === dateStr) {
                        myCompletion = myData.completions[i];
                        break;
                    }
                }

                var rankHtml = '';
                if (myCompletion) {
                    // Find player's rank in the leaderboard entries
                    var myRank = '--';
                    if (lbData.entries) {
                        for (var j = 0; j < lbData.entries.length; j++) {
                            if (lbData.entries[j].score === myCompletion.score) {
                                myRank = '#' + lbData.entries[j].rank;
                                break;
                            }
                        }
                    }
                    rankHtml = '<div class="lb-my-rank-text">Your rank: <strong>' + myRank + '</strong> &mdash; Score: <strong>' + myCompletion.score + '</strong></div>';
                } else if (isToday) {
                    rankHtml = '<div class="lb-my-rank-text" style="color:#999">Not yet completed today</div>';
                }

                if (myData.streak > 0) {
                    rankHtml += '<div class="lb-my-streak">' + myData.streak + ' day streak</div>';
                }

                rankEl.innerHTML = rankHtml;
            }
        }).catch(function() {
            listEl.innerHTML = '<div class="leaderboard-loading">Failed to load</div>';
        });
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
     * Setup craft button
     */
    function setupCraftButton() {
        var craftBtn = document.getElementById('craftBtn');
        if (craftBtn) {
            craftBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                showCraftingModal();
            });
        }
    }

    /**
     * Show crafting modal
     */
    function showCraftingModal() {
        if (typeof Crafting === 'undefined') return;

        var existing = document.getElementById('craftModal');
        if (existing) existing.parentNode.removeChild(existing);

        var modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.id = 'craftModal';

        var recipes = Crafting.RECIPES;
        var inv = (typeof Inventory !== 'undefined') ? Inventory.getInventory() : {};

        // Active buffs display
        var buffsHtml = '';
        var activeBuffs = Crafting.getActiveBuffs();
        var shieldCharges = Crafting.getShieldCharges();
        if (activeBuffs.length > 0 || shieldCharges > 0) {
            buffsHtml = '<div class="active-buffs">';
            activeBuffs.forEach(function(b) {
                buffsHtml += '<span class="buff-pill">' + b.name + ' (' + b.wavesRemaining + 'w)</span>';
            });
            if (shieldCharges > 0) {
                buffsHtml += '<span class="buff-pill">Shield x' + shieldCharges + '</span>';
            }
            buffsHtml += '</div>';
        }

        var cardsHtml = '';
        for (var id in recipes) {
            var r = recipes[id];
            var canCraft = (typeof Inventory !== 'undefined') ? Inventory.hasMaterials(r.cost) : false;
            var costParts = [];
            for (var mat in r.cost) {
                var matName = mat.charAt(0).toUpperCase() + mat.slice(1);
                var has = inv[mat] || 0;
                var need = r.cost[mat];
                costParts.push('<span class="mat-' + mat + '">' + need + ' ' + matName + (has < need ? ' (' + has + ')' : '') + '</span>');
            }

            cardsHtml +=
                '<div class="craft-card' + (canCraft ? '' : ' craft-disabled') + '" data-recipe="' + id + '">' +
                    '<div class="craft-name">' + r.name + '</div>' +
                    '<div class="craft-effect">' + r.description + '</div>' +
                    '<div class="craft-cost">' + costParts.join(' + ') + '</div>' +
                '</div>';
        }

        modal.innerHTML =
            '<div class="auth-modal-content craft-content">' +
                '<h2 class="auth-modal-title">Crafting</h2>' +
                '<div style="text-align:center;font-family:Bangers;margin-bottom:8px;">' +
                    'Materials: <span style="color:#888">' + (inv.scrap || 0) + ' Scrap</span> ' +
                    '<span style="color:#0088FF">' + (inv.core || 0) + ' Core</span> ' +
                    '<span style="color:#AA00FF">' + (inv.crystal || 0) + ' Crystal</span>' +
                '</div>' +
                buffsHtml +
                '<div class="craft-grid">' + cardsHtml + '</div>' +
                '<button class="auth-close" id="craftClose">&times;</button>' +
            '</div>';
        document.body.appendChild(modal);

        document.getElementById('craftClose').addEventListener('click', function() {
            modal.parentNode.removeChild(modal);
        });

        // Wire up craft buttons
        modal.querySelectorAll('.craft-card:not(.craft-disabled)').forEach(function(card) {
            card.addEventListener('click', function() {
                var recipeId = card.dataset.recipe;
                if (Crafting.craft(recipeId)) {
                    // Refresh modal
                    showCraftingModal();
                }
            });
        });
    }

    /**
     * Show pause menu overlay
     */
    function showPauseMenu() {
        if (pauseMenuOpen) return;

        // Pause the game if playing
        if (Game.getState() === Game.STATES.PLAYING) {
            Game.pause();
        }

        pauseMenuOpen = true;
        autoPaused = false;

        // Remove any existing pause menu
        var existing = document.getElementById('pauseMenuModal');
        if (existing) existing.remove();

        var modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.id = 'pauseMenuModal';
        modal.innerHTML =
            '<div class="auth-modal-content pause-menu-content">' +
                '<h2 class="auth-modal-title">Paused</h2>' +
                '<div class="pause-menu-buttons">' +
                    '<button class="pause-menu-btn" id="pauseResumeBtn">Resume</button>' +
                    '<button class="pause-menu-btn" id="pauseSettingsBtn">Settings</button>' +
                    '<button class="pause-menu-btn pause-menu-btn-danger" id="pauseQuitBtn">Return to Menu</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);

        // Resume button
        document.getElementById('pauseResumeBtn').addEventListener('click', function() {
            Sfx.playEffect('button');
            closePauseMenu();
        });

        // Settings button
        document.getElementById('pauseSettingsBtn').addEventListener('click', function() {
            Sfx.playEffect('button');
            showSettingsPanel('pause');
        });

        // Return to Menu button
        document.getElementById('pauseQuitBtn').addEventListener('click', function() {
            Sfx.playEffect('button');
            showQuitConfirmation();
        });
    }

    /**
     * Close pause menu and resume game
     */
    function closePauseMenu() {
        pauseMenuOpen = false;

        var modal = document.getElementById('pauseMenuModal');
        if (modal) modal.remove();

        // Also remove any settings/confirmation sub-modals
        var settings = document.getElementById('settingsModal');
        if (settings) settings.remove();
        var confirm = document.getElementById('quitConfirmModal');
        if (confirm) confirm.remove();

        Game.resume();
    }

    /**
     * Show settings panel with volume controls
     */
    function showSettingsPanel(source) {
        var existing = document.getElementById('settingsModal');
        if (existing) existing.remove();

        var sfxVol = Math.round(Sfx.getVolume() * 100);
        var musicVol = Math.round(Sfx.getMusicVolume() * 100);
        var muted = Sfx.isMuted();

        var modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.id = 'settingsModal';
        modal.innerHTML =
            '<div class="auth-modal-content settings-content">' +
                '<h2 class="auth-modal-title">Settings</h2>' +
                '<div class="settings-slider-row">' +
                    '<label class="settings-label">SFX Volume</label>' +
                    '<input type="range" class="settings-slider" id="sfxSlider" min="0" max="100" value="' + sfxVol + '">' +
                    '<span class="settings-value" id="sfxValue">' + sfxVol + '%</span>' +
                '</div>' +
                '<div class="settings-slider-row">' +
                    '<label class="settings-label">Music Volume</label>' +
                    '<input type="range" class="settings-slider" id="musicSlider" min="0" max="100" value="' + musicVol + '">' +
                    '<span class="settings-value" id="musicValue">' + musicVol + '%</span>' +
                '</div>' +
                '<button class="settings-mute-btn' + (muted ? ' muted' : '') + '" id="muteToggleBtn">' +
                    (muted ? 'Unmute All' : 'Mute All') +
                '</button>' +
                '<button class="pause-menu-btn" id="settingsBackBtn">Back</button>' +
            '</div>';
        document.body.appendChild(modal);

        // SFX slider
        document.getElementById('sfxSlider').addEventListener('input', function() {
            Sfx.setVolume(this.value / 100);
            document.getElementById('sfxValue').textContent = this.value + '%';
        });

        // Music slider
        document.getElementById('musicSlider').addEventListener('input', function() {
            Sfx.setMusicVolume(this.value / 100);
            document.getElementById('musicValue').textContent = this.value + '%';
        });

        // Mute toggle
        document.getElementById('muteToggleBtn').addEventListener('click', function() {
            var nowMuted = Sfx.toggleMute();
            this.textContent = nowMuted ? 'Unmute All' : 'Mute All';
            this.classList.toggle('muted', nowMuted);
        });

        // Back button
        document.getElementById('settingsBackBtn').addEventListener('click', function() {
            Sfx.playEffect('button');
            modal.remove();
        });

        // Click backdrop to close
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Show quit confirmation dialog
     */
    function showQuitConfirmation() {
        var existing = document.getElementById('quitConfirmModal');
        if (existing) existing.remove();

        var modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.id = 'quitConfirmModal';
        modal.innerHTML =
            '<div class="auth-modal-content quit-confirm-content">' +
                '<h2 class="auth-modal-title">Leave Game?</h2>' +
                '<p class="quit-confirm-text">Your progress will be lost.</p>' +
                '<div class="quit-confirm-buttons">' +
                    '<button class="pause-menu-btn pause-menu-btn-danger" id="quitLeaveBtn">Leave</button>' +
                    '<button class="pause-menu-btn" id="quitStayBtn">Stay</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);

        // Leave button
        document.getElementById('quitLeaveBtn').addEventListener('click', function() {
            Sfx.playEffect('button');
            // Remove all modals
            var pauseModal = document.getElementById('pauseMenuModal');
            if (pauseModal) pauseModal.remove();
            var settingsModal = document.getElementById('settingsModal');
            if (settingsModal) settingsModal.remove();
            modal.remove();
            pauseMenuOpen = false;
            Game.returnToMenu();
        });

        // Stay button
        document.getElementById('quitStayBtn').addEventListener('click', function() {
            Sfx.playEffect('button');
            modal.remove();
        });
    }

    /**
     * Setup buttons on start screen (stats, achievements, craft)
     * Note: These buttons are now in the More Options menu HTML, wired by setupMoreOptionsMenu()
     */
    function setupStartScreenButtons() {
        // Stats and Achievements buttons are now in More Options menu,
        // wired by setupMoreOptionsMenu()
    }

    /**
     * Show achievement gallery modal
     */
    function showAchievementGallery() {
        if (typeof Achievements === 'undefined') return;

        var existing = document.getElementById('achGalleryModal');
        if (existing) existing.parentNode.removeChild(existing);

        var modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.id = 'achGalleryModal';

        var allAch = Achievements.getAll();
        var svgs = Achievements.ACHIEVEMENT_SVGS || {};

        var cardsHtml = '';
        for (var id in allAch) {
            var a = allAch[id];
            var iconSvg = svgs[a.icon] || '';
            var lockedClass = a.unlocked ? '' : ' ach-locked';
            cardsHtml +=
                '<div class="ach-card' + lockedClass + '" data-id="' + id + '">' +
                    '<div class="ach-icon">' + iconSvg + '</div>' +
                    '<div class="ach-name">' + a.name + '</div>' +
                    '<div class="ach-desc">' + a.description + '</div>' +
                    '<div class="ach-reward">+' + a.reward + 'g</div>' +
                    '<div class="ach-global" id="achGlobal_' + id + '"></div>' +
                '</div>';
        }

        modal.innerHTML =
            '<div class="auth-modal-content ach-content">' +
                '<h2 class="auth-modal-title">Achievements</h2>' +
                '<div class="ach-grid">' + cardsHtml + '</div>' +
                '<button class="auth-close" id="achGalleryClose">&times;</button>' +
            '</div>';
        document.body.appendChild(modal);

        document.getElementById('achGalleryClose').addEventListener('click', function() {
            modal.parentNode.removeChild(modal);
        });

        // Fetch global percentages
        if (typeof API !== 'undefined' && API.getGlobalAchievements) {
            API.getGlobalAchievements().then(function(data) {
                if (!data || !data.percentages) return;
                for (var achId in data.percentages) {
                    var el = document.getElementById('achGlobal_' + achId);
                    if (el) el.textContent = data.percentages[achId] + '% of players';
                }
            }).catch(function() { /* ignore */ });
        }
    }

    /**
     * Show player profile modal
     */
    function showPlayerProfile(userId) {
        if (typeof API === 'undefined' || !API.getPlayerProfile) return;

        var existing = document.getElementById('profileModal');
        if (existing) existing.parentNode.removeChild(existing);

        var modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.id = 'profileModal';
        modal.innerHTML =
            '<div class="auth-modal-content profile-card">' +
                '<h2 class="auth-modal-title">Player Profile</h2>' +
                '<div id="profileContent"><div class="leaderboard-loading">Loading...</div></div>' +
                '<button class="auth-close" id="profileClose">&times;</button>' +
            '</div>';
        document.body.appendChild(modal);

        document.getElementById('profileClose').addEventListener('click', function() {
            modal.parentNode.removeChild(modal);
        });

        API.getPlayerProfile(userId).then(function(data) {
            var content = document.getElementById('profileContent');
            if (!content || !data) {
                if (content) content.innerHTML = '<div class="leaderboard-loading">Profile not found</div>';
                return;
            }

            content.innerHTML =
                '<div class="profile-name">' + escapeHtml(data.displayName || 'Player') + '</div>' +
                '<div class="stats-grid">' +
                    '<div class="stat-card"><div class="stat-card-label">Games</div><div class="stat-card-value">' + (data.totalGamesPlayed || 0) + '</div></div>' +
                    '<div class="stat-card"><div class="stat-card-label">Wins</div><div class="stat-card-value">' + (data.wins || 0) + '</div></div>' +
                    '<div class="stat-card"><div class="stat-card-label">Best Score</div><div class="stat-card-value">' + (data.maxScore || 0) + '</div></div>' +
                    '<div class="stat-card"><div class="stat-card-label">Achievements</div><div class="stat-card-value">' + (data.achievementCount || 0) + '</div></div>' +
                '</div>';
        }).catch(function() {
            var content = document.getElementById('profileContent');
            if (content) content.innerHTML = '<div class="leaderboard-loading">Could not load profile</div>';
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
            autoPaused = true;
            Game.pause();
            showAutoPauseOverlay();
        }
    });

    /**
     * Handle window focus (auto-resume only if pause menu is not open)
     */
    window.addEventListener('focus', function() {
        if (Game.getState() === Game.STATES.PAUSED && autoPaused && !pauseMenuOpen) {
            autoPaused = false;
            hideAutoPauseOverlay();
            Game.resume();
        }
    });

    /**
     * Handle visibility change (auto-pause when tab is hidden)
     */
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            if (Game.getState() === Game.STATES.PLAYING) {
                autoPaused = true;
                Game.pause();
                showAutoPauseOverlay();
            }
        } else {
            if (Game.getState() === Game.STATES.PAUSED && autoPaused && !pauseMenuOpen) {
                autoPaused = false;
                hideAutoPauseOverlay();
                Game.resume();
            }
        }
    });

    /**
     * Show auto-pause overlay (semi-transparent with PAUSED text)
     */
    function showAutoPauseOverlay() {
        var existing = document.getElementById('autoPauseOverlay');
        if (existing) return;

        var overlay = document.createElement('div');
        overlay.id = 'autoPauseOverlay';
        overlay.className = 'auto-pause-overlay';
        overlay.innerHTML = '<div class="auto-pause-text">PAUSED</div>';
        document.body.appendChild(overlay);

        // Click to resume
        overlay.addEventListener('click', function() {
            if (autoPaused && !pauseMenuOpen) {
                autoPaused = false;
                hideAutoPauseOverlay();
                Game.resume();
            }
        });
    }

    /**
     * Hide auto-pause overlay
     */
    function hideAutoPauseOverlay() {
        var overlay = document.getElementById('autoPauseOverlay');
        if (overlay) overlay.remove();
    }
    
    /**
     * Prevent context menu on game area
     */
    document.addEventListener('contextmenu', function(e) {
        if (e.target.closest('.map')) {
            e.preventDefault();
        }
    });
    
})();
