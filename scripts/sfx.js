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
    var compressor = null;
    var noiseBuffer = null;
    var reverbBuffer = null;
    var activeSounds = 0;
    var MAX_CONCURRENT = 20;

    /**
     * Initialize the sound system
     */
    function init() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create dynamics compressor for punch
            compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.value = -12;
            compressor.knee.value = 10;
            compressor.ratio.value = 4;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            masterGain = audioContext.createGain();
            masterGain.gain.value = volume;
            masterGain.connect(compressor);
            compressor.connect(audioContext.destination);

            // Pre-generate white noise buffer (1s)
            noiseBuffer = generateNoiseBuffer(1.0);

            // Generate reverb impulse response
            reverbBuffer = generateImpulseResponse(0.8);

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
     * Generate a white noise buffer
     */
    function generateNoiseBuffer(duration) {
        var length = audioContext.sampleRate * duration;
        var buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    /**
     * Generate impulse response for reverb
     */
    function generateImpulseResponse(duration) {
        var length = audioContext.sampleRate * duration;
        var buffer = audioContext.createBuffer(2, length, audioContext.sampleRate);
        for (var ch = 0; ch < 2; ch++) {
            var data = buffer.getChannelData(ch);
            for (var i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
            }
        }
        return buffer;
    }

    /**
     * Create a reverb send node
     */
    function createReverbSend(wetAmount) {
        if (!reverbBuffer) return masterGain;
        var convolver = audioContext.createConvolver();
        convolver.buffer = reverbBuffer;
        var wetGain = audioContext.createGain();
        wetGain.gain.value = wetAmount || 0.3;
        convolver.connect(wetGain);
        wetGain.connect(masterGain);
        return convolver;
    }

    /**
     * Generate synthesized sounds
     */
    function generateSounds() {
        sounds = {
            // UI sounds
            start: { layers: [
                { type: 'sine', freq: 440, duration: 0.15, slide: 660 },
                { type: 'sine', freq: 880, duration: 0.15, slide: 1320, gain: 0.15, delay: 0.08 }
            ]},
            error: { layers: [
                { type: 'sawtooth', freq: 200, duration: 0.2, slide: 100, gain: 0.2 }
            ]},
            place: { layers: [
                { type: 'square', freq: 330, duration: 0.08, slide: 440, gain: 0.2 },
                { type: 'noise', duration: 0.04, filter: 4000, gain: 0.1 }
            ]},
            sell: { layers: [
                { type: 'sine', freq: 550, duration: 0.12, slide: 330, gain: 0.25 }
            ]},
            upgrade: { layers: [
                { type: 'sine', freq: 440, duration: 0.15, slide: 880, gain: 0.25 },
                { type: 'sine', freq: 880, duration: 0.15, slide: 1760, gain: 0.12 },
                { type: 'triangle', freq: 220, duration: 0.2, gain: 0.1 }
            ]},

            // Combat sounds - enhanced with layers
            shoot_arrow: { layers: [
                { type: 'sawtooth', freq: 600, duration: 0.06, slide: 300, gain: 0.15, filter: 2000 },
                { type: 'noise', duration: 0.08, filter: 6000, gain: 0.1 }
            ]},
            shoot_cannon: { layers: [
                { type: 'noise', duration: 0.15, filter: 400, gain: 0.5 },
                { type: 'sine', freq: 60, duration: 0.2, slide: 30, gain: 0.4 },
                { type: 'noise', duration: 0.03, filter: 8000, gain: 0.15 }
            ]},
            shoot_ice: { layers: [
                { type: 'sine', freq: 1200, duration: 0.1, slide: 800, gain: 0.2 },
                { type: 'sine', freq: 1205, duration: 0.12, slide: 795, gain: 0.1 },
                { type: 'noise', duration: 0.06, filter: 8000, gain: 0.05 }
            ]},
            shoot_magic: { layers: [
                { type: 'sine', freq: 600, duration: 0.2, slide: 1200, gain: 0.2, reverb: 0.4 },
                { type: 'sine', freq: 300, duration: 0.25, slide: 150, gain: 0.1 },
                { type: 'noise', duration: 0.15, filter: 3000, gain: 0.05 }
            ]},
            shoot_tesla: { layers: [
                { type: 'sawtooth', freq: 800, duration: 0.06, slide: 2000, gain: 0.2 },
                { type: 'square', freq: 100, duration: 0.04, gain: 0.1 },
                { type: 'noise', duration: 0.05, filter: 5000, gain: 0.08 }
            ]},
            shoot_flame: { layers: [
                { type: 'noise', duration: 0.12, filter: 600, filterType: 'bandpass', gain: 0.25 },
                { type: 'sine', freq: 80, duration: 0.15, gain: 0.15 },
                { type: 'noise', duration: 0.08, filter: 3000, gain: 0.06 }
            ]},
            kill: { layers: [
                { type: 'noise', duration: 0.08, filter: 2000, gain: 0.2 },
                { type: 'sine', freq: 800, duration: 0.12, slide: 400, gain: 0.15 }
            ]},
            damage: { layers: [
                { type: 'sawtooth', freq: 150, duration: 0.2, slide: 80, gain: 0.25 }
            ]},

            // Wave sounds
            waveStart: { layers: [
                { type: 'square', freq: 330, duration: 0.1, gain: 0.2 },
                { type: 'square', freq: 440, duration: 0.1, gain: 0.2, delay: 0.12 },
                { type: 'square', freq: 550, duration: 0.15, gain: 0.2, delay: 0.24 }
            ]},
            waveComplete: { layers: [
                { type: 'sine', freq: 440, duration: 0.12, gain: 0.25 },
                { type: 'sine', freq: 550, duration: 0.12, gain: 0.25, delay: 0.1 },
                { type: 'sine', freq: 660, duration: 0.15, gain: 0.25, delay: 0.2 },
                { type: 'sine', freq: 880, duration: 0.2, gain: 0.2, delay: 0.3 }
            ]},

            // Boss sounds
            bossSpawn: { layers: [
                { type: 'sawtooth', freq: 80, duration: 1.5, slide: 40, gain: 0.35 },
                { type: 'sine', freq: 40, duration: 1.5, slide: 20, gain: 0.3 },
                { type: 'noise', duration: 1.0, filter: 200, gain: 0.15 }
            ]},
            bossSkill: { layers: [
                { type: 'sine', freq: 200, duration: 0.3, slide: 600, gain: 0.25 },
                { type: 'sine', freq: 400, duration: 0.3, slide: 1200, gain: 0.12 }
            ]},

            // Game state sounds
            gameOver: { layers: [
                { type: 'sawtooth', freq: 400, duration: 0.3, slide: 200, gain: 0.25 },
                { type: 'sawtooth', freq: 300, duration: 0.3, slide: 100, gain: 0.2, delay: 0.25 },
                { type: 'sawtooth', freq: 200, duration: 0.5, slide: 80, gain: 0.2, delay: 0.5 }
            ]},
            victory: { layers: [
                { type: 'sine', freq: 523, duration: 0.15, gain: 0.25 },
                { type: 'sine', freq: 659, duration: 0.15, gain: 0.25, delay: 0.12 },
                { type: 'sine', freq: 784, duration: 0.15, gain: 0.25, delay: 0.24 },
                { type: 'sine', freq: 1047, duration: 0.3, gain: 0.2, delay: 0.36 }
            ]},

            // New sounds
            comboKill: { layers: [
                { type: 'sine', freq: 880, duration: 0.08, gain: 0.2 },
                { type: 'sine', freq: 1100, duration: 0.1, gain: 0.2, delay: 0.06 }
            ]},
            reforge: { layers: [
                { type: 'noise', duration: 0.05, filter: 5000, gain: 0.3 },
                { type: 'sine', freq: 800, duration: 0.1, slide: 1200, gain: 0.2, delay: 0.03 },
                { type: 'triangle', freq: 2000, duration: 0.15, slide: 1000, gain: 0.1, delay: 0.05 }
            ]},
            achievement: { layers: [
                { type: 'sine', freq: 523, duration: 0.1, gain: 0.2 },
                { type: 'sine', freq: 659, duration: 0.1, gain: 0.2, delay: 0.08 },
                { type: 'sine', freq: 784, duration: 0.1, gain: 0.2, delay: 0.16 },
                { type: 'sine', freq: 1047, duration: 0.1, gain: 0.2, delay: 0.24 },
                { type: 'sine', freq: 1318, duration: 0.2, gain: 0.15, delay: 0.32 }
            ]},
            goldPickup: { layers: [
                { type: 'sine', freq: 1200, duration: 0.06, gain: 0.12 },
                { type: 'sine', freq: 1600, duration: 0.08, gain: 0.1, delay: 0.04 }
            ]},
            bossEnrage: { layers: [
                { type: 'sawtooth', freq: 100, duration: 0.8, slide: 400, gain: 0.3 },
                { type: 'noise', duration: 0.5, filter: 1000, gain: 0.2 },
                { type: 'square', freq: 50, duration: 0.6, slide: 200, gain: 0.15 }
            ]},
            bossShield: { layers: [
                { type: 'sine', freq: 400, duration: 0.3, slide: 1200, gain: 0.2, reverb: 0.5 },
                { type: 'sine', freq: 600, duration: 0.3, slide: 1800, gain: 0.15, delay: 0.05 },
                { type: 'triangle', freq: 800, duration: 0.4, slide: 2400, gain: 0.1, delay: 0.1 }
            ]},
            powerup: { layers: [
                { type: 'sine', freq: 440, duration: 0.15, slide: 880, gain: 0.2 },
                { type: 'sine', freq: 660, duration: 0.15, slide: 1320, gain: 0.15, delay: 0.1 }
            ]}
        };
    }
    
    /**
     * Play a sound effect
     */
    function play(soundName) {
        if (!audioContext || muted) return;

        var sound = sounds[soundName];
        if (!sound) return;

        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Performance safeguard
        if (activeSounds >= MAX_CONCURRENT) return;

        try {
            if (sound.layers) {
                playLayered(sound);
            } else if (sound.pattern) {
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
     * Play a multi-layered sound
     */
    function playLayered(sound) {
        var layers = sound.layers;
        for (var i = 0; i < layers.length; i++) {
            (function(layer) {
                var delayTime = (layer.delay || 0) * 1000;
                setTimeout(function() {
                    if (activeSounds >= MAX_CONCURRENT) return;
                    activeSounds++;

                    var destination = masterGain;

                    // Add reverb if specified
                    if (layer.reverb && reverbBuffer) {
                        destination = createReverbSend(layer.reverb);
                    }

                    if (layer.type === 'noise') {
                        playNoiseLayer(layer, destination);
                    } else {
                        playToneLayer(layer, destination);
                    }

                    // Track active sounds
                    var dur = (layer.duration || 0.1) * 1000 + 50;
                    setTimeout(function() {
                        activeSounds = Math.max(0, activeSounds - 1);
                    }, dur);
                }, delayTime);
            })(layers[i]);
        }
    }

    /**
     * Play a single tone layer
     */
    function playToneLayer(layer, destination) {
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();
        var now = audioContext.currentTime;
        var dur = layer.duration || 0.1;

        osc.type = layer.type || 'sine';
        osc.frequency.setValueAtTime(layer.freq || 440, now);

        if (layer.slide) {
            osc.frequency.linearRampToValueAtTime(layer.slide, now + dur);
        }

        // ADSR-like envelope
        var vol = layer.gain || 0.3;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        // Optional filter
        if (layer.filter) {
            var filter = audioContext.createBiquadFilter();
            filter.type = layer.filterType || 'lowpass';
            filter.frequency.value = layer.filter;
            osc.connect(filter);
            filter.connect(gain);
        } else {
            osc.connect(gain);
        }

        gain.connect(destination);
        osc.start(now);
        osc.stop(now + dur);
    }

    /**
     * Play a single noise layer
     */
    function playNoiseLayer(layer, destination) {
        var now = audioContext.currentTime;
        var dur = layer.duration || 0.1;

        var source = audioContext.createBufferSource();
        if (noiseBuffer) {
            source.buffer = noiseBuffer;
        } else {
            // Fallback: generate on the fly
            var bufSize = audioContext.sampleRate * dur;
            var buf = audioContext.createBuffer(1, bufSize, audioContext.sampleRate);
            var data = buf.getChannelData(0);
            for (var i = 0; i < bufSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            source.buffer = buf;
        }

        var filter = audioContext.createBiquadFilter();
        filter.type = layer.filterType || 'lowpass';
        filter.frequency.value = layer.filter || 1000;

        var gain = audioContext.createGain();
        var vol = layer.gain || 0.2;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        source.start(now);
        source.stop(now + dur);
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
