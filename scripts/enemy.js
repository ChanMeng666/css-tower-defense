/**
 * CSS Tower Defense - Enemy System
 * Manages enemy entities, movement, and behavior
 */

var Enemy = (function() {
    'use strict';
    
    // Enemy type definitions
    var ENEMY_TYPES = {
        slime: {
            name: 'Slime',
            health: 50,
            speed: 40,           // pixels per second
            reward: 10,          // gold on kill
            damage: 1,           // damage to player on reaching end
            className: 'enemy-slime'
        },
        goblin: {
            name: 'Goblin',
            health: 80,
            speed: 60,
            reward: 15,
            damage: 1,
            className: 'enemy-goblin'
        },
        knight: {
            name: 'Knight',
            health: 200,
            speed: 30,
            reward: 25,
            damage: 2,
            armor: 5,            // damage reduction
            className: 'enemy-knight'
        },
        boss: {
            name: 'Boss',
            health: 1000,
            speed: 20,
            reward: 100,
            damage: 5,
            armor: 10,
            className: 'enemy-boss'
        }
    };
    
    // Active enemies list
    var enemies = [];
    var enemyIdCounter = 0;
    
    // DOM container
    var container = null;
    
    /**
     * Initialize the enemy system
     */
    function init() {
        container = document.getElementById('enemies');
        enemies = [];
        enemyIdCounter = 0;
    }
    
    /**
     * Enemy constructor
     */
    function EnemyEntity(type, path) {
        var config = ENEMY_TYPES[type];
        
        this.id = ++enemyIdCounter;
        this.type = type;
        this.config = config;
        
        // Stats
        this.health = config.health;
        this.maxHealth = config.health;
        this.speed = config.speed;
        this.baseSpeed = config.speed;
        this.reward = config.reward;
        this.damage = config.damage;
        this.armor = config.armor || 0;
        
        // Path following
        this.path = path;
        this.pathIndex = 0;
        this.distanceTraveled = 0;
        
        // Position (world coordinates)
        var startPos = path[0];
        this.x = startPos.x;
        this.y = startPos.y;
        this.z = 0;
        
        // State
        this.alive = true;
        this.reachedEnd = false;
        this.slowed = false;
        this.slowTimer = 0;
        
        // Create DOM element
        this.element = this.createElement();
        container.appendChild(this.element);
        
        // Initial render
        this.render();
    }
    
    /**
     * Create the DOM element for this enemy
     */
    EnemyEntity.prototype.createElement = function() {
        var el = document.createElement('div');
        el.className = 'enemy ' + this.config.className;
        el.dataset.id = this.id;
        
        // Add body
        var body = document.createElement('div');
        body.className = 'enemy-body';
        el.appendChild(body);
        
        // Add face
        var face = document.createElement('div');
        face.className = 'enemy-face';
        el.appendChild(face);
        
        // Add eyes for some enemy types
        if (this.type === 'goblin' || this.type === 'boss') {
            var eyes = document.createElement('div');
            eyes.className = 'enemy-eyes';
            el.appendChild(eyes);
        }
        
        // Add health bar
        var healthBar = document.createElement('div');
        healthBar.className = 'health-bar';
        var healthFill = document.createElement('div');
        healthFill.className = 'health-fill';
        healthFill.style.width = '100%';
        healthBar.appendChild(healthFill);
        el.appendChild(healthBar);
        
        return el;
    };
    
    /**
     * Update enemy position based on path
     */
    EnemyEntity.prototype.update = function(dt) {
        if (!this.alive || this.reachedEnd) return;
        
        // Update slow effect
        if (this.slowed) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) {
                this.slowed = false;
                this.speed = this.baseSpeed;
                this.element.classList.remove('slowed');
            }
        }
        
        // Get current target waypoint
        var target = this.path[this.pathIndex];
        if (!target) {
            this.reachedEnd = true;
            return;
        }
        
        // Calculate direction to target
        var dx = target.x - this.x;
        var dy = target.y - this.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        
        // Move towards target
        var moveDistance = this.speed * dt;
        
        if (distance <= moveDistance) {
            // Reached waypoint, move to next
            this.x = target.x;
            this.y = target.y;
            this.pathIndex++;
            this.distanceTraveled += distance;
            
            // Check if reached end
            if (this.pathIndex >= this.path.length) {
                this.reachedEnd = true;
            }
        } else {
            // Move towards target
            var ratio = moveDistance / distance;
            this.x += dx * ratio;
            this.y += dy * ratio;
            this.distanceTraveled += moveDistance;
        }
        
        // Update visual
        this.render();
    };
    
    /**
     * Render the enemy position
     */
    EnemyEntity.prototype.render = function() {
        if (!this.element) return;
        
        // Position is relative to the map center
        var mapWidth = Path.GRID_COLS * Path.CELL_SIZE;
        var mapHeight = Path.GRID_ROWS * Path.CELL_SIZE;
        
        // Convert to map-local coordinates
        var localX = this.x + (mapWidth / 2);
        var localY = this.y + (mapHeight / 2);
        
        this.element.style.left = localX + 'px';
        this.element.style.top = localY + 'px';
        // Transform is handled by CSS (counter-rotation for 3D perspective)
    };
    
    /**
     * Apply damage to the enemy
     */
    EnemyEntity.prototype.takeDamage = function(amount) {
        // Apply armor reduction
        var actualDamage = Math.max(1, amount - this.armor);
        this.health -= actualDamage;
        
        // Update health bar
        var healthPercent = Math.max(0, (this.health / this.maxHealth) * 100);
        var healthFill = this.element.querySelector('.health-fill');
        if (healthFill) {
            healthFill.style.width = healthPercent + '%';
        }
        
        // Check for death
        if (this.health <= 0) {
            this.die();
            return true;
        }
        
        return false;
    };
    
    /**
     * Apply slow effect
     */
    EnemyEntity.prototype.applySlow = function(percentage, duration) {
        this.slowed = true;
        this.slowTimer = duration;
        this.speed = this.baseSpeed * (1 - percentage);
        this.element.classList.add('slowed');
    };
    
    /**
     * Kill the enemy
     */
    EnemyEntity.prototype.die = function() {
        this.alive = false;
        this.element.classList.add('dying');
        
        // Dispatch event
        var event = new CustomEvent('enemyKilled', {
            detail: {
                enemy: this,
                reward: this.reward
            }
        });
        document.dispatchEvent(event);
        
        // Remove element after animation
        var self = this;
        setTimeout(function() {
            self.destroy();
        }, 500);
    };
    
    /**
     * Remove enemy from DOM and array
     */
    EnemyEntity.prototype.destroy = function() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        
        // Remove from enemies array
        var index = enemies.indexOf(this);
        if (index > -1) {
            enemies.splice(index, 1);
        }
    };
    
    /**
     * Spawn a new enemy
     */
    function spawn(type) {
        var path = Path.getPathWaypoints();
        var enemy = new EnemyEntity(type, path);
        enemies.push(enemy);
        return enemy;
    }
    
    /**
     * Update all enemies
     */
    function update(dt) {
        for (var i = enemies.length - 1; i >= 0; i--) {
            var enemy = enemies[i];
            enemy.update(dt);
            
            // Check if reached end
            if (enemy.reachedEnd && enemy.alive) {
                enemy.alive = false;
                
                // Dispatch event
                var event = new CustomEvent('enemyReachedEnd', {
                    detail: {
                        enemy: enemy,
                        damage: enemy.damage
                    }
                });
                document.dispatchEvent(event);
                
                // Remove enemy
                enemy.destroy();
            }
        }
    }
    
    /**
     * Get all active enemies
     */
    function getAll() {
        return enemies.filter(function(e) { return e.alive; });
    }
    
    /**
     * Get enemy by ID
     */
    function getById(id) {
        for (var i = 0; i < enemies.length; i++) {
            if (enemies[i].id === id) {
                return enemies[i];
            }
        }
        return null;
    }
    
    /**
     * Clear all enemies
     */
    function clear() {
        for (var i = enemies.length - 1; i >= 0; i--) {
            enemies[i].destroy();
        }
        enemies = [];
    }
    
    /**
     * Get enemy count
     */
    function count() {
        return enemies.filter(function(e) { return e.alive; }).length;
    }
    
    // Public API
    return {
        init: init,
        spawn: spawn,
        update: update,
        getAll: getAll,
        getById: getById,
        clear: clear,
        count: count,
        TYPES: ENEMY_TYPES
    };
})();
