/**
 * CSS Tower Defense - Achievement System
 * Tracks player accomplishments and rewards
 */

var Achievements = (function() {
    'use strict';

    // Achievement definitions
    var ACHIEVEMENTS = {
        first_blood: {
            name: 'First Blood',
            description: 'Kill your first enemy',
            reward: 10,
            icon: '🩸',
            unlocked: false
        },
        wave_5: {
            name: 'Veteran',
            description: 'Reach wave 5',
            reward: 25,
            icon: '🎖️',
            unlocked: false
        },
        survivor: {
            name: 'Survivor',
            description: 'Complete all 10 waves',
            reward: 100,
            icon: '🏆',
            unlocked: false
        },
        perfect_wave: {
            name: 'Perfect Wave',
            description: 'Complete a wave without taking damage',
            reward: 50,
            icon: '⭐',
            unlocked: false
        },
        combo_5: {
            name: 'Combo Master',
            description: 'Achieve a 5x combo',
            reward: 30,
            icon: '🔥',
            unlocked: false
        },
        combo_10: {
            name: 'Combo Legend',
            description: 'Achieve a 10x combo',
            reward: 75,
            icon: '💥',
            unlocked: false
        },
        boss_slayer: {
            name: 'Boss Slayer',
            description: 'Defeat the boss',
            reward: 50,
            icon: '👑',
            unlocked: false
        },
        tower_master: {
            name: 'Tower Master',
            description: 'Place 10 towers in one game',
            reward: 25,
            icon: '🏰',
            unlocked: false
        },
        reforger: {
            name: 'Lucky Reforge',
            description: 'Get a Legendary prefix',
            reward: 50,
            icon: '✨',
            unlocked: false
        },
        rich: {
            name: 'Wealthy',
            description: 'Have 500 gold at once',
            reward: 25,
            icon: '💰',
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
        notification.innerHTML =
            '<div class="achievement-icon">' + achievement.icon + '</div>' +
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
