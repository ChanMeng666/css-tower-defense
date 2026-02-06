/**
 * CSS Tower Defense - Weather & Day/Night System
 * Wave-driven day/night cycle with gameplay modifiers
 */

var Weather = (function () {
    'use strict';

    // Weather types
    var WEATHER_TYPES = ['clear', 'rain', 'snow', 'wind'];
    var WEATHER_DURATION_MIN = 10;
    var WEATHER_DURATION_MAX = 20;

    // Day/Night gameplay modifiers
    var DAYNIGHT_MODIFIERS = {
        day: {
            towerRange: 1.10,
            enemySpeed: 1.0,
            gold: 1.0
        },
        night: {
            towerRange: 0.85,
            enemySpeed: 1.10,
            gold: 1.20
        }
    };

    // Weather gameplay modifiers - Māori tower names
    var WEATHER_MODIFIERS = {
        clear: {
            towerRange: 1.05,
            enemySpeed: 1.0,
            gold: 1.0,
            tower: {}
        },
        rain: {
            towerRange: 0.90,
            enemySpeed: 0.95,
            gold: 1.0,
            tower: {
                mahuika: { fireRate: 0.85 },
                tawhiri: { chainRange: 1.20 }
            }
        },
        snow: {
            towerRange: 0.85,
            enemySpeed: 0.85,
            gold: 1.10,
            tower: {
                mahuika: { damage: 0.90 },
                tangaroa: { slowDuration: 1.20 }
            }
        },
        wind: {
            towerRange: 1.0,
            enemySpeed: 1.05,
            gold: 1.0,
            tower: {
                taiaha: { range: 1.20 },
                mere: { splashRadius: 1.15 },
                tohunga: { range: 0.90 }
            }
        }
    };

    // Blood Moon modifiers (override normal night, not stack)
    var BLOOD_MOON_MODIFIERS = {
        towerRange: 0.80,
        enemySpeed: 1.15,
        gold: 1.50
    };

    // State
    var nightState = false; // false = day, true = night
    var currentWeather = 'clear';
    var weatherTimer = 0;
    var bloodMoonActive = false;

    // DOM Elements
    var scene = null;
    var skyContainer = null;
    var rainContainer = null;
    var snowContainer = null;
    var windContainer = null;

    /**
     * Initialize weather system
     */
    function init() {
        scene = document.getElementById('scene');
        skyContainer = document.querySelector('.sky-body-container');
        rainContainer = document.querySelector('.rain-container');
        snowContainer = document.querySelector('.snow-container');
        windContainer = document.querySelector('.wind-container');

        // Initial state: day, clear
        nightState = false;
        currentWeather = 'clear';
        bloodMoonActive = false;
        setWeather('clear');
        setDayNight(false);

        // Generate particles
        createRainParticles();
        createSnowParticles();
        createWindParticles();

        // Listen for wave start to set day/night
        document.addEventListener('waveStarted', function (e) {
            var waveNum = e.detail.wave; // 1-indexed
            var isNightWave = (waveNum % 2 === 0); // Even waves = night
            setDayNight(isNightWave, waveNum);

            // Pick weather for the wave using seasonal weights
            pickSeasonalWeather();
        });
    }

    /**
     * Set day/night state based on wave number
     * Sun is at top (12 o'clock), moon at bottom (6 o'clock) in the container.
     * 0° = sun at top (day), 180° = moon at top (night).
     * Cumulative rotation ensures smooth continuous clockwise animation.
     */
    function setDayNight(isNight, waveNum) {
        nightState = isNight;

        if (scene) {
            if (isNight) {
                scene.classList.add('night');
                scene.classList.remove('day');
            } else {
                scene.classList.add('day');
                scene.classList.remove('night');
            }
        }

        // Cumulative rotation: wave 1 = 0°, wave 2 = 180°, wave 3 = 360°, ...
        // Always increasing so CSS transition animates forward smoothly
        if (skyContainer) {
            var rotation = ((waveNum || 1) - 1) * 180;
            skyContainer.style.transform = 'rotate(' + rotation + 'deg)';
        }
    }

    function createRainParticles() {
        if (!rainContainer) return;
        var html = '';
        for (var i = 0; i < 50; i++) {
            var delay = Math.random() * 1;
            var duration = 0.5 + Math.random() * 0.3;
            var left = Math.random() * 100;
            html += '<div class="rain-drop" style="left:' + left + '%; animation-delay:-' + delay + 's; animation-duration:' + duration + 's"></div>';
        }
        rainContainer.innerHTML = html;
    }

    function createSnowParticles() {
        if (!snowContainer) return;
        var html = '';
        for (var i = 0; i < 40; i++) {
            var delay = Math.random() * 5;
            var duration = 3 + Math.random() * 2;
            var left = Math.random() * 100;
            html += '<div class="snow-flake" style="left:' + left + '%; animation-delay:-' + delay + 's; animation-duration:' + duration + 's"></div>';
        }
        snowContainer.innerHTML = html;
    }

    function createWindParticles() {
        if (!windContainer) return;
        var html = '';
        for (var i = 0; i < 15; i++) {
            var delay = Math.random() * 2;
            var duration = 1 + Math.random() * 1;
            var top = Math.random() * 100;
            html += '<div class="wind-line" style="top:' + top + '%; animation-delay:-' + delay + 's; animation-duration:' + duration + 's"></div>';
        }
        windContainer.innerHTML = html;
    }

    /**
     * Update loop - only handles weather timer now (day/night is wave-driven)
     */
    function update(dt) {
        updateWeather(dt);
    }

    function updateWeather(dt) {
        weatherTimer -= dt;
        if (weatherTimer <= 0) {
            pickSeasonalWeather();
        }
    }

    /**
     * Pick weather using seasonal weights from Seasons module
     */
    function pickSeasonalWeather() {
        weatherTimer = WEATHER_DURATION_MIN + Math.random() * (WEATHER_DURATION_MAX - WEATHER_DURATION_MIN);

        var weights = null;
        if (typeof Seasons !== 'undefined' && Seasons.getWeatherWeights) {
            weights = Seasons.getWeatherWeights();
        }

        if (weights) {
            // Weighted random selection
            var roll = Math.random();
            var cumulative = 0;
            for (var i = 0; i < WEATHER_TYPES.length; i++) {
                var type = WEATHER_TYPES[i];
                cumulative += (weights[type] || 0);
                if (roll < cumulative) {
                    setWeather(type);
                    return;
                }
            }
            // Fallback
            setWeather('clear');
        } else {
            // Fallback: 70% clear, 10% each other
            if (Math.random() < 0.7) {
                setWeather('clear');
            } else {
                var type = WEATHER_TYPES[1 + Math.floor(Math.random() * (WEATHER_TYPES.length - 1))];
                setWeather(type);
            }
        }
    }

    function setWeather(type) {
        var oldWeather = currentWeather;
        if (oldWeather === type) return;
        currentWeather = type;

        // Hide all
        if (rainContainer) rainContainer.classList.add('hidden');
        if (snowContainer) snowContainer.classList.add('hidden');
        if (windContainer) windContainer.classList.add('hidden');

        // Reset weather classes on scene, preserving day/night and aurora
        if (scene) {
            scene.classList.remove('weather-rain', 'weather-snow', 'weather-wind');
        }

        // Show new
        switch (type) {
            case 'rain':
                if (rainContainer) rainContainer.classList.remove('hidden');
                if (scene) scene.classList.add('weather-rain');
                break;
            case 'snow':
                if (snowContainer) snowContainer.classList.remove('hidden');
                if (scene) scene.classList.add('weather-snow');
                break;
            case 'wind':
                if (windContainer) windContainer.classList.remove('hidden');
                if (scene) scene.classList.add('weather-wind');
                break;
        }

        // Dispatch event for other systems
        if (typeof emitGameEvent === 'function') {
            emitGameEvent('weatherChanged', { weather: type, previous: oldWeather });
        }
    }

    // =========================================
    // Modifier API
    // =========================================

    /**
     * Is it currently night?
     */
    function isNight() {
        return nightState;
    }

    /**
     * Set blood moon state (called by Wave system)
     */
    function setBloodMoon(active) {
        bloodMoonActive = active;
    }

    /**
     * Get combined range multiplier from day/night + weather
     */
    function getRangeMultiplier() {
        var dayNight;
        if (bloodMoonActive) {
            dayNight = BLOOD_MOON_MODIFIERS.towerRange;
        } else {
            dayNight = nightState ? DAYNIGHT_MODIFIERS.night.towerRange : DAYNIGHT_MODIFIERS.day.towerRange;
        }
        var weather = WEATHER_MODIFIERS[currentWeather].towerRange;
        return dayNight * weather;
    }

    /**
     * Get combined enemy speed multiplier from day/night + weather
     */
    function getEnemySpeedMultiplier() {
        var dayNight;
        if (bloodMoonActive) {
            dayNight = BLOOD_MOON_MODIFIERS.enemySpeed;
        } else {
            dayNight = nightState ? DAYNIGHT_MODIFIERS.night.enemySpeed : DAYNIGHT_MODIFIERS.day.enemySpeed;
        }
        var weather = WEATHER_MODIFIERS[currentWeather].enemySpeed;
        return dayNight * weather;
    }

    /**
     * Get combined gold multiplier from day/night + weather
     */
    function getGoldMultiplier() {
        var dayNight;
        if (bloodMoonActive) {
            dayNight = BLOOD_MOON_MODIFIERS.gold;
        } else {
            dayNight = nightState ? DAYNIGHT_MODIFIERS.night.gold : DAYNIGHT_MODIFIERS.day.gold;
        }
        var weather = WEATHER_MODIFIERS[currentWeather].gold;
        return dayNight * weather;
    }

    /**
     * Get tower-specific modifier from weather
     * @param {string} towerType - e.g. 'flame', 'ice', 'tesla'
     * @param {string} stat - e.g. 'damage', 'fireRate', 'range', 'slowDuration', 'chainRange', 'splashRadius'
     * @returns {number} multiplier (1.0 = no change)
     */
    function getTowerModifier(towerType, stat) {
        var weatherMods = WEATHER_MODIFIERS[currentWeather];
        if (weatherMods.tower && weatherMods.tower[towerType] && weatherMods.tower[towerType][stat]) {
            return weatherMods.tower[towerType][stat];
        }
        return 1.0;
    }

    /**
     * Get current weather type
     */
    function getCurrentWeather() {
        return currentWeather;
    }

    /**
     * Is blood moon active?
     */
    function isBloodMoon() {
        return bloodMoonActive;
    }

    return {
        init: init,
        update: update,
        isNight: isNight,
        setBloodMoon: setBloodMoon,
        isBloodMoon: isBloodMoon,
        getRangeMultiplier: getRangeMultiplier,
        getEnemySpeedMultiplier: getEnemySpeedMultiplier,
        getGoldMultiplier: getGoldMultiplier,
        getTowerModifier: getTowerModifier,
        getCurrentWeather: getCurrentWeather
    };
})();
