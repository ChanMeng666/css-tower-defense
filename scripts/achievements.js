/**
 * CSS Tower Defense - Achievement System
 * Tracks player accomplishments and rewards
 */

var Achievements = (function() {
    'use strict';

    // SVG icons for achievements (inline, no external deps)
    var ACHIEVEMENT_SVGS = {
        'achievement-icon-blood': '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2C12 2 6 10 6 14c0 3.31 2.69 6 6 6s6-2.69 6-6c0-4-6-12-6-12z" fill="#E8635A" stroke="#1A1614" stroke-width="1.2"/><ellipse cx="10" cy="14" rx="2" ry="3" fill="rgba(255,255,255,0.3)" transform="rotate(-10 10 14)"/></svg>',
        'achievement-icon-medal': '<svg viewBox="0 0 24 24" width="28" height="28"><polygon points="8,1 10,1 12,6 14,1 16,1 13,8 11,8" fill="#4A90C4" stroke="#1A1614" stroke-width="0.8"/><circle cx="12" cy="14" r="6" fill="#F2D864" stroke="#1A1614" stroke-width="1.2"/><circle cx="12" cy="14" r="4" fill="none" stroke="#C4A030" stroke-width="1"/><text x="12" y="17" text-anchor="middle" font-size="7" font-weight="bold" fill="#C4A030" font-family="sans-serif">1</text></svg>',
        'achievement-icon-trophy': '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M7 3h10v6c0 3-2.5 5-5 5s-5-2-5-5V3z" fill="#F2D864" stroke="#1A1614" stroke-width="1.2"/><path d="M7 5H4c0 3 1.5 4 3 4" fill="none" stroke="#1A1614" stroke-width="1.2"/><path d="M17 5h3c0 3-1.5 4-3 4" fill="none" stroke="#1A1614" stroke-width="1.2"/><rect x="10" y="14" width="4" height="3" fill="#C4A030"/><rect x="8" y="17" width="8" height="3" rx="1" fill="#1A1614"/><ellipse cx="11" cy="7" rx="2" ry="3" fill="rgba(255,255,255,0.3)" transform="rotate(-5 11 7)"/></svg>',
        'achievement-icon-star': '<svg viewBox="0 0 24 24" width="28" height="28"><polygon points="12,2 14.9,8.6 22,9.3 16.8,14 18.2,21 12,17.5 5.8,21 7.2,14 2,9.3 9.1,8.6" fill="#F2D864" stroke="#1A1614" stroke-width="1.2"/><polygon points="12,5 13.5,9 10,9" fill="rgba(255,255,255,0.3)"/></svg>',
        'achievement-icon-fire': '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 23c-4.5 0-7-3-7-6.5 0-4 3-7 4.5-9.5.5 2 2 3 2 3s-0.5-4 2-7c1.5 2 2.5 3.5 3 5.5.3-.8.5-2 .5-2 2 3 2.5 5.5 2.5 7.5 0 4.5-3 9-7.5 9z" fill="#E8635A" stroke="#1A1614" stroke-width="1"/><path d="M12 23c-2.5 0-4-2-4-4 0-2.5 2-4.5 3-6 .5 1.5 1 2 1 2s0 -2 1.5-4c.5 1 1 2 1.5 3 0 0 .5-1 .5-1.5 1 1.5 1.5 3 1.5 4.5 0 3-2 6-5 6z" fill="#F2D864"/><ellipse cx="12" cy="20" rx="2" ry="3" fill="#FFF8F0" opacity="0.6"/></svg>',
        'achievement-icon-explosion': '<svg viewBox="0 0 24 24" width="28" height="28"><polygon points="12,1 14,7 20,4 16,9 23,12 16,14 20,20 14,16 12,23 10,16 4,20 8,14 1,12 8,9 4,4 10,7" fill="#E8635A" stroke="#1A1614" stroke-width="0.8"/><circle cx="12" cy="12" r="4" fill="#F2D864"/><circle cx="12" cy="12" r="2" fill="#FFF8F0"/></svg>',
        'achievement-icon-crown': '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 18L2 8l5 4 5-7 5 7 5-4-2 10z" fill="#F2D864" stroke="#1A1614" stroke-width="1.2"/><rect x="4" y="18" width="16" height="3" rx="1" fill="#C4A030" stroke="#1A1614" stroke-width="1"/><circle cx="6" cy="8" r="1.2" fill="#E8635A"/><circle cx="12" cy="5" r="1.2" fill="#E8635A"/><circle cx="18" cy="8" r="1.2" fill="#E8635A"/></svg>',
        'achievement-icon-castle': '<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="10" width="18" height="12" fill="#888" stroke="#1A1614" stroke-width="1"/><rect x="3" y="7" width="3" height="3" fill="#888" stroke="#1A1614" stroke-width="0.8"/><rect x="8" y="7" width="3" height="3" fill="#888" stroke="#1A1614" stroke-width="0.8"/><rect x="13" y="7" width="3" height="3" fill="#888" stroke="#1A1614" stroke-width="0.8"/><rect x="18" y="7" width="3" height="3" fill="#888" stroke="#1A1614" stroke-width="0.8"/><rect x="9" y="16" width="6" height="6" rx="3" fill="#1A1614"/><rect x="10" y="12" width="4" height="3" fill="#4A90C4" stroke="#1A1614" stroke-width="0.8"/></svg>',
        'achievement-icon-sparkle': '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2L13.5 9 20 8l-5.5 3.5L18 18l-6-3-6 3 3.5-6.5L4 8l6.5 1z" fill="#F2D864" stroke="#1A1614" stroke-width="0.8"/><circle cx="12" cy="10" r="2" fill="#FFF8F0"/><circle cx="6" cy="4" r="1" fill="#F2D864"/><circle cx="19" cy="3" r="0.8" fill="#F2D864"/><circle cx="20" cy="16" r="0.6" fill="#F2D864"/></svg>',
        'achievement-icon-gold': '<svg viewBox="0 0 24 24" width="28" height="28"><ellipse cx="12" cy="16" rx="8" ry="4" fill="#C4A030" stroke="#1A1614" stroke-width="1"/><ellipse cx="12" cy="14" rx="8" ry="4" fill="#F2D864" stroke="#1A1614" stroke-width="1"/><ellipse cx="12" cy="12" rx="8" ry="4" fill="#C4A030" stroke="#1A1614" stroke-width="1"/><ellipse cx="12" cy="10" rx="8" ry="4" fill="#F2D864" stroke="#1A1614" stroke-width="1"/><ellipse cx="10" cy="9" rx="2.5" ry="1.5" fill="rgba(255,255,255,0.3)" transform="rotate(-5 10 9)"/></svg>'
    };

    // Achievement definitions
    var ACHIEVEMENTS = {
        first_blood: {
            name: 'First Blood',
            description: 'Kill your first enemy',
            reward: 10,
            icon: 'achievement-icon-blood',
            unlocked: false
        },
        wave_5: {
            name: 'Veteran',
            description: 'Reach wave 5',
            reward: 25,
            icon: 'achievement-icon-medal',
            unlocked: false
        },
        survivor: {
            name: 'Survivor',
            description: 'Complete all 10 waves',
            reward: 100,
            icon: 'achievement-icon-trophy',
            unlocked: false
        },
        perfect_wave: {
            name: 'Perfect Wave',
            description: 'Complete a wave without taking damage',
            reward: 50,
            icon: 'achievement-icon-star',
            unlocked: false
        },
        combo_5: {
            name: 'Combo Master',
            description: 'Achieve a 5x combo',
            reward: 30,
            icon: 'achievement-icon-fire',
            unlocked: false
        },
        combo_10: {
            name: 'Combo Legend',
            description: 'Achieve a 10x combo',
            reward: 75,
            icon: 'achievement-icon-explosion',
            unlocked: false
        },
        boss_slayer: {
            name: 'Boss Slayer',
            description: 'Defeat the boss',
            reward: 50,
            icon: 'achievement-icon-crown',
            unlocked: false
        },
        tower_master: {
            name: 'Tower Master',
            description: 'Place 10 towers in one game',
            reward: 25,
            icon: 'achievement-icon-castle',
            unlocked: false
        },
        reforger: {
            name: 'Lucky Reforge',
            description: 'Get a Legendary prefix',
            reward: 50,
            icon: 'achievement-icon-sparkle',
            unlocked: false
        },
        rich: {
            name: 'Wealthy',
            description: 'Have 500 gold at once',
            reward: 25,
            icon: 'achievement-icon-gold',
            unlocked: false
        }
    };

    // Tracking variables
    var livesAtWaveStart = 0;
    var towersPlaced = 0;
    var killCount = 0;

    /**
     * Initialize the achievement system
     */
    function init() {
        // Reset tracking
        livesAtWaveStart = 0;
        towersPlaced = 0;
        killCount = 0;

        // Load unlocked achievements from localStorage
        loadProgress();

        // Set up event listeners
        setupListeners();
    }

    /**
     * Set up game event listeners
     */
    function setupListeners() {
        // First Blood
        document.addEventListener('enemyKilled', function(e) {
            killCount++;
            if (killCount === 1) {
                unlock('first_blood');
            }

            // Boss Slayer
            if (e.detail.enemy && e.detail.enemy.type === 'boss') {
                unlock('boss_slayer');
            }
        });

        // Combo achievements
        document.addEventListener('comboKill', function(e) {
            if (e.detail.count >= 5) {
                unlock('combo_5');
            }
            if (e.detail.count >= 10) {
                unlock('combo_10');
            }
        });

        // Wave tracking
        document.addEventListener('waveStarted', function(e) {
            // Track lives at wave start for perfect wave check
            if (typeof Game !== 'undefined') {
                livesAtWaveStart = 20; // TODO: Get actual lives
            }
        });

        document.addEventListener('waveComplete', function(e) {
            // Wave 5 achievement
            if (e.detail.wave >= 5) {
                unlock('wave_5');
            }

            // Survivor achievement
            if (e.detail.isLastWave) {
                unlock('survivor');
            }
        });

        // Tower placed tracking
        document.addEventListener('towerPlaced', function(e) {
            towersPlaced++;
            if (towersPlaced >= 10) {
                unlock('tower_master');
            }
        });
    }

    /**
     * Check for gold-based achievements
     */
    function checkGoldAchievements(gold) {
        if (gold >= 500) {
            unlock('rich');
        }
    }

    /**
     * Check for reforge achievements
     */
    function checkReforgeAchievement(prefix) {
        if (prefix && prefix.rarity === 'legendary') {
            unlock('reforger');
        }
    }

    /**
     * Unlock an achievement
     */
    function unlock(id) {
        var achievement = ACHIEVEMENTS[id];
        if (!achievement || achievement.unlocked) return;

        achievement.unlocked = true;
        saveProgress();

        // Award gold
        if (typeof Game !== 'undefined' && Game.addGold) {
            Game.addGold(achievement.reward);
        }

        // Show notification
        showNotification(achievement);

        // Play sound
        if (typeof Sfx !== 'undefined') {
            Sfx.play('achievement');
        }
    }

    /**
     * Show achievement unlock notification
     */
    function showNotification(achievement) {
        var notification = document.createElement('div');
        notification.className = 'achievement-notification';
        var iconSvg = ACHIEVEMENT_SVGS[achievement.icon] || '';
        notification.innerHTML =
            '<div class="achievement-icon">' + iconSvg + '</div>' +
            '<div class="achievement-info">' +
            '<div class="achievement-title">Achievement Unlocked!</div>' +
            '<div class="achievement-name">' + achievement.name + '</div>' +
            '<div class="achievement-reward">+' + achievement.reward + ' gold</div>' +
            '</div>';

        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(function() {
            notification.classList.add('show');
        }, 100);

        // Remove after animation
        setTimeout(function() {
            notification.classList.remove('show');
            setTimeout(function() {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 4000);
    }

    /**
     * Save progress to localStorage
     */
    function saveProgress() {
        var unlocked = [];
        for (var id in ACHIEVEMENTS) {
            if (ACHIEVEMENTS[id].unlocked) {
                unlocked.push(id);
            }
        }
        localStorage.setItem('td_achievements', JSON.stringify(unlocked));
    }

    /**
     * Load progress from localStorage
     */
    function loadProgress() {
        try {
            var saved = localStorage.getItem('td_achievements');
            if (saved) {
                var unlocked = JSON.parse(saved);
                unlocked.forEach(function(id) {
                    if (ACHIEVEMENTS[id]) {
                        ACHIEVEMENTS[id].unlocked = true;
                    }
                });
            }
        } catch (e) {
            // Ignore errors
        }
    }

    /**
     * Get all achievements
     */
    function getAll() {
        return ACHIEVEMENTS;
    }

    /**
     * Get unlock count
     */
    function getUnlockedCount() {
        var count = 0;
        for (var id in ACHIEVEMENTS) {
            if (ACHIEVEMENTS[id].unlocked) count++;
        }
        return count;
    }

    // Public API
    return {
        init: init,
        unlock: unlock,
        checkGoldAchievements: checkGoldAchievements,
        checkReforgeAchievement: checkReforgeAchievement,
        getAll: getAll,
        getUnlockedCount: getUnlockedCount,
        ACHIEVEMENTS: ACHIEVEMENTS
    };
})();
