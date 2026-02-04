/**
 * CSS Tower Defense - Sound Effects System
 * Uses Web Audio API for game sounds with spatial audio support
 * Uses Howler.js for background music playback
 */

var Sfx = (function() {
    'use strict';

    // Audio context
    var audioContext = null;
    var masterGain = null;
    var muted = false;
    var volume = 0.5;
    var musicVolume = 0.3;

    // Howler.js music instances
    var music = {
        menu: null,      // Hall/menu music
        playing: null,   // In-game music
        victory: null,   // Victory music
        defeat: null     // Defeat music
    };

    // Howler.js sound effect instances
    var howlEffects = {
        button: null,    // UI click
        ready: null,     // Wave start
        place: null,     // Tower placement (reset.mp3)
        upgrade: null,   // Upgrade/buff
        warning: null,   // Boss warning
        death: null,     // Enemy death
        blasts: []       // Explosion sounds
    };

    // Current playing music track
    var currentMusic = null;

    // Spatial audio listener
    var listener = null;
    var spatialEnabled = false;

    // Map dimensions for spatial calculations
    var mapWidth = 720;  // 12 cols * 60px
    var mapHeight = 480; // 8 rows * 60px

    // Sound definitions (synthesized sounds)
    var sounds = {};
    
    /**
     * Initialize the sound system
     */
    function init() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioContext.createGain();
            masterGain.gain.value = volume;
            masterGain.connect(audioContext.destination);

            // Initialize spatial audio
            initSpatialAudio();

            // Pre-generate sounds
            generateSounds();

            // Initialize Howler.js music and effects
            initHowlerAudio();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    /**
     * Initialize Howler.js music and sound effects
     */
    function initHowlerAudio() {
        if (typeof Howl === 'undefined') {
            console.warn('Howler.js not loaded, music disabled');
            return;
        }

        // Background music tracks
        music.menu = new Howl({
            src: ['assets/sfx/musics/hall.mp3'],
            loop: true,
            volume: musicVolume,
            preload: true
        });

        music.playing = new Howl({
            src: ['assets/sfx/musics/gameing.mp3'],
            loop: true,
            volume: musicVolume,
            preload: true
        });

        music.victory = new Howl({
            src: ['assets/sfx/musics/win.mp3'],
            loop: false,
            volume: musicVolume,
            preload: true
        });

        music.defeat = new Howl({
            src: ['assets/sfx/musics/fail.mp3'],
            loop: false,
            volume: musicVolume,
            preload: true
        });

        // Sound effects using Howler
        howlEffects.button = new Howl({
            src: ['assets/sfx/effects/button.mp3'],
            volume: volume,
            preload: true
        });

        howlEffects.ready = new Howl({
            src: ['assets/sfx/effects/ready.mp3'],
            volume: volume,
            preload: true
        });

        howlEffects.place = new Howl({
            src: ['assets/sfx/effects/reset.mp3'],
            volume: volume,
            preload: true
        });

        howlEffects.upgrade = new Howl({
            src: ['assets/sfx/effects/buff.mp3'],
            volume: volume,
            preload: true
        });

        howlEffects.warning = new Howl({
            src: ['assets/sfx/effects/warn.mp3'],
            volume: volume,
            preload: true
        });

        howlEffects.death = new Howl({
            src: ['assets/sfx/effects/death.wav'],
            volume: volume * 0.5,
            preload: true
        });

        // Load blast sounds
        for (var i = 1; i <= 5; i++) {
            howlEffects.blasts.push(new Howl({
                src: ['assets/sfx/blasts/blast' + i + '.mp3'],
                volume: volume * 0.6,
                preload: true
            }));
        }
    }

    /**
     * Initialize spatial audio listener
     */
    function initSpatialAudio() {
        if (!audioContext) return;

        try {
            listener = audioContext.listener;

            // Set listener position at center of map
            if (listener.positionX) {
                // Modern API
                listener.positionX.value = 0;
                listener.positionY.value = 0;
                listener.positionZ.value = 3; // Above the map plane
            } else if (listener.setPosition) {
                // Legacy API
                listener.setPosition(0, 0, 3);
            }

            // Set listener orientation (looking down at map)
            if (listener.forwardX) {
                listener.forwardX.value = 0;
                listener.forwardY.value = 0;
                listener.forwardZ.value = -1;
                listener.upX.value = 0;
                listener.upY.value = 1;
                listener.upZ.value = 0;
            } else if (listener.setOrientation) {
                listener.setOrientation(0, 0, -1, 0, 1, 0);
            }

            spatialEnabled = true;
        } catch (e) {
            console.warn('Spatial audio not supported:', e);
            spatialEnabled = false;
        }
    }
    
    /**
     * Generate synthesized sounds
     */
    function generateSounds() {
        // Define sound parameters for different effects
        sounds = {
            // UI sounds
            start: { type: 'sine', freq: 440, duration: 0.3, slide: 880 },
            error: { type: 'sawtooth', freq: 200, duration: 0.2, slide: 100 },
            place: { type: 'square', freq: 330, duration: 0.1, slide: 440 },
            sell: { type: 'sine', freq: 550, duration: 0.15, slide: 330 },
            upgrade: { type: 'sine', freq: 440, duration: 0.2, slide: 880, harmonics: true },

            // Combat sounds
            shoot_arrow: { type: 'noise', duration: 0.05, filter: 3000 },
            shoot_cannon: { type: 'noise', duration: 0.15, filter: 500, gain: 0.8 },
            shoot_ice: { type: 'sine', freq: 1200, duration: 0.1, slide: 800 },
            shoot_magic: { type: 'sine', freq: 600, duration: 0.15, slide: 1200, harmonics: true },
            shoot_tesla: { type: 'sawtooth', freq: 800, duration: 0.08, slide: 2000, gain: 0.4 },
            shoot_flame: { type: 'noise', duration: 0.1, filter: 800, gain: 0.3 },
            kill: { type: 'noise', duration: 0.1, filter: 2000 },
            damage: { type: 'sawtooth', freq: 150, duration: 0.2, slide: 80 },

            // Wave sounds
            waveStart: { type: 'square', freq: 330, duration: 0.3, pattern: [1, 0, 1, 0, 1] },
            waveComplete: { type: 'sine', freq: 440, duration: 0.5, pattern: [1, 1.25, 1.5] },

            // Boss sounds
            bossSpawn: { type: 'sawtooth', freq: 80, duration: 1.5, slide: 40, gain: 0.6 },
            bossSkill: { type: 'sine', freq: 200, duration: 0.3, slide: 600, harmonics: true },

            // Game state sounds
            gameOver: { type: 'sawtooth', freq: 400, duration: 0.8, slide: 100 },
            victory: { type: 'sine', freq: 523, duration: 0.8, pattern: [1, 1.25, 1.5, 2] }
        };
    }
    
    /**
     * Play a sound effect
     */
    function play(soundName) {
        if (!audioContext || muted) return;
        
        var sound = sounds[soundName];
        if (!sound) return;
        
        // Resume audio context if suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        try {
            if (sound.pattern) {
                playPattern(sound);
            } else if (sound.type === 'noise') {
                playNoise(sound);
            } else {
                playTone(sound);
            }
        } catch (e) {
            console.warn('Error playing sound:', e);
        }
    }
    
    /**
     * Play a simple tone
     */
    function playTone(sound) {
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();
        
        osc.type = sound.type || 'sine';
        osc.frequency.value = sound.freq || 440;
        
        // Frequency slide
        if (sound.slide) {
            osc.frequency.linearRampToValueAtTime(
                sound.slide,
                audioContext.currentTime + sound.duration
            );
        }
        
        // Gain envelope
        gain.gain.value = sound.gain || 0.3;
        gain.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + sound.duration
        );
        
        osc.connect(gain);
        
        // Add harmonics for richer sound
        if (sound.harmonics) {
            var osc2 = audioContext.createOscillator();
            var gain2 = audioContext.createGain();
            osc2.type = sound.type;
            osc2.frequency.value = (sound.freq || 440) * 2;
            gain2.gain.value = 0.15;
            gain2.gain.exponentialRampToValueAtTime(
                0.01,
                audioContext.currentTime + sound.duration
            );
            osc2.connect(gain2);
            gain2.connect(masterGain);
            osc2.start();
            osc2.stop(audioContext.currentTime + sound.duration);
        }
        
        gain.connect(masterGain);
        osc.start();
        osc.stop(audioContext.currentTime + sound.duration);
    }
    
    /**
     * Play a noise sound (for impacts, shots)
     */
    function playNoise(sound) {
        var bufferSize = audioContext.sampleRate * sound.duration;
        var buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        var data = buffer.getChannelData(0);
        
        // Generate white noise
        for (var i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        var source = audioContext.createBufferSource();
        source.buffer = buffer;
        
        // Apply filter
        var filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = sound.filter || 1000;
        
        var gain = audioContext.createGain();
        gain.gain.value = sound.gain || 0.2;
        gain.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + sound.duration
        );
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        
        source.start();
        source.stop(audioContext.currentTime + sound.duration);
    }
    
    /**
     * Play a pattern of tones (for melodies)
     */
    function playPattern(sound) {
        var pattern = sound.pattern;
        var baseFreq = sound.freq || 440;
        var noteDuration = sound.duration / pattern.length;
        
        for (var i = 0; i < pattern.length; i++) {
            (function(index, multiplier) {
                setTimeout(function() {
                    if (multiplier === 0) return; // Rest
                    
                    var osc = audioContext.createOscillator();
                    var gain = audioContext.createGain();
                    
                    osc.type = sound.type || 'sine';
                    osc.frequency.value = baseFreq * multiplier;
                    
                    gain.gain.value = 0.3;
                    gain.gain.exponentialRampToValueAtTime(
                        0.01,
                        audioContext.currentTime + noteDuration * 0.8
                    );
                    
                    osc.connect(gain);
                    gain.connect(masterGain);
                    
                    osc.start();
                    osc.stop(audioContext.currentTime + noteDuration * 0.8);
                }, index * noteDuration * 1000);
            })(i, pattern[i]);
        }
    }
    
    /**
     * Set volume (0-1)
     */
    function setVolume(value) {
        volume = Math.max(0, Math.min(1, value));
        if (masterGain) {
            masterGain.gain.value = volume;
        }
    }
    
    /**
     * Get current volume
     */
    function getVolume() {
        return volume;
    }
    
    /**
     * Mute/unmute
     */
    function toggleMute() {
        muted = !muted;
        if (masterGain) {
            masterGain.gain.value = muted ? 0 : volume;
        }
        return muted;
    }
    
    /**
     * Check if muted
     */
    function isMuted() {
        return muted;
    }

    /**
     * Play a sound with spatial positioning
     * @param {string} soundName - Sound name to play
     * @param {number} x - World X position (relative to map center)
     * @param {number} y - World Y position (relative to map center)
     */
    function playSpatial(soundName, x, y) {
        if (!audioContext || muted || !spatialEnabled) {
            // Fall back to regular play
            play(soundName);
            return;
        }

        var sound = sounds[soundName];
        if (!sound) return;

        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        try {
            // Normalize position to audio space (-1 to 1 range)
            var normalizedX = (x / (mapWidth / 2)) * 2;
            var normalizedY = (y / (mapHeight / 2)) * 2;

            // Clamp to reasonable range
            normalizedX = Math.max(-3, Math.min(3, normalizedX));
            normalizedY = Math.max(-3, Math.min(3, normalizedY));

            // Create panner node for spatial audio
            var panner = audioContext.createStereoPanner
                ? createStereoPanner(normalizedX)
                : createPanner3D(normalizedX, normalizedY);

            // Play the sound through the panner
            playSpatialTone(sound, panner);

        } catch (e) {
            console.warn('Error playing spatial sound:', e);
            // Fallback to regular play
            play(soundName);
        }
    }

    /**
     * Create a simple stereo panner (fallback for browsers without full 3D)
     */
    function createStereoPanner(x) {
        var panner = audioContext.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, x));
        panner.connect(masterGain);
        return panner;
    }

    /**
     * Create a 3D panner node
     */
    function createPanner3D(x, y) {
        var panner = audioContext.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 10;
        panner.rolloffFactor = 1;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 0;
        panner.coneOuterGain = 0;

        if (panner.positionX) {
            panner.positionX.value = x;
            panner.positionY.value = y;
            panner.positionZ.value = 0;
        } else {
            panner.setPosition(x, y, 0);
        }

        panner.connect(masterGain);
        return panner;
    }

    /**
     * Play a tone through a panner node
     */
    function playSpatialTone(sound, panner) {
        if (sound.type === 'noise') {
            playSpatialNoise(sound, panner);
        } else {
            var osc = audioContext.createOscillator();
            var gain = audioContext.createGain();

            osc.type = sound.type || 'sine';
            osc.frequency.value = sound.freq || 440;

            if (sound.slide) {
                osc.frequency.linearRampToValueAtTime(
                    sound.slide,
                    audioContext.currentTime + sound.duration
                );
            }

            gain.gain.value = sound.gain || 0.3;
            gain.gain.exponentialRampToValueAtTime(
                0.01,
                audioContext.currentTime + sound.duration
            );

            osc.connect(gain);
            gain.connect(panner);

            osc.start();
            osc.stop(audioContext.currentTime + sound.duration);
        }
    }

    /**
     * Play noise through a panner node
     */
    function playSpatialNoise(sound, panner) {
        var bufferSize = audioContext.sampleRate * sound.duration;
        var buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        var data = buffer.getChannelData(0);

        for (var i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        var source = audioContext.createBufferSource();
        source.buffer = buffer;

        var filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = sound.filter || 1000;

        var gain = audioContext.createGain();
        gain.gain.value = sound.gain || 0.2;
        gain.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + sound.duration
        );

        source.connect(filter);
        filter.connect(gain);
        gain.connect(panner);

        source.start();
        source.stop(audioContext.currentTime + sound.duration);
    }

    /**
     * Set map dimensions for spatial audio calculations
     */
    function setMapDimensions(width, height) {
        mapWidth = width;
        mapHeight = height;
    }

    // =========================================
    // MUSIC CONTROL (Howler.js)
    // =========================================

    /**
     * Play background music for a specific game state
     * @param {string} track - 'menu', 'playing', 'victory', or 'defeat'
     */
    function playMusic(track) {
        if (!music[track]) return;
        if (muted) return;

        // Stop current music with fade
        stopMusic(function() {
            currentMusic = track;
            music[track].play();
            music[track].fade(0, musicVolume, 500);
        });
    }

    /**
     * Stop current music with optional fade
     * @param {function} callback - Called after music stops
     */
    function stopMusic(callback) {
        if (currentMusic && music[currentMusic]) {
            var current = music[currentMusic];
            current.fade(musicVolume, 0, 300);
            current.once('fade', function() {
                current.stop();
                if (callback) callback();
            });
        } else {
            if (callback) callback();
        }
    }

    /**
     * Pause current music
     */
    function pauseMusic() {
        if (currentMusic && music[currentMusic]) {
            music[currentMusic].pause();
        }
    }

    /**
     * Resume current music
     */
    function resumeMusic() {
        if (currentMusic && music[currentMusic] && !muted) {
            music[currentMusic].play();
        }
    }

    /**
     * Set music volume (0-1)
     */
    function setMusicVolume(value) {
        musicVolume = Math.max(0, Math.min(1, value));
        // Update volume on all music tracks
        Object.keys(music).forEach(function(key) {
            if (music[key]) {
                music[key].volume(musicVolume);
            }
        });
    }

    /**
     * Get music volume
     */
    function getMusicVolume() {
        return musicVolume;
    }

    // =========================================
    // HOWLER SOUND EFFECTS
    // =========================================

    /**
     * Play a Howler.js sound effect
     * @param {string} name - Effect name: 'button', 'ready', 'place', 'upgrade', 'warning', 'death', 'blast'
     */
    function playEffect(name) {
        if (muted) return;

        if (name === 'blast') {
            // Play random blast sound
            if (howlEffects.blasts.length > 0) {
                var idx = Math.floor(Math.random() * howlEffects.blasts.length);
                howlEffects.blasts[idx].play();
            }
        } else if (howlEffects[name]) {
            howlEffects[name].play();
        }
    }

    /**
     * Updated toggleMute to also affect music
     */
    var originalToggleMute = toggleMute;
    toggleMute = function() {
        muted = !muted;
        if (masterGain) {
            masterGain.gain.value = muted ? 0 : volume;
        }
        // Also control music
        if (muted) {
            pauseMusic();
        } else {
            resumeMusic();
        }
        return muted;
    };

    // Public API
    return {
        init: init,
        play: play,
        playSpatial: playSpatial,
        playEffect: playEffect,
        playMusic: playMusic,
        stopMusic: stopMusic,
        pauseMusic: pauseMusic,
        resumeMusic: resumeMusic,
        setVolume: setVolume,
        getVolume: getVolume,
        setMusicVolume: setMusicVolume,
        getMusicVolume: getMusicVolume,
        toggleMute: toggleMute,
        isMuted: isMuted,
        setMapDimensions: setMapDimensions
    };
})();
