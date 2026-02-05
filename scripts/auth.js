/**
 * CSS Tower Defense - Auth System
 * Handles user authentication UI and session management
 */

var Auth = (function() {
    'use strict';

    var currentUser = null;
    var guestMode = false; // Track if user explicitly chose to play as guest
    var API_BASE = '/api';
    var modal = null;
    var onAuthCallbacks = [];

    /**
     * Initialize auth - check for existing session
     */
    function init() {
        createAuthUI();
        return checkSession();
    }

    /**
     * Check for existing session
     */
    function checkSession() {
        return fetch(API_BASE + '/auth/get-session', { credentials: 'include' })
            .then(function(r) {
                if (!r.ok) return null;
                return r.json();
            })
            .then(function(data) {
                currentUser = data && data.user ? data.user : null;
                updateAuthUI();
                emitGameEvent('authStateChanged', { user: currentUser });
                return currentUser;
            })
            .catch(function() {
                currentUser = null;
                updateAuthUI();
            });
    }

    /**
     * Sign in with email/password
     */
    function signIn(email, password) {
        return fetch(API_BASE + '/auth/sign-in/email', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        })
        .then(function(r) {
            if (!r.ok) return r.json().then(function(e) { throw new Error(e.message || 'Sign in failed'); });
            return r.json();
        })
        .then(function(data) {
            currentUser = data.user || null;
            guestMode = false; // Clear guest mode on successful login
            updateAuthUI();
            hideModal();
            emitGameEvent('authStateChanged', { user: currentUser });

            // Trigger sync prompt on first login
            if (currentUser) {
                promptLocalSync();
            }

            return currentUser;
        });
    }

    /**
     * Sign up with name/email/password
     */
    function signUp(name, email, password) {
        return fetch(API_BASE + '/auth/sign-up/email', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, email: email, password: password })
        })
        .then(function(r) {
            if (!r.ok) return r.json().then(function(e) { throw new Error(e.message || 'Sign up failed'); });
            return r.json();
        })
        .then(function(data) {
            currentUser = data.user || null;
            guestMode = false; // Clear guest mode on successful sign up
            updateAuthUI();
            hideModal();
            emitGameEvent('authStateChanged', { user: currentUser });

            if (currentUser) {
                promptLocalSync();
            }

            return currentUser;
        });
    }

    /**
     * Sign out
     */
    function signOut() {
        console.log('[Auth] Starting sign out...');

        return fetch(API_BASE + '/auth/sign-out', {
            method: 'POST',
            credentials: 'include'
        })
        .then(function(r) {
            console.log('[Auth] Sign out response:', r.status, r.statusText);
            if (!r.ok) {
                console.error('[Auth] Sign out request failed:', r.status);
            }
            return r;
        })
        .then(function() {
            // Always clear local state first
            currentUser = null;
            guestMode = false;
            updateAuthUI();
            emitGameEvent('authStateChanged', { user: currentUser });

            // Verify session is actually cleared after a short delay
            return new Promise(function(resolve) { setTimeout(resolve, 500); })
                .then(function() {
                    console.log('[Auth] Verifying session cleared...');
                    return fetch(API_BASE + '/auth/get-session', { credentials: 'include' });
                })
                .then(function(r) {
                    console.log('[Auth] Session check response:', r.status);
                    return r.ok ? r.json() : null;
                })
                .then(function(data) {
                    console.log('[Auth] Session check result:', data);
                    if (data && data.user) {
                        console.error('[Auth] SESSION STILL ACTIVE after sign-out!');
                        console.error('[Auth] User still logged in as:', data.user.email);
                        // Force guest mode to prevent score submission
                        guestMode = true;
                        if (typeof Display !== 'undefined' && Display.showToast) {
                            Display.showToast('Sign out incomplete - playing as guest', 'error');
                        }
                    } else {
                        console.log('[Auth] Sign out successful, session cleared');
                        if (typeof Display !== 'undefined' && Display.showToast) {
                            Display.showToast('Signed out successfully', 'success');
                        }
                    }
                })
                .catch(function(err) {
                    console.log('[Auth] Session verify error (probably ok):', err);
                });
        })
        .catch(function(err) {
            console.error('[Auth] Sign out error:', err);
            // Still clear local state on error
            currentUser = null;
            guestMode = true; // Force guest mode if sign-out failed
            updateAuthUI();
            emitGameEvent('authStateChanged', { user: currentUser });
            if (typeof Display !== 'undefined' && Display.showToast) {
                Display.showToast('Sign out failed - playing as guest', 'error');
            }
        });
    }

    /**
     * Prompt user to sync localStorage data on first login
     */
    function promptLocalSync() {
        var highScore = parseInt(localStorage.getItem('towerDefenseHighScore')) || 0;
        var achievements = [];
        try {
            var saved = localStorage.getItem('td_achievements');
            if (saved) achievements = JSON.parse(saved);
        } catch(e) { /* ignore */ }

        // Read actual progression from localStorage
        var progressionData = { xp: 0, level: 1, skillPoints: 0, upgrades: {} };
        try {
            var savedProg = localStorage.getItem('td_progression');
            if (savedProg) {
                var parsed = JSON.parse(savedProg);
                progressionData.xp = parsed.xp || 0;
                progressionData.level = parsed.level || 1;
                progressionData.skillPoints = parsed.skillPoints || 0;
                progressionData.upgrades = parsed.upgrades || {};
            }
        } catch(e) { /* ignore */ }

        if (highScore > 0 || achievements.length > 0 || progressionData.level > 1) {
            if (typeof API !== 'undefined' && API.syncProgression) {
                API.syncProgression({
                    xp: progressionData.xp,
                    level: progressionData.level,
                    skillPoints: progressionData.skillPoints,
                    upgrades: progressionData.upgrades,
                    highScore: highScore,
                    achievements: achievements
                });

                // Sync achievements individually
                if (achievements.length > 0 && API.unlockAchievement) {
                    achievements.forEach(function(id) {
                        API.unlockAchievement(id);
                    });
                }
            }
        }
    }

    /**
     * Create auth UI elements
     */
    function createAuthUI() {
        // Auth button on start screen
        var loadingScreen = document.getElementById('loadingScreen');
        if (!loadingScreen) return;

        // Create auth button container
        var authContainer = document.createElement('div');
        authContainer.className = 'auth-container';
        authContainer.id = 'authContainer';
        authContainer.innerHTML =
            '<button class="auth-btn" id="authBtn">Sign In</button>' +
            '<span class="auth-user hidden" id="authUser"></span>' +
            '<button class="auth-btn auth-btn-small hidden" id="authOutBtn">Sign Out</button>';
        loadingScreen.appendChild(authContainer);

        // Create modal
        modal = document.createElement('div');
        modal.className = 'auth-modal hidden';
        modal.id = 'authModal';
        modal.innerHTML =
            '<div class="auth-modal-content">' +
                '<h2 class="auth-modal-title" id="authModalTitle">Sign In</h2>' +
                '<div class="auth-error hidden" id="authError"></div>' +
                '<form class="auth-form" id="authForm">' +
                    '<div class="auth-field hidden" id="authNameField">' +
                        '<label for="authName">Display Name</label>' +
                        '<input type="text" id="authName" placeholder="Your name" maxlength="30" autocomplete="name">' +
                    '</div>' +
                    '<div class="auth-field">' +
                        '<label for="authEmail">Email</label>' +
                        '<input type="email" id="authEmail" placeholder="you@example.com" autocomplete="email" required>' +
                    '</div>' +
                    '<div class="auth-field">' +
                        '<label for="authPassword">Password</label>' +
                        '<input type="password" id="authPassword" placeholder="Password" minlength="8" autocomplete="current-password" required>' +
                    '</div>' +
                    '<button type="submit" class="auth-submit" id="authSubmit">Sign In</button>' +
                '</form>' +
                '<div class="auth-switch">' +
                    '<span id="authSwitchText">No account?</span> ' +
                    '<a href="#" id="authSwitchLink">Sign Up</a>' +
                '</div>' +
                '<button class="auth-close" id="authClose">&times;</button>' +
            '</div>';
        document.body.appendChild(modal);

        // Wire up events
        var authBtn = document.getElementById('authBtn');
        var authOutBtn = document.getElementById('authOutBtn');
        var authClose = document.getElementById('authClose');
        var authForm = document.getElementById('authForm');
        var authSwitchLink = document.getElementById('authSwitchLink');
        var isSignUp = false;

        if (authBtn) {
            authBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                showModal(false);
            });
        }

        if (authOutBtn) {
            authOutBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                signOut();
            });
        }

        if (authClose) {
            authClose.addEventListener('click', function(e) {
                e.stopPropagation();
                hideModal();
            });
        }

        if (authSwitchLink) {
            authSwitchLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                isSignUp = !isSignUp;
                showModal(isSignUp);
            });
        }

        if (authForm) {
            authForm.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();

                var email = document.getElementById('authEmail').value;
                var password = document.getElementById('authPassword').value;
                var errorEl = document.getElementById('authError');

                errorEl.classList.add('hidden');
                errorEl.textContent = '';

                var submitBtn = document.getElementById('authSubmit');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Loading...';

                var promise;
                if (isSignUp) {
                    var name = document.getElementById('authName').value || 'Player';
                    promise = signUp(name, email, password);
                } else {
                    promise = signIn(email, password);
                }

                promise
                    .then(function() {
                        submitBtn.disabled = false;
                        submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
                    })
                    .catch(function(err) {
                        errorEl.textContent = err.message || 'Something went wrong';
                        errorEl.classList.remove('hidden');
                        submitBtn.disabled = false;
                        submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
                    });
            });
        }
    }

    /**
     * Show auth modal
     */
    function showModal(signUpMode) {
        if (!modal) return;

        var title = document.getElementById('authModalTitle');
        var nameField = document.getElementById('authNameField');
        var submitBtn = document.getElementById('authSubmit');
        var switchText = document.getElementById('authSwitchText');
        var switchLink = document.getElementById('authSwitchLink');
        var errorEl = document.getElementById('authError');

        errorEl.classList.add('hidden');

        if (signUpMode) {
            title.textContent = 'Sign Up';
            nameField.classList.remove('hidden');
            submitBtn.textContent = 'Sign Up';
            switchText.textContent = 'Already have an account?';
            switchLink.textContent = 'Sign In';
        } else {
            title.textContent = 'Sign In';
            nameField.classList.add('hidden');
            submitBtn.textContent = 'Sign In';
            switchText.textContent = 'No account?';
            switchLink.textContent = 'Sign Up';
        }

        modal.classList.remove('hidden');
    }

    /**
     * Hide auth modal
     */
    function hideModal() {
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Update auth UI based on current user
     */
    function updateAuthUI() {
        var authBtn = document.getElementById('authBtn');
        var authOutBtn = document.getElementById('authOutBtn');
        var authUser = document.getElementById('authUser');
        var saveLoadBtn = document.getElementById('saveLoadBtn');

        if (currentUser) {
            if (authBtn) authBtn.classList.add('hidden');
            if (authUser) {
                authUser.textContent = currentUser.name;
                authUser.classList.remove('hidden');
            }
            if (authOutBtn) authOutBtn.classList.remove('hidden');
            if (saveLoadBtn) saveLoadBtn.classList.remove('hidden');
        } else {
            if (authBtn) authBtn.classList.remove('hidden');
            if (authUser) authUser.classList.add('hidden');
            if (authOutBtn) authOutBtn.classList.add('hidden');
            if (saveLoadBtn) saveLoadBtn.classList.add('hidden');
        }
    }

    function isLoggedIn() { return !!currentUser && !guestMode; }
    function getUser() { return currentUser; }

    /**
     * Set guest mode - prevents score submission even if session exists
     */
    function setGuestMode(enabled) {
        guestMode = !!enabled;
        console.log('[Auth] Guest mode:', guestMode);
    }

    /**
     * Check if in guest mode
     */
    function isGuestMode() { return guestMode; }

    /**
     * Show login modal with optional callback on success
     */
    function showLoginModal(callback) {
        showModal(false);
        if (callback) {
            // Store callback to be called after successful login
            var originalSignIn = signIn;
            signIn = function(email, password) {
                return originalSignIn(email, password).then(function(user) {
                    signIn = originalSignIn; // Restore original
                    if (user) callback();
                    return user;
                });
            };
        }
    }

    return {
        init: init,
        signIn: signIn,
        signUp: signUp,
        signOut: signOut,
        isLoggedIn: isLoggedIn,
        getUser: getUser,
        checkSession: checkSession,
        setGuestMode: setGuestMode,
        isGuestMode: isGuestMode,
        showLoginModal: showLoginModal
    };
})();
