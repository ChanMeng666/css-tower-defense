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

    // Enemy variant modifiers (elite, armored, speedy, toxic)
    var ENEMY_VARIANTS = {
        elite: {
            name: 'Elite',
            healthMultiplier: 2.0,
            speedMultiplier: 1.3,
            rewardMultiplier: 2.5,
            damageMultiplier: 1.5,
            className: 'elite'
        },
        armored: {
            name: 'Armored',
            healthMultiplier: 1.5,
            speedMultiplier: 0.8,
            rewardMultiplier: 1.8,
            armorBonus: 10,
            className: 'armored'
        },
        speedy: {
            name: 'Speedy',
            healthMultiplier: 0.7,
            speedMultiplier: 2.0,
            rewardMultiplier: 1.5,
            className: 'speedy'
        },
        toxic: {
            name: 'Toxic',
            healthMultiplier: 1.2,
            speedMultiplier: 1.0,
            rewardMultiplier: 2.0,
            damageMultiplier: 2.0,
            className: 'toxic'
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
     * Enemy constructor with optional variant support
     */
    function EnemyEntity(type, path, variant) {
        var config = ENEMY_TYPES[type];
        var variantConfig = variant ? ENEMY_VARIANTS[variant] : null;
        
        this.id = ++enemyIdCounter;
        this.type = type;
        this.variant = variant || null;
        this.config = config;
        
        // Base stats
        var healthMult = variantConfig ? variantConfig.healthMultiplier : 1;
        var speedMult = variantConfig ? variantConfig.speedMultiplier : 1;
        var rewardMult = variantConfig ? variantConfig.rewardMultiplier : 1;
        var damageMult = variantConfig ? (variantConfig.damageMultiplier || 1) : 1;
        var armorBonus = variantConfig ? (variantConfig.armorBonus || 0) : 0;
        
        // Stats with variant modifiers
        this.health = Math.round(config.health * healthMult);
        this.maxHealth = this.health;
        this.speed = config.speed * speedMult;
        this.baseSpeed = this.speed;
        this.reward = Math.round(config.reward * rewardMult);
        this.damage = Math.round(config.damage * damageMult);
        this.armor = (config.armor || 0) + armorBonus;
        
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
     * Enhanced with animated parts for each enemy type
     */
    EnemyEntity.prototype.createElement = function() {
        var el = document.createElement('div');
        var variantClass = this.variant ? ENEMY_VARIANTS[this.variant].className : '';
        el.className = 'enemy ' + this.config.className + (variantClass ? ' ' + variantClass : '');
        el.dataset.id = this.id;
        
        // Type-specific elements
        switch(this.type) {
            case 'slime':
                this.createSlimeElements(el);
                break;
            case 'goblin':
                this.createGoblinElements(el);
                break;
            case 'knight':
                this.createKnightElements(el);
                break;
            case 'boss':
                this.createBossElements(el);
                break;
            default:
                this.createDefaultElements(el);
        }
        
        // Add health bar (common to all)
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
     * Create Slime enemy elements with animated tentacles
     */
    EnemyEntity.prototype.createSlimeElements = function(el) {
        var body = document.createElement('div');
        body.className = 'enemy-body';
        el.appendChild(body);
        
        var face = document.createElement('div');
        face.className = 'enemy-face';
        el.appendChild(face);
        
        // Animated tentacles
        var tentacles = document.createElement('div');
        tentacles.className = 'tentacles';
        for (var i = 1; i <= 4; i++) {
            var tentacle = document.createElement('div');
            tentacle.className = 'tentacle t' + i;
            tentacles.appendChild(tentacle);
        }
        el.appendChild(tentacles);
    };

    /**
     * Create Goblin enemy elements with animated arms
     */
    EnemyEntity.prototype.createGoblinElements = function(el) {
        var body = document.createElement('div');
        body.className = 'enemy-body';
        el.appendChild(body);
        
        var face = document.createElement('div');
        face.className = 'enemy-face';
        el.appendChild(face);
        
        var eyes = document.createElement('div');
        eyes.className = 'enemy-eyes';
        el.appendChild(eyes);
        
        // Animated arms with dagger
        var arms = document.createElement('div');
        arms.className = 'arms';
        
        var leftArm = document.createElement('div');
        leftArm.className = 'arm left';
        arms.appendChild(leftArm);
        
        var rightArm = document.createElement('div');
        rightArm.className = 'arm right';
        arms.appendChild(rightArm);
        
        el.appendChild(arms);
    };

    /**
     * Create Knight enemy elements with animated cape and sword
     */
    EnemyEntity.prototype.createKnightElements = function(el) {
        // Cape (behind body)
        var cape = document.createElement('div');
        cape.className = 'cape';
        var capeMain = document.createElement('div');
        capeMain.className = 'cape-main';
        cape.appendChild(capeMain);
        el.appendChild(cape);
        
        var body = document.createElement('div');
        body.className = 'enemy-body';
        el.appendChild(body);
        
        var face = document.createElement('div');
        face.className = 'enemy-face';
        el.appendChild(face);
        
        // Animated sword
        var sword = document.createElement('div');
        sword.className = 'sword';
        el.appendChild(sword);
    };

    /**
     * Create Boss enemy elements with rotating energy rings
     */
    EnemyEntity.prototype.createBossElements = function(el) {
        // Rotating energy rings (behind body)
        var energyRings = document.createElement('div');
        energyRings.className = 'energy-rings';
        
        // Create 3 ring containers
        for (var i = 1; i <= 3; i++) {
            var ringContainer = document.createElement('div');
            ringContainer.className = 'ring-container ring-' + i;
            
            var ring = document.createElement('div');
            ring.className = 'ring';
            ringContainer.appendChild(ring);
            
            // Add orbs to first two rings
            if (i <= 2) {
                var orbPositions = i === 1 ? ['1', '2'] : ['3', '4'];
                orbPositions.forEach(function(pos) {
                    var orb = document.createElement('div');
                    orb.className = 'orb orb-' + pos;
                    ringContainer.appendChild(orb);
                });
            }
            
            energyRings.appendChild(ringContainer);
        }
        el.appendChild(energyRings);
        
        var body = document.createElement('div');
        body.className = 'enemy-body';
        el.appendChild(body);
        
        var face = document.createElement('div');
        face.className = 'enemy-face';
        el.appendChild(face);
        
        var eyes = document.createElement('div');
        eyes.className = 'enemy-eyes';
        el.appendChild(eyes);
        
        // Shoulder spikes
        var spikes = document.createElement('div');
        spikes.className = 'spikes';
        
        var leftSpike = document.createElement('div');
        leftSpike.className = 'spike left';
        spikes.appendChild(leftSpike);
        
        var rightSpike = document.createElement('div');
        rightSpike.className = 'spike right';
        spikes.appendChild(rightSpike);
        
        el.appendChild(spikes);
    };

    /**
     * Create default enemy elements (fallback)
     */
    EnemyEntity.prototype.createDefaultElements = function(el) {
        var body = document.createElement('div');
        body.className = 'enemy-body';
        el.appendChild(body);
        
        var face = document.createElement('div');
        face.className = 'enemy-face';
        el.appendChild(face);
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
     * Kill the enemy with enhanced death effects
     */
    EnemyEntity.prototype.die = function() {
        this.alive = false;
        this.element.classList.add('dying');
        
        // Create death particles
        this.createDeathParticles();
        
        // Dispatch event
        var event = new CustomEvent('enemyKilled', {
            detail: {
                enemy: this,
                reward: this.reward
            }
        });
        document.dispatchEvent(event);
        
        // Remove element after animation (boss takes longer)
        var self = this;
        var deathDuration = this.type === 'boss' ? 1000 : 600;
        setTimeout(function() {
            self.destroy();
        }, deathDuration);
    };

    /**
     * Create death particle effect using box-shadow technique
     */
    EnemyEntity.prototype.createDeathParticles = function() {
        var particles = document.createElement('div');
        particles.className = 'death-particles ' + this.type;
        this.element.appendChild(particles);
        
        // Remove particles after animation
        setTimeout(function() {
            if (particles.parentNode) {
                particles.parentNode.removeChild(particles);
            }
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
     * Spawn a new enemy with optional variant
     * @param {string} type - Enemy type (slime, goblin, knight, boss)
     * @param {string} variant - Optional variant (elite, armored, speedy, toxic)
     */
    function spawn(type, variant) {
        var path = Path.getPathWaypoints();
        var enemy = new EnemyEntity(type, path, variant);
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
        TYPES: ENEMY_TYPES,
        VARIANTS: ENEMY_VARIANTS
    };
})();
