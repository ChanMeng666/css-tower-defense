/**
 * CSS Tower Defense - Projectile System
 * Manages projectiles, flight, and collision detection
 */

var Projectile = (function() {
    'use strict';
    
    // Active projectiles list
    var projectiles = [];
    var projectileIdCounter = 0;
    
    // DOM container
    var container = null;
    
    /**
     * Initialize the projectile system
     */
    function init() {
        container = document.getElementById('projectiles');
        projectiles = [];
        projectileIdCounter = 0;
    }
    
    /**
     * Projectile constructor
     */
    function ProjectileEntity(tower, target) {
        this.id = ++projectileIdCounter;
        this.tower = tower;
        this.target = target;
        this.type = tower.config.projectileType;
        
        // Position
        this.x = tower.x;
        this.y = tower.y;
        this.z = 0;
        
        // Target position (captured at spawn time)
        this.targetX = target.x;
        this.targetY = target.y;
        
        // Speed
        this.speed = tower.config.projectileSpeed;
        
        // Damage and effects
        this.damage = tower.damage;
        this.splashRadius = tower.config.splashRadius || 0;
        this.slowEffect = tower.config.slowEffect || 0;
        this.slowDuration = tower.config.slowDuration || 0;
        this.ignoreArmor = tower.config.ignoreArmor || false;
        
        // Calculate direction
        var dx = this.targetX - this.x;
        var dy = this.targetY - this.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        this.dirX = dx / distance;
        this.dirY = dy / distance;
        
        // Calculate angle for rotation
        this.angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // State
        this.alive = true;
        this.distanceTraveled = 0;
        this.maxDistance = distance + 50; // Allow some overshoot
        
        // Create DOM element
        this.element = this.createElement();
        container.appendChild(this.element);
        
        // Initial render
        this.render();
    }
    
    /**
     * Create the DOM element for this projectile
     */
    ProjectileEntity.prototype.createElement = function() {
        var el;

        // Use pool if available
        if (typeof Pool !== 'undefined') {
            el = Pool.acquire('projectile', 'projectile-' + this.type);
        } else {
            el = document.createElement('div');
            el.className = 'projectile projectile-' + this.type;
        }

        el.dataset.id = this.id;
        return el;
    };
    
    /**
     * Update projectile position
     */
    ProjectileEntity.prototype.update = function(dt) {
        if (!this.alive) return;
        
        // Move towards direction
        var moveDistance = this.speed * dt;
        this.x += this.dirX * moveDistance;
        this.y += this.dirY * moveDistance;
        this.distanceTraveled += moveDistance;
        
        // Check for collision with target enemy
        if (this.target && this.target.alive) {
            var dx = this.target.x - this.x;
            var dy = this.target.y - this.y;
            var distance = Math.sqrt(dx * dx + dy * dy);
            
            // Hit detection (within 15 pixels)
            if (distance < 15) {
                this.hit();
                return;
            }
            
            // Update target position (homing)
            this.targetX = this.target.x;
            this.targetY = this.target.y;
            
            // Recalculate direction
            var newDx = this.targetX - this.x;
            var newDy = this.targetY - this.y;
            var newDistance = Math.sqrt(newDx * newDx + newDy * newDy);
            if (newDistance > 0) {
                this.dirX = newDx / newDistance;
                this.dirY = newDy / newDistance;
                this.angle = Math.atan2(newDy, newDx) * (180 / Math.PI);
            }
        }
        
        // Check if traveled too far (miss)
        if (this.distanceTraveled > this.maxDistance) {
            this.miss();
            return;
        }
        
        // Update visual
        this.render();
    };
    
    /**
     * Render the projectile position
     */
    ProjectileEntity.prototype.render = function() {
        if (!this.element) return;
        
        var mapWidth = Path.GRID_COLS * Path.CELL_SIZE;
        var mapHeight = Path.GRID_ROWS * Path.CELL_SIZE;
        
        var localX = this.x + (mapWidth / 2);
        var localY = this.y + (mapHeight / 2);
        
        this.element.style.left = localX + 'px';
        this.element.style.top = localY + 'px';
        // Counter-rotate from map perspective (-55deg) and add direction rotation
        this.element.style.transform = 'translate(-50%, -50%) rotateX(-55deg) rotateZ(' + this.angle + 'deg)';
    };
    
    /**
     * Handle hitting a target
     */
    ProjectileEntity.prototype.hit = function() {
        this.alive = false;
        
        // Create impact effect
        this.createImpact();
        
        // Apply damage
        if (this.splashRadius > 0) {
            // Area damage
            this.applySplashDamage();
        } else {
            // Single target damage
            if (this.target && this.target.alive) {
                var actualDamage = this.ignoreArmor ? this.damage : this.damage;
                if (this.ignoreArmor) {
                    // Bypass armor - deal full damage
                    this.target.health -= this.damage;
                    var healthPercent = Math.max(0, (this.target.health / this.target.maxHealth) * 100);
                    var healthFill = this.target.element.querySelector('.health-fill');
                    if (healthFill) {
                        healthFill.style.width = healthPercent + '%';
                    }
                    if (this.target.health <= 0) {
                        this.target.die();
                    }
                } else {
                    this.target.takeDamage(this.damage);
                }
                
                // Apply slow effect
                if (this.slowEffect > 0) {
                    this.target.applySlow(this.slowEffect, this.slowDuration);
                }
            }
        }
        
        // Remove projectile
        this.destroy();
    };
    
    /**
     * Apply splash damage to all enemies in radius
     */
    ProjectileEntity.prototype.applySplashDamage = function() {
        var enemies = Enemy.getAll();
        
        for (var i = 0; i < enemies.length; i++) {
            var enemy = enemies[i];
            var dx = enemy.x - this.x;
            var dy = enemy.y - this.y;
            var distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.splashRadius) {
                // Damage falls off with distance
                var falloff = 1 - (distance / this.splashRadius) * 0.5;
                var actualDamage = Math.floor(this.damage * falloff);
                
                if (this.ignoreArmor) {
                    enemy.health -= actualDamage;
                    var healthPercent = Math.max(0, (enemy.health / enemy.maxHealth) * 100);
                    var healthFill = enemy.element.querySelector('.health-fill');
                    if (healthFill) {
                        healthFill.style.width = healthPercent + '%';
                    }
                    if (enemy.health <= 0) {
                        enemy.die();
                    }
                } else {
                    enemy.takeDamage(actualDamage);
                }
                
                // Apply slow effect
                if (this.slowEffect > 0) {
                    enemy.applySlow(this.slowEffect, this.slowDuration);
                }
            }
        }
    };
    
    /**
     * Create enhanced impact visual effect with multi-stage elements
     */
    ProjectileEntity.prototype.createImpact = function() {
        var impact;

        // Use pool if available
        if (typeof Pool !== 'undefined') {
            impact = Pool.acquire('impact', 'impact-' + this.type);
        } else {
            impact = document.createElement('div');
            impact.className = 'impact impact-' + this.type;
        }
        
        var mapWidth = Path.GRID_COLS * Path.CELL_SIZE;
        var mapHeight = Path.GRID_ROWS * Path.CELL_SIZE;
        
        var localX = this.x + (mapWidth / 2);
        var localY = this.y + (mapHeight / 2);
        
        impact.style.left = localX + 'px';
        impact.style.top = localY + 'px';
        impact.style.transform = 'translate(-50%, -50%) rotateX(-55deg)';
        
        // Add type-specific enhanced elements
        switch (this.type) {
            case 'arrow':
                // Add spark particles
                var sparks = document.createElement('div');
                sparks.className = 'impact-sparks';
                impact.appendChild(sparks);
                break;
                
            case 'cannon':
                // Add debris particles
                var debris = document.createElement('div');
                debris.className = 'impact-debris';
                impact.appendChild(debris);
                
                // Add smoke cloud
                var smoke = document.createElement('div');
                smoke.className = 'impact-smoke';
                impact.appendChild(smoke);
                
                // Apply screen shake for cannon impacts
                triggerScreenShake('heavy');
                break;
                
            case 'ice':
                // Add crystal particles
                var crystals = document.createElement('div');
                crystals.className = 'impact-crystals';
                impact.appendChild(crystals);
                
                // Add secondary frost ring
                var frostRing = document.createElement('div');
                frostRing.className = 'impact-frost-ring';
                impact.appendChild(frostRing);
                break;
                
            case 'magic':
                // Add magic particles
                var magicParticles = document.createElement('div');
                magicParticles.className = 'impact-magic-particles';
                impact.appendChild(magicParticles);

                // Add magic glow
                var magicGlow = document.createElement('div');
                magicGlow.className = 'impact-magic-glow';
                impact.appendChild(magicGlow);

                // Slight screen shake for magic
                triggerScreenShake('light');
                break;

            case 'flame':
                // Add flame burst effect
                var flameBurst = document.createElement('div');
                flameBurst.className = 'impact-flame-burst';
                impact.appendChild(flameBurst);

                // Add smoke trail
                var smokeTrail = document.createElement('div');
                smokeTrail.className = 'impact-smoke';
                impact.appendChild(smokeTrail);

                // Apply burning effect to target enemy
                if (this.target && this.target.element && typeof Effects !== 'undefined') {
                    Effects.applyBurningEffect(this.target.element);

                    // Remove burning effect after 3 seconds
                    var targetElement = this.target.element;
                    setTimeout(function() {
                        if (targetElement && typeof Effects !== 'undefined') {
                            Effects.removeBurningEffect(targetElement);
                        }
                    }, 3000);
                }
                break;

            case 'tesla':
                // Add electric arc effect
                var electricArc = document.createElement('div');
                electricArc.className = 'impact-electric-arc';
                impact.appendChild(electricArc);

                // Add spark burst
                var sparkBurst = document.createElement('div');
                sparkBurst.className = 'impact-spark-burst';
                impact.appendChild(sparkBurst);

                // Light screen shake for tesla
                triggerScreenShake('light');
                break;
        }
        
        container.appendChild(impact);

        // Remove after animation (longer for cannon)
        var duration = this.type === 'cannon' ? 800 :
                       this.type === 'magic' ? 700 :
                       this.type === 'ice' ? 700 :
                       this.type === 'flame' ? 600 :
                       this.type === 'tesla' ? 400 : 500;

        setTimeout(function() {
            // Release to pool if available
            if (typeof Pool !== 'undefined' && impact.dataset.poolType) {
                // Clear child elements before releasing
                impact.innerHTML = '';
                Pool.release(impact);
            } else if (impact.parentNode) {
                impact.parentNode.removeChild(impact);
            }
        }, duration);
    };

    /**
     * Trigger screen shake effect
     * Disabled for normal gameplay - the rotation in shake animation
     * conflicts with map perspective and causes visual issues.
     * Only enable for special events like boss spawns.
     * @param {string} intensity - 'light', 'heavy'
     * @param {boolean} force - Force shake even for light intensity
     */
    function triggerScreenShake(intensity, force) {
        // Disabled for normal hits - causes map tilt issues
        // Only allow heavy + forced shakes (boss events)
        if (!force && intensity !== 'heavy') return;
        if (!force) return; // Disable all shakes for now until CSS is fixed

        var scene = document.getElementById('scene');
        if (!scene) return;

        var shakeClass = intensity === 'heavy' ? 'screen-shake-heavy' : 'screen-shake';
        var duration = intensity === 'heavy' ? 400 : 300;

        scene.classList.add(shakeClass);

        setTimeout(function() {
            scene.classList.remove(shakeClass);
        }, duration);
    }
    
    /**
     * Handle missing the target
     */
    ProjectileEntity.prototype.miss = function() {
        this.alive = false;
        this.destroy();
    };
    
    /**
     * Remove projectile from DOM and array
     */
    ProjectileEntity.prototype.destroy = function() {
        if (this.element) {
            // Release to pool if pool system is available
            if (typeof Pool !== 'undefined' && this.element.dataset.poolType) {
                Pool.release(this.element);
            } else if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }
        this.element = null;

        // Remove from projectiles array
        var index = projectiles.indexOf(this);
        if (index > -1) {
            projectiles.splice(index, 1);
        }
    };
    
    /**
     * Spawn a new projectile
     */
    function spawn(tower, target) {
        var projectile = new ProjectileEntity(tower, target);
        projectiles.push(projectile);
        return projectile;
    }
    
    /**
     * Update all projectiles
     */
    function update(dt) {
        for (var i = projectiles.length - 1; i >= 0; i--) {
            projectiles[i].update(dt);
        }
    }
    
    /**
     * Clear all projectiles
     */
    function clear() {
        for (var i = projectiles.length - 1; i >= 0; i--) {
            projectiles[i].destroy();
        }
        projectiles = [];
    }
    
    // Public API
    return {
        init: init,
        spawn: spawn,
        update: update,
        clear: clear
    };
})();
