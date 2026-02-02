/**
 * CSS Tower Defense - Sound Effects System
 * Uses Web Audio API for game sounds
 */

var Sfx = (function() {
    'use strict';
    
    // Audio context
    var audioContext = null;
    var masterGain = null;
    var muted = false;
    var volume = 0.5;
    
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
            
            // Pre-generate sounds
            generateSounds();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
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
            kill: { type: 'noise', duration: 0.1, filter: 2000 },
            damage: { type: 'sawtooth', freq: 150, duration: 0.2, slide: 80 },
            
            // Wave sounds
            waveStart: { type: 'square', freq: 330, duration: 0.3, pattern: [1, 0, 1, 0, 1] },
            waveComplete: { type: 'sine', freq: 440, duration: 0.5, pattern: [1, 1.25, 1.5] },
            
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
    
    // Public API
    return {
        init: init,
        play: play,
        setVolume: setVolume,
        getVolume: getVolume,
        toggleMute: toggleMute,
        isMuted: isMuted
    };
})();
