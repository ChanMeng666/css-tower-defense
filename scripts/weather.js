/**
 * CSS Tower Defense - Weather & Day/Night System
 * Controls atmospheric effects and time cycle
 */

var Weather = (function () {
    'use strict';

    // Configuration
    var DAY_LENGTH = 60; // Seconds for full 24h cycle
    var WEATHER_TYPES = ['clear', 'rain', 'snow', 'wind'];
    var WEATHER_CHANCE = 0.3; // 30% chance to change weather
    var WEATHER_DURATION_MIN = 10;
    var WEATHER_DURATION_MAX = 20;

    // State
    var time = 0; // 0 to DAY_LENGTH
    var currentWeather = 'clear';
    var weatherTimer = 0;

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

        // Initial weather
        setWeather('clear');

        // Generate particles
        createRainParticles();
        createSnowParticles();
        createWindParticles();
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
     * Update loop
     */
    function update(dt) {
        // Update Time
        time += dt;
        if (time >= DAY_LENGTH) {
            time = 0;
        }

        // Update Sky Rotation (0 to 360 degrees)
        // Noon is at 25% (90deg), Midnight at 75% (270deg)
        // Let's say 0 is sunrise (left horizon)
        var rotation = (time / DAY_LENGTH) * 360;
        if (skyContainer) {
            skyContainer.style.transform = 'rotate(' + rotation + 'deg)';
        }

        // Update Day/Night Classes
        updateDayNightState(rotation);

        // Update Weather
        updateWeather(dt);
    }

    function updateDayNightState(rotation) {
        // Simple day/night switching based on rotation
        // Day: 0-180 (Sun visible), Night: 180-360 (Moon visible)
        // Background color handled in CSS via animation synced to same duration, or we set class

        var isNight = (rotation > 180);
        if (scene) {
            if (isNight) {
                scene.classList.add('night');
                scene.classList.remove('day');
            } else {
                scene.classList.add('day');
                scene.classList.remove('night');
            }
        }
    }

    function updateWeather(dt) {
        weatherTimer -= dt;
        if (weatherTimer <= 0) {
            // Change weather
            pickRandomWeather();
        }
    }

    function pickRandomWeather() {
        weatherTimer = WEATHER_DURATION_MIN + Math.random() * (WEATHER_DURATION_MAX - WEATHER_DURATION_MIN);

        if (Math.random() < WEATHER_CHANCE) {
            // Pick a new non-clear weather
            var type = WEATHER_TYPES[1 + Math.floor(Math.random() * (WEATHER_TYPES.length - 1))];
            setWeather(type);
        } else {
            setWeather('clear');
        }
    }

    function setWeather(type) {
        if (currentWeather === type) return;
        currentWeather = type;

        // Hide all
        if (rainContainer) rainContainer.classList.add('hidden');
        if (snowContainer) snowContainer.classList.add('hidden');
        if (windContainer) windContainer.classList.add('hidden');
        if (scene) scene.className = 'scene ' + (scene.classList.contains('night') ? 'night' : 'day'); // Reset weather classes

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

        // console.log('Weather changed to:', type);
    }

    return {
        init: init,
        update: update
    };
})();
