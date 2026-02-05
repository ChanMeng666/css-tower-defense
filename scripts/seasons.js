/**
 * CSS Tower Defense - Seasonal System
 * Manages Seasons, Visual Themes, Weather probabilities, and Gameplay modifiers
 */

var Seasons = (function () {
    'use strict';

    var SEASON_TYPES = ['spring', 'summer', 'autumn', 'winter'];
    var currentSeasonIndex = 1; // Start in Summer

    // Wave-to-season mapping: waves 1-2 Summer, 3-4 Autumn, 5-6 Winter, 7-8 Spring, 9-10 Summer
    var WAVE_SEASON_MAP = {
        1: 'summer', 2: 'summer',
        3: 'autumn', 4: 'autumn',
        5: 'winter', 6: 'winter',
        7: 'spring', 8: 'spring',
        9: 'summer', 10: 'summer'
    };

    // Configuration per Season
    var SEASON_CONFIG = {
        spring: {
            name: 'Spring',
            colors: {
                '--color-bg': '#B8D8E8',
                '--color-grass': '#8BC34A',
                '--color-grass-light': '#A8D965',
                '--color-grass-dark': '#6B9A30',
                '--color-path': '#E8C864',
                '--color-path-light': '#F2DD8A',
                '--color-path-dark': '#C4A642'
            },
            weatherWeights: { clear: 0.4, rain: 0.5, wind: 0.1, snow: 0.0 },
            sceneClass: null,
            gameplayModifiers: {
                enemySpeed: 1.10,
                gold: 1.0,
                waveReward: 1.0,
                tower: {
                    magic: { damage: 1.15 },
                    tesla: { chainTargets: 1 }  // +1 chain target during rain (applied conditionally)
                }
            }
        },
        summer: {
            name: 'Summer',
            colors: {
                '--color-bg': '#7EC8D9',
                '--color-grass': '#5EA65E',
                '--color-grass-light': '#78C878',
                '--color-grass-dark': '#3D7A3D',
                '--color-path': '#F5A623',
                '--color-path-light': '#FFD080',
                '--color-path-dark': '#C4841A'
            },
            weatherWeights: { clear: 0.8, rain: 0.1, wind: 0.1, snow: 0.0 },
            sceneClass: null,
            gameplayModifiers: {
                enemySpeed: 1.0,
                gold: 1.0,
                waveReward: 1.0,
                tower: {
                    flame: { damage: 1.15 },
                    ice: { slowDuration: 0.90 }
                }
            }
        },
        autumn: {
            name: 'Autumn',
            colors: {
                '--color-bg': '#E8B87A',
                '--color-grass': '#D4884A',
                '--color-grass-light': '#E8A868',
                '--color-grass-dark': '#A66832',
                '--color-path': '#8B6642',
                '--color-path-light': '#A68060',
                '--color-path-dark': '#6B4E32'
            },
            weatherWeights: { clear: 0.4, rain: 0.2, wind: 0.4, snow: 0.0 },
            sceneClass: null,
            gameplayModifiers: {
                enemySpeed: 1.0,
                gold: 1.15,
                waveReward: 1.20,
                tower: {
                    arrow: { range: 1.10 }
                }
            }
        },
        winter: {
            name: 'Winter',
            colors: {
                '--color-bg': '#D4E4EC',
                '--color-grass': '#E8E0D8',
                '--color-grass-light': '#F2ECE8',
                '--color-grass-dark': '#C8BEB4',
                '--color-path': '#A0AAB4',
                '--color-path-light': '#B8C4D0',
                '--color-path-dark': '#889098'
            },
            weatherWeights: { clear: 0.3, rain: 0.0, wind: 0.2, snow: 0.5 },
            sceneClass: 'aurora-active',
            gameplayModifiers: {
                enemySpeed: 0.90,
                gold: 1.0,
                waveReward: 1.0,
                tower: {
                    ice: { slowDuration: 1.25, slowAmount: 1.10 },
                    flame: { damage: 0.85 }
                }
            }
        }
    };

    function init() {
        // Set initial season (Summer)
        currentSeasonIndex = 1;
        setSeason(SEASON_TYPES[currentSeasonIndex]);

        // Listen for wave start to advance seasons based on wave-season map
        document.addEventListener('waveStarted', function (e) {
            var waveNum = e.detail.wave;
            var targetSeason = WAVE_SEASON_MAP[waveNum];
            if (targetSeason && targetSeason !== getCurrentSeason()) {
                var idx = SEASON_TYPES.indexOf(targetSeason);
                if (idx !== -1) {
                    currentSeasonIndex = idx;
                    setSeason(targetSeason);
                    if (typeof Display !== 'undefined') {
                        Display.showMessage('Season Changed: ' + getSeasonName().toUpperCase());
                    }
                }
            }
        });
    }

    function setSeason(seasonKey) {
        var config = SEASON_CONFIG[seasonKey];
        if (!config) return;

        // 1. Update CSS Variables
        var root = document.documentElement;
        for (var key in config.colors) {
            if (config.colors.hasOwnProperty(key)) {
                root.style.setProperty(key, config.colors[key]);
            }
        }

        // 2. Update scene class for special effects (aurora, etc.)
        var scene = document.querySelector('.scene');
        if (scene) {
            // Remove all season-specific scene classes
            scene.classList.remove('aurora-active');

            // Add new season's scene class if defined
            if (config.sceneClass) {
                scene.classList.add(config.sceneClass);

                // Create aurora elements if needed for winter
                if (config.sceneClass === 'aurora-active') {
                    createAuroraElements(scene);
                }
            }
        }

        // Dispatch season changed event
        if (typeof emitGameEvent === 'function') {
            emitGameEvent('seasonChanged', { season: seasonKey, name: config.name });
        }
    }

    /**
     * Create aurora effect DOM elements
     */
    function createAuroraElements(scene) {
        if (!scene.querySelector('.aurora-sky')) {
            var auroraSky = document.createElement('div');
            auroraSky.className = 'aurora-sky';
            scene.insertBefore(auroraSky, scene.firstChild);
        }

        if (!scene.querySelector('.aurora-particles')) {
            var auroraParticles = document.createElement('div');
            auroraParticles.className = 'aurora-particles';
            scene.insertBefore(auroraParticles, scene.firstChild);
        }
    }

    function getCurrentSeason() {
        return SEASON_TYPES[currentSeasonIndex];
    }

    function getSeasonName() {
        return SEASON_CONFIG[SEASON_TYPES[currentSeasonIndex]].name;
    }

    function getWeatherWeights() {
        return SEASON_CONFIG[SEASON_TYPES[currentSeasonIndex]].weatherWeights;
    }

    // =========================================
    // Gameplay Modifier API
    // =========================================

    /**
     * Get enemy speed multiplier from current season
     */
    function getEnemySpeedMultiplier() {
        var config = SEASON_CONFIG[getCurrentSeason()];
        return config.gameplayModifiers.enemySpeed;
    }

    /**
     * Get gold multiplier from current season (applied to kill rewards)
     */
    function getGoldMultiplier() {
        var config = SEASON_CONFIG[getCurrentSeason()];
        return config.gameplayModifiers.gold;
    }

    /**
     * Get wave completion reward multiplier
     */
    function getWaveRewardMultiplier() {
        var config = SEASON_CONFIG[getCurrentSeason()];
        return config.gameplayModifiers.waveReward;
    }

    /**
     * Get tower-specific modifier from season
     * @param {string} towerType - e.g. 'flame', 'ice', 'arrow'
     * @param {string} stat - e.g. 'damage', 'range', 'slowDuration', 'slowAmount'
     * @returns {number} multiplier (1.0 = no change)
     */
    function getTowerModifier(towerType, stat) {
        var config = SEASON_CONFIG[getCurrentSeason()];
        var towerMods = config.gameplayModifiers.tower;
        if (towerMods && towerMods[towerType] && towerMods[towerType][stat] !== undefined) {
            return towerMods[towerType][stat];
        }
        return 1.0;
    }

    /**
     * Get extra chain targets for tesla (spring bonus)
     */
    function getTeslaChainBonus() {
        var config = SEASON_CONFIG[getCurrentSeason()];
        if (config.gameplayModifiers.tower && config.gameplayModifiers.tower.tesla &&
            config.gameplayModifiers.tower.tesla.chainTargets) {
            return config.gameplayModifiers.tower.tesla.chainTargets;
        }
        return 0;
    }

    return {
        init: init,
        getCurrentSeason: getCurrentSeason,
        getSeasonName: getSeasonName,
        getWeatherWeights: getWeatherWeights,
        getEnemySpeedMultiplier: getEnemySpeedMultiplier,
        getGoldMultiplier: getGoldMultiplier,
        getWaveRewardMultiplier: getWaveRewardMultiplier,
        getTowerModifier: getTowerModifier,
        getTeslaChainBonus: getTeslaChainBonus
    };
})();
