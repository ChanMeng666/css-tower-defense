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
    var pendingVerificationEmail = null;

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
                // Check for pending scores if verified
                if (currentUser && currentUser.emailVerified) {
                    checkAndProcessPendingScores();
                }
                return currentUser;
            })
            .catch(function() {
                currentUser = null;
                updateAuthUI();
            });
    }

    /**
     * Check for and process pending scores after email verification
     */
    function checkAndProcessPendingScores() {
        if (typeof API === 'undefined' || !API.processPendingScores) return;

        API.processPendingScores().then(function(result) {
            if (result && result.movedCount > 0) {
                console.log('[Auth] Processed pending scores:', result.movedCount);
                if (typeof Display !== 'undefined' && Display.showToast) {
                    Display.showToast(result.message, 'success');
                }
            }
        }).catch(function(err) {
            console.error('[Auth] Failed to process pending scores:', err);
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
            guestMode = false;
            updateAuthUI();
            hideModal();
            emitGameEvent('authStateChanged', { user: currentUser });
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
            guestMode = false;
            updateAuthUI();
            hideModal();
            emitGameEvent('authStateChanged', { user: currentUser });
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
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
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
            '<span class="auth-verify-badge hidden" id="authVerifyBadge" title="Click to verify email">Unverified</span>' +
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
                // Email verification pending view
                '<div class="auth-verify-pending hidden" id="authVerifyPending">' +
                    '<div class="auth-verify-icon">&#9993;</div>' +
                    '<p>Check your email for a verification link.</p>' +
                    '<p class="auth-verify-email" id="authVerifyEmail"></p>' +
                    '<button class="auth-btn auth-btn-small" id="authResendBtn">Resend Email</button>' +
                    '<p class="auth-verify-hint">Already verified? <a href="#" id="authRefreshLink">Refresh</a></p>' +
                '</div>' +
                // Login form
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
                // OAuth divider and Google button
                '<div class="auth-divider" id="authDivider"><span>or</span></div>' +
                '<button class="auth-google-btn" id="authGoogleBtn">' +
                    '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
                    'Continue with Google' +
                '</button>' +
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
        var authGoogleBtn = document.getElementById('authGoogleBtn');
        var authResendBtn = document.getElementById('authResendBtn');
        var authRefreshLink = document.getElementById('authRefreshLink');
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

        // Google OAuth sign-in
        if (authGoogleBtn) {
            authGoogleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                // Redirect to Google OAuth endpoint
                window.location.href = API_BASE + '/auth/google';
            });
        }

        // Resend verification email
        if (authResendBtn) {
            authResendBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                var email = pendingVerificationEmail;
                if (!email) return;

                authResendBtn.disabled = true;
                authResendBtn.textContent = 'Sending...';

                fetch(API_BASE + '/auth/send-verification-email', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                })
                .then(function(r) {
                    if (!r.ok) throw new Error('Failed to resend');
                    if (typeof Display !== 'undefined' && Display.showToast) {
                        Display.showToast('Verification email sent!', 'success');
                    }
                })
                .catch(function(err) {
                    console.error('[Auth] Resend error:', err);
                    if (typeof Display !== 'undefined' && Display.showToast) {
                        Display.showToast('Failed to resend email', 'error');
                    }
                })
                .finally(function() {
                    authResendBtn.disabled = false;
                    authResendBtn.textContent = 'Resend Email';
                });
            });
        }

        // Refresh after verification
        if (authRefreshLink) {
            authRefreshLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                checkSession().then(function(user) {
                    if (user && user.emailVerified) {
                        hideModal();
                        if (typeof Display !== 'undefined' && Display.showToast) {
                            Display.showToast('Email verified!', 'success');
                        }
                        // Process any pending scores
                        checkAndProcessPendingScores();
                    } else {
                        if (typeof Display !== 'undefined' && Display.showToast) {
                            Display.showToast('Email not verified yet', 'error');
                        }
                    }
                });
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
                    .then(function(user) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
                        // Check if email needs verification
                        if (user && !user.emailVerified) {
                            showVerificationPending(email);
                        }
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
            // Reset to form view when closing
            var verifyPending = document.getElementById('authVerifyPending');
            var authForm = document.getElementById('authForm');
            var authDivider = document.getElementById('authDivider');
            var authGoogleBtn = document.getElementById('authGoogleBtn');
            var authSwitch = modal.querySelector('.auth-switch');
            if (verifyPending) verifyPending.classList.add('hidden');
            if (authForm) authForm.classList.remove('hidden');
            if (authDivider) authDivider.classList.remove('hidden');
            if (authGoogleBtn) authGoogleBtn.classList.remove('hidden');
            if (authSwitch) authSwitch.classList.remove('hidden');
        }
    }

    /**
     * Show email verification pending view
     */
    function showVerificationPending(email) {
        pendingVerificationEmail = email;

        var verifyPending = document.getElementById('authVerifyPending');
        var verifyEmail = document.getElementById('authVerifyEmail');
        var authForm = document.getElementById('authForm');
        var authDivider = document.getElementById('authDivider');
        var authGoogleBtn = document.getElementById('authGoogleBtn');
        var authSwitch = modal.querySelector('.auth-switch');
        var title = document.getElementById('authModalTitle');

        // Hide form, show verification pending
        if (authForm) authForm.classList.add('hidden');
        if (authDivider) authDivider.classList.add('hidden');
        if (authGoogleBtn) authGoogleBtn.classList.add('hidden');
        if (authSwitch) authSwitch.classList.add('hidden');
        if (verifyPending) verifyPending.classList.remove('hidden');
        if (verifyEmail) verifyEmail.textContent = email;
        if (title) title.textContent = 'Verify Email';
    }

    /**
     * Update auth UI based on current user
     */
    function updateAuthUI() {
        var authBtn = document.getElementById('authBtn');
        var authOutBtn = document.getElementById('authOutBtn');
        var authUser = document.getElementById('authUser');
        var authVerifyBadge = document.getElementById('authVerifyBadge');
        var saveLoadBtn = document.getElementById('saveLoadBtn');

        if (currentUser) {
            if (authBtn) authBtn.classList.add('hidden');
            if (authUser) {
                authUser.textContent = currentUser.name;
                authUser.classList.remove('hidden');
            }
            if (authOutBtn) authOutBtn.classList.remove('hidden');
            if (saveLoadBtn) saveLoadBtn.classList.remove('hidden');

            // Show/hide verification badge
            if (authVerifyBadge) {
                if (currentUser.emailVerified) {
                    authVerifyBadge.classList.add('hidden');
                } else {
                    authVerifyBadge.classList.remove('hidden');
                    // Click to show verification pending modal
                    authVerifyBadge.onclick = function(e) {
                        e.stopPropagation();
                        showVerificationPending(currentUser.email);
                        modal.classList.remove('hidden');
                    };
                }
            }
        } else {
            if (authBtn) authBtn.classList.remove('hidden');
            if (authUser) authUser.classList.add('hidden');
            if (authVerifyBadge) authVerifyBadge.classList.add('hidden');
            if (authOutBtn) authOutBtn.classList.add('hidden');
            if (saveLoadBtn) saveLoadBtn.classList.add('hidden');
        }
    }

    function isLoggedIn() { return !!currentUser && !guestMode; }
    function getUser() { return currentUser; }
    function isEmailVerified() { return currentUser && currentUser.emailVerified; }

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
        isEmailVerified: isEmailVerified,
        getUser: getUser,
        checkSession: checkSession,
        setGuestMode: setGuestMode,
        isGuestMode: isGuestMode,
        showLoginModal: showLoginModal
    };
})();
