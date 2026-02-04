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
                '--color-bg': '#87CEEB', // Light Blue
                '--color-grass': '#aaff00', // Lime
                '--color-grass-light': '#ccff66',
                '--color-grass-dark': '#88cc00',
                '--color-path': '#ffcc00', // Yellow
                '--color-path-light': '#ffff66',
                '--color-path-dark': '#cca300'
            },
            weatherWeights: { clear: 0.4, rain: 0.5, wind: 0.1, snow: 0.0 }
        },
        summer: {
            name: 'Summer',
            colors: {
                '--color-bg': '#00d4ff', // Cyan
                '--color-grass': '#00cc66', // Deep Green
                '--color-grass-light': '#33ff88',
                '--color-grass-dark': '#009944',
                '--color-path': '#ffd700', // Gold
                '--color-path-light': '#ffeb3b',
                '--color-path-dark': '#ffc107'
            },
            weatherWeights: { clear: 0.8, rain: 0.1, wind: 0.1, snow: 0.0 }
        },
        autumn: {
            name: 'Autumn',
            colors: {
                '--color-bg': '#ffcc80', // Peach/Orange sky
                '--color-grass': '#ff9933', // Orange grass
                '--color-grass-light': '#ffb74d',
                '--color-grass-dark': '#e65100',
                '--color-path': '#8d6e63', // Brown path
                '--color-path-light': '#a1887f',
                '--color-path-dark': '#5d4037'
            },
            weatherWeights: { clear: 0.4, rain: 0.2, wind: 0.4, snow: 0.0 }
        },
        winter: {
            name: 'Winter',
            colors: {
                '--color-bg': '#e0f7fa', // Very light blue
                '--color-grass': '#ffffff', // Snow
                '--color-grass-light': '#f5f5f5',
                '--color-grass-dark': '#e0e0e0',
                '--color-path': '#b0bec5', // Grey ice
                '--color-path-light': '#cfd8dc',
                '--color-path-dark': '#90a4ae'
            },
            weatherWeights: { clear: 0.3, rain: 0.0, wind: 0.2, snow: 0.5 }
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

        // 2. Notify Weather System (if possible)
        // We'll update a global or expose a getter, 
        // but for now Weather.js might need an update to ask Seasons.js
        // Or we just rely on random for now, and implement weighted random next.
        // Let's stick to update CSS for visually distinct seasons first.

        // Console log for debug
        console.log("Season set to: " + config.name);
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
