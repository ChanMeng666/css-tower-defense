/**
 * CSS Tower Defense - Auth System
 * Handles user authentication UI and session management
 */

var Auth = (function() {
    'use strict';

    var currentUser = null;
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
        return fetch(API_BASE + '/auth/sign-out', {
            method: 'POST',
            credentials: 'include'
        })
        .then(function() {
            currentUser = null;
            updateAuthUI();
            emitGameEvent('authStateChanged', { user: currentUser });
        })
        .catch(function() {
            currentUser = null;
            updateAuthUI();
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

        if (highScore > 0 || achievements.length > 0) {
            if (typeof API !== 'undefined' && API.syncProgression) {
                API.syncProgression({
                    xp: 0,
                    level: 1,
                    skillPoints: 0,
                    upgrades: {},
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

    function isLoggedIn() { return !!currentUser; }
    function getUser() { return currentUser; }

    return {
        init: init,
        signIn: signIn,
        signUp: signUp,
        signOut: signOut,
        isLoggedIn: isLoggedIn,
        getUser: getUser,
        checkSession: checkSession
    };
})();
