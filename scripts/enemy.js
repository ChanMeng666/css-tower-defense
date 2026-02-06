/**
 * CSS Tower Defense - Enemy System
 * Manages enemy entities, movement, and behavior
 */

var Enemy = (function() {
    'use strict';
    
    // Enemy type definitions - Māori mythology creatures
    var ENEMY_TYPES = {
        kehua: {
            name: 'Kehua',
            health: 50,
            speed: 40,           // pixels per second
            reward: 10,          // gold on kill
            damage: 1,           // damage to player on reaching end
            className: 'enemy-slime',
            lore: 'Kehua are wandering spirits of the departed, restless souls seeking passage.'
        },
        patupaiarehe: {
            name: 'Patupaiarehe',
            health: 80,
            speed: 60,
            reward: 15,
            damage: 1,
            className: 'enemy-goblin',
            lore: 'Patupaiarehe are mischievous fairy folk who dwell in the misty forests.'
        },
        toa: {
            name: 'Toa',
            health: 200,
            speed: 30,
            reward: 25,
            damage: 2,
            armor: 5,            // damage reduction
            className: 'enemy-knight',
            lore: 'Toa are fierce Māori warriors, skilled in combat and protected by their mana.'
        },
        taniwha: {
            name: 'Taniwha',
            health: 1000,
            speed: 20,
            reward: 100,
            damage: 5,
            armor: 10,
            className: 'enemy-boss',
            lore: 'Taniwha are powerful water guardians, sometimes dangerous, sometimes protective.',
            // Boss skill configuration
            skills: {
                karanga: { cooldown: 10000, count: 3 },       // "The Call" - summons 3 kehua every 10s
                kaitiaki: { cooldown: 15000, armor: 50, duration: 5000 }, // "Guardian Shield" +50 armor for 5s
                teRiri: { healthThreshold: 0.3, speedBoost: 0.5, damageMultiplier: 2 } // "The Rage" at 30% HP
            }
        }
    };

    // Enemy variant modifiers - Māori terms
    var ENEMY_VARIANTS = {
        rangatira: {
            name: 'Rangatira',  // Chief
            healthMultiplier: 2.0,
            speedMultiplier: 1.3,
            rewardMultiplier: 2.5,
            damageMultiplier: 1.5,
            className: 'elite'
        },
        pakanga: {
            name: 'Pakanga',    // Battle-ready
            healthMultiplier: 1.5,
            speedMultiplier: 0.8,
            rewardMultiplier: 1.8,
            armorBonus: 10,
            className: 'armored'
        },
        tere: {
            name: 'Tere',       // Swift
            healthMultiplier: 0.7,
            speedMultiplier: 2.0,
            rewardMultiplier: 1.5,
            className: 'speedy'
        },
        mate: {
            name: 'Mate',       // Deadly
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
        var health = Math.round(config.health * healthMult);
        var speed = config.speed * speedMult;
        var armor = (config.armor || 0) + armorBonus;

        // Apply challenge enemy modifiers
        if (typeof Challenge !== 'undefined' && Challenge.isActive()) {
            var mods = Challenge.getEnemyMods();
            if (mods) {
                if (mods.healthMult) health = Math.round(health * mods.healthMult);
                if (mods.speedMult) speed *= mods.speedMult;
                if (mods.armorBonus) armor += mods.armorBonus;
            }
        }

        this.health = health;
        this.maxHealth = this.health;
        this.speed = speed;
        this.baseSpeed = this.speed;
        this.reward = Math.round(config.reward * rewardMult);
        this.damage = Math.round(config.damage * damageMult);
        this.armor = armor;
        
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

        // Noise-based movement (for tere variant and taniwha boss)
        this.useNoiseMovement = (type === 'taniwha' || variant === 'tere');
        this.noiseTime = Math.random() * 1000; // Random start offset

        // Boss-specific state (Taniwha)
        if (type === 'taniwha') {
            this.isBoss = true;
            this.bossPhase = 1;
            this.summonCooldown = 0;
            this.shieldCooldown = 0;
            this.shieldActive = false;
            this.shieldTimer = 0;
            this.baseArmor = this.armor;
            this.enraged = false;
        } else {
            this.isBoss = false;
        }

        // Create DOM element (use pool if available)
        this.element = this.createElement();
        container.appendChild(this.element);

        // Initial render
        this.render();
    }

    /**
     * Get base class name for this enemy
     */
    EnemyEntity.prototype.getClassName = function() {
        var variantClass = this.variant ? ENEMY_VARIANTS[this.variant].className : '';
        return 'enemy ' + this.config.className + (variantClass ? ' ' + variantClass : '');
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
            case 'kehua':
                this.createSlimeElements(el);
                break;
            case 'patupaiarehe':
                this.createGoblinElements(el);
                break;
            case 'toa':
                this.createKnightElements(el);
                break;
            case 'taniwha':
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

        // Update Boss-specific logic
        if (this.isBoss) {
            this.updateBoss(dt);
        }

        // Update slow effect
        if (this.slowed) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) {
                this.slowed = false;
                this.speed = this.baseSpeed;
                this.element.classList.remove('slowed');
            }
        }

        // Update burn effect
        if (this.burning) {
            this.burnTimer += dt;
            if (this.burnTimer >= this.burnInterval) {
                this.burnTimer -= this.burnInterval;
                // Apply burn damage (bypasses armor)
                this.health -= this.burnDamage;
                var healthPercent = Math.max(0, (this.health / this.maxHealth) * 100);
                var healthFill = this.element.querySelector('.health-fill');
                if (healthFill) {
                    healthFill.style.width = healthPercent + '%';
                    // Update health color state
                    healthFill.classList.remove('health-medium', 'health-low', 'health-critical');
                    if (healthPercent <= 25) {
                        healthFill.classList.add('health-critical');
                        this.element.classList.add('low-health');
                    } else if (healthPercent <= 50) {
                        healthFill.classList.add('health-low');
                        this.element.classList.add('low-health');
                    } else if (healthPercent <= 75) {
                        healthFill.classList.add('health-medium');
                    }
                }
                if (this.health <= 0) {
                    this.die();
                    return;
                }
            }
            this.burnDuration -= dt;
            if (this.burnDuration <= 0) {
                this.burning = false;
                this.element.classList.remove('burning');
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

        // Apply environmental speed modifiers (weather + season)
        var envSpeedMult = 1.0;
        if (typeof Weather !== 'undefined' && Weather.getEnemySpeedMultiplier) {
            envSpeedMult *= Weather.getEnemySpeedMultiplier();
        }
        if (typeof Seasons !== 'undefined' && Seasons.getEnemySpeedMultiplier) {
            envSpeedMult *= Seasons.getEnemySpeedMultiplier();
        }
        // Apply crafting slow
        if (typeof Crafting !== 'undefined' && Crafting.getMultiplier) {
            envSpeedMult *= Crafting.getMultiplier('slow_enemies');
        }
        moveDistance *= envSpeedMult;

        // Apply noise-based speed variation for speedy/boss
        if (this.useNoiseMovement && typeof Noise !== 'undefined') {
            var speedMult = Noise.getSpeedMultiplier(this.id, this.noiseTime);
            moveDistance *= speedMult;
        }

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

        // Update noise time for movement variation
        if (this.useNoiseMovement) {
            this.noiseTime += dt * 60; // Scale for smoother noise
        }

        // Update visual
        this.render();
    };

    /**
     * Update Boss-specific behavior (skills, phases) - Taniwha
     */
    EnemyEntity.prototype.updateBoss = function(dt) {
        var dtMs = dt * 1000;
        var skills = ENEMY_TYPES.taniwha.skills;

        // Update Kaitiaki (shield) timer
        if (this.shieldActive) {
            this.shieldTimer -= dtMs;
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
                this.armor = this.baseArmor;
                this.element.classList.remove('shielded');
                if (typeof emitGameEvent === 'function') {
                    emitGameEvent(EVENTS.BOSS_SKILL_USED, { skill: 'kaitiakiEnd', boss: this });
                }
            }
        }

        // Update cooldowns
        this.summonCooldown -= dtMs;
        this.shieldCooldown -= dtMs;

        // Check for Te Riri (enrage) at 30% health threshold
        if (!this.enraged && this.health <= this.maxHealth * skills.teRiri.healthThreshold) {
            this.enraged = true;
            this.baseSpeed *= (1 + skills.teRiri.speedBoost);
            this.speed = this.baseSpeed;
            this.damage *= skills.teRiri.damageMultiplier;
            this.element.classList.add('enraged');

            // Phase change event
            this.bossPhase = 2;
            if (typeof emitGameEvent === 'function') {
                emitGameEvent(EVENTS.BOSS_PHASE_CHANGE, { phase: 2, boss: this });
                emitGameEvent(EVENTS.BOSS_SKILL_USED, { skill: 'teRiri', boss: this });
            }
        }

        // Use Karanga (summon) skill
        if (this.summonCooldown <= 0) {
            this.useSummonSkill();
            this.summonCooldown = skills.karanga.cooldown;
        }

        // Use Kaitiaki (shield) skill (only when below 70% health)
        if (this.shieldCooldown <= 0 && !this.shieldActive && this.health < this.maxHealth * 0.7) {
            this.useShieldSkill();
            this.shieldCooldown = skills.kaitiaki.cooldown;
        }
    };

    /**
     * Boss Karanga skill (The Call) - spawn kehua minions
     */
    EnemyEntity.prototype.useSummonSkill = function() {
        var skills = ENEMY_TYPES.taniwha.skills;
        var count = skills.karanga.count;

        // Spawn kehua near the taniwha position
        for (var i = 0; i < count; i++) {
            // Delay each spawn slightly
            (function(index) {
                setTimeout(function() {
                    if (Enemy.count() < 50) { // Limit total enemies
                        Enemy.spawn('kehua');
                    }
                }, index * 200);
            })(i);
        }

        // Visual feedback
        this.element.classList.add('summoning');
        var self = this;
        setTimeout(function() {
            if (self.element) {
                self.element.classList.remove('summoning');
            }
        }, 500);

        // Emit event
        if (typeof emitGameEvent === 'function') {
            emitGameEvent(EVENTS.BOSS_SKILL_USED, { skill: 'karanga', boss: this, count: count });
        }
    };

    /**
     * Boss Kaitiaki skill (Guardian Shield) - temporary armor boost
     */
    EnemyEntity.prototype.useShieldSkill = function() {
        var skills = ENEMY_TYPES.taniwha.skills;

        this.shieldActive = true;
        this.shieldTimer = skills.kaitiaki.duration;
        this.armor = this.baseArmor + skills.kaitiaki.armor;
        this.element.classList.add('shielded');

        // Emit event
        if (typeof emitGameEvent === 'function') {
            emitGameEvent(EVENTS.BOSS_SKILL_USED, { skill: 'kaitiaki', boss: this, armor: skills.kaitiaki.armor });
        }
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

        // Apply noise-based offset for speedy/boss enemies
        if (this.useNoiseMovement && typeof Noise !== 'undefined') {
            var offset = Noise.getPathOffset(this.id, this.distanceTraveled);
            localX += offset.x;
            localY += offset.y;
        }

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

            // Update health color state
            healthFill.classList.remove('health-medium', 'health-low', 'health-critical');
            if (healthPercent <= 25) {
                healthFill.classList.add('health-critical');
                this.element.classList.add('low-health');
            } else if (healthPercent <= 50) {
                healthFill.classList.add('health-low');
                this.element.classList.add('low-health');
            } else if (healthPercent <= 75) {
                healthFill.classList.add('health-medium');
                this.element.classList.remove('low-health');
            } else {
                this.element.classList.remove('low-health');
            }
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
     * Apply burn DOT effect (Flame tower)
     */
    EnemyEntity.prototype.applyBurn = function(damagePerTick, duration, interval) {
        // Don't stack burns, just refresh
        this.burning = true;
        this.burnDamage = damagePerTick;
        this.burnDuration = duration;
        this.burnInterval = interval;
        this.burnTimer = 0;
        this.element.classList.add('burning');
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
        
        // Remove element after animation (taniwha boss takes longer)
        var self = this;
        var deathDuration = this.type === 'taniwha' ? 1000 : 600;
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
        if (this.element) {
            // Release to pool if pool system is available
            if (typeof Pool !== 'undefined' && this.element.dataset.poolType) {
                Pool.release(this.element);
            } else if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
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
     * @param {string} type - Enemy type (kehua, patupaiarehe, toa, taniwha)
     * @param {string} variant - Optional variant (rangatira, pakanga, tere, mate)
     */
    function spawn(type, variant) {
        var path = Path.getPathWaypoints();
        var enemy = new EnemyEntity(type, path, variant);
        enemies.push(enemy);

        // Emit boss (taniwha) spawned event
        if (type === 'taniwha' && typeof emitGameEvent === 'function') {
            emitGameEvent(EVENTS.BOSS_SPAWNED, { boss: enemy });
        }

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
