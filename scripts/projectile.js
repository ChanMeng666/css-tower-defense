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
        var el = document.createElement('div');
        el.className = 'projectile projectile-' + this.type;
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
     * Create impact visual effect
     */
    ProjectileEntity.prototype.createImpact = function() {
        var impact = document.createElement('div');
        impact.className = 'impact impact-' + this.type;
        
        var mapWidth = Path.GRID_COLS * Path.CELL_SIZE;
        var mapHeight = Path.GRID_ROWS * Path.CELL_SIZE;
        
        var localX = this.x + (mapWidth / 2);
        var localY = this.y + (mapHeight / 2);
        
        impact.style.left = localX + 'px';
        impact.style.top = localY + 'px';
        impact.style.transform = 'translate(-50%, -50%) rotateX(-55deg)';
        
        container.appendChild(impact);
        
        // Remove after animation
        setTimeout(function() {
            if (impact.parentNode) {
                impact.parentNode.removeChild(impact);
            }
        }, 500);
    };
    
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
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
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
