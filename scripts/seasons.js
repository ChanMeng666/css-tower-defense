/**
 * CSS Tower Defense - Seasonal System
 * Manages Seasons, Visual Themes, and Weather probabilities
 */

var Seasons = (function () {
    'use strict';

    var SEASON_TYPES = ['spring', 'summer', 'autumn', 'winter'];
    var currentSeasonIndex = 1; // Start in Summer

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
            sceneClass: null
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
            sceneClass: null
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
            sceneClass: null
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
            sceneClass: 'aurora-active' // Enable aurora effect for winter
        }
    };

    // State
    var wavesSinceChange = 0;
    var WAVES_PER_SEASON = 2;

    function init() {
        // Set initial season
        setSeason(SEASON_TYPES[currentSeasonIndex]);

        // Listen for wave complete to advance seasons
        document.addEventListener('waveComplete', function (e) {
            wavesSinceChange++;
            if (wavesSinceChange >= WAVES_PER_SEASON) {
                nextSeason(); // Advance season
                wavesSinceChange = 0;

                Display.showMessage('Season Changed: ' + getSeasonName().toUpperCase());
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

        // 3. Notify Weather System (if possible)
        // Weather.js can call Seasons.getWeatherWeights() to get probabilities

        // Console log for debug
        console.log("Season set to: " + config.name);
    }

    /**
     * Create aurora effect DOM elements
     */
    function createAuroraElements(scene) {
        // Create aurora sky element if it doesn't exist
        if (!scene.querySelector('.aurora-sky')) {
            var auroraSky = document.createElement('div');
            auroraSky.className = 'aurora-sky';
            scene.insertBefore(auroraSky, scene.firstChild);
        }

        // Create aurora particles element if it doesn't exist
        if (!scene.querySelector('.aurora-particles')) {
            var auroraParticles = document.createElement('div');
            auroraParticles.className = 'aurora-particles';
            scene.insertBefore(auroraParticles, scene.firstChild);
        }
    }

    function nextSeason() {
        currentSeasonIndex = (currentSeasonIndex + 1) % SEASON_TYPES.length;
        setSeason(SEASON_TYPES[currentSeasonIndex]);
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

    return {
        init: init,
        nextSeason: nextSeason,
        getCurrentSeason: getCurrentSeason,
        getWeatherWeights: getWeatherWeights
    };
})();
