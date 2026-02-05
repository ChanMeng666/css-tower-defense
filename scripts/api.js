/**
 * CSS Tower Defense - API Client
 * Wraps all backend API calls with graceful fallback for guest mode
 */

var API = (function() {
    'use strict';

    var BASE = '/api';

    /**
     * Generic fetch wrapper with auth and error handling
     */
    function request(path, options) {
        options = options || {};
        options.credentials = 'include';
        options.headers = options.headers || {};
        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        return fetch(BASE + path, options)
            .then(function(r) {
                if (!r.ok) {
                    return r.json().then(function(data) {
                        throw new Error(data.error || 'Request failed');
                    }).catch(function(e) {
                        if (e.message) throw e;
                        throw new Error('Request failed: ' + r.status);
                    });
                }
                return r.json();
            });
    }

    /**
     * Silent request - catches errors and returns null (for non-critical calls)
     */
    function silentRequest(path, options) {
        if (!Auth.isLoggedIn()) return Promise.resolve(null);
        return request(path, options).catch(function() { return null; });
    }

    // ── Leaderboard ──

    function getLeaderboard(difficulty, limit, offset) {
        var params = '?difficulty=' + (difficulty || 'normal') +
                     '&limit=' + (limit || 50) +
                     '&offset=' + (offset || 0);
        return request('/leaderboard' + params);
    }

    function getMyRank(difficulty) {
        return silentRequest('/leaderboard/me?difficulty=' + (difficulty || 'normal'));
    }

    function submitScore(data) {
        return silentRequest('/leaderboard', {
            method: 'POST',
            body: data
        });
    }

    // ── Saves ──

    function getSaves() {
        return silentRequest('/saves');
    }

    function saveGame(slot, gameState) {
        return silentRequest('/saves/' + slot, {
            method: 'PUT',
            body: gameState
        });
    }

    function deleteSave(slot) {
        return silentRequest('/saves/' + slot, {
            method: 'DELETE'
        });
    }

    // ── Progression ──

    function getProgression() {
        return silentRequest('/progression');
    }

    function saveProgression(data) {
        return silentRequest('/progression', {
            method: 'PUT',
            body: data
        });
    }

    function syncProgression(localData) {
        return silentRequest('/progression/sync', {
            method: 'POST',
            body: { localData: localData }
        });
    }

    // ── Stats ──

    function recordGame(data) {
        return silentRequest('/stats/game', {
            method: 'POST',
            body: data
        });
    }

    function getMyStats() {
        return silentRequest('/stats/me');
    }

    // ── Achievements ──

    function unlockAchievement(achievementId) {
        return silentRequest('/stats/achievements', {
            method: 'POST',
            body: { achievementId: achievementId }
        });
    }

    function getAchievements() {
        return silentRequest('/stats/achievements');
    }

    function getGlobalAchievements() {
        return request('/stats/achievements/global');
    }

    return {
        getLeaderboard: getLeaderboard,
        getMyRank: getMyRank,
        submitScore: submitScore,
        getSaves: getSaves,
        saveGame: saveGame,
        deleteSave: deleteSave,
        getProgression: getProgression,
        saveProgression: saveProgression,
        syncProgression: syncProgression,
        recordGame: recordGame,
        getMyStats: getMyStats,
        unlockAchievement: unlockAchievement,
        getAchievements: getAchievements,
        getGlobalAchievements: getGlobalAchievements
    };
})();
