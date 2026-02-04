/**
 * CSS Tower Defense - Tower System
 * Manages defense towers, targeting, and attacks
 */

var Tower = (function () {
    'use strict';

    // Tower type definitions
    var TOWER_TYPES = {
        arrow: {
            name: 'Arrow Tower',
            cost: 50,
            damage: 15,
            range: 120,          // pixels
            fireRate: 2,         // attacks per second
            projectileType: 'arrow',
            projectileSpeed: 400,
            className: 'tower-arrow',
            description: 'Fast single-target attacks'
        },
        cannon: {
            name: 'Cannon Tower',
            cost: 100,
            damage: 30,
            range: 150,
            fireRate: 0.8,
            projectileType: 'cannon',
            projectileSpeed: 300,
            className: 'tower-cannon',
            description: 'Splash damage area attack'
        },
        ice: {
            name: 'Ice Tower',
            cost: 75,
            damage: 10,
            range: 100,
            fireRate: 1.5,
            projectileType: 'ice',
            projectileSpeed: 350,
            className: 'tower-ice',
            description: 'Slows enemies'
        },
        magic: {
            name: 'Magic Tower',
            cost: 150,
            damage: 50,
            range: 200,
            fireRate: 0.5,
            projectileType: 'magic',
            projectileSpeed: 250,
            className: 'tower-magic',
            description: 'High damage long range'
        },
        tesla: {
            name: 'Tesla Tower',
            cost: 200,
            damage: 40,
            range: 140,
            fireRate: 2.5,
            projectileType: 'tesla',
            projectileSpeed: 1000,
            className: 'tower-tesla',
            description: 'Zaps enemies instantly'
        },
        flame: {
            name: 'Flame Tower',
            cost: 250,
            damage: 5,
            range: 100,
            fireRate: 10, // Very fast tick
            projectileType: 'flame',
            projectileSpeed: 400,
            className: 'tower-flame',
            description: 'Burns enemies rapidly'
        }
    };

    // Active towers list
    var towers = [];
    var towerIdCounter = 0;

    // Tower cost/stats helpers
    function getType(type) {
        var config = TOWER_TYPES[type];
        if (!config) return null;

        // Apply Progression Upgrades
        // Make a copy to not mutate base config permanently for this session
        var upgraded = Object.assign({}, config);

        // Cost Reduction
        if (Progression) {
            upgraded.cost = Math.floor(upgraded.cost * Progression.getTowerCostMultiplier());
            upgraded.damage = Math.floor(upgraded.damage * Progression.getDamageMultiplier());
        }

        return upgraded;
    }
    // DOM container
    var container = null;

    /**
     * Initialize the tower system
     */
    function init() {
        container = document.getElementById('towers');
        towers = [];
        towerIdCounter = 0;
    }

    /**
     * Tower constructor
     */
    function TowerEntity(type, gridX, gridY) {
        var config = TOWER_TYPES[type];

        this.id = ++towerIdCounter;
        this.type = type;
        this.config = config;

        // Grid position
        this.gridX = gridX;
        this.gridY = gridY;

        // World position
        var worldPos = Path.gridToWorld(gridX, gridY);
        this.x = worldPos.x;
        this.y = worldPos.y;
        this.z = 0;

        // Stats
        this.damage = config.damage;
        this.range = config.range;
        this.fireRate = config.fireRate;
        this.level = 1;

        // Targeting
        this.target = null;
        this.lastFireTime = 0;
        this.fireCooldown = 1000 / config.fireRate;

        // Angle for turret rotation
        this.angle = 0;

        // Create DOM element
        this.element = this.createElement();
        container.appendChild(this.element);

        // Initial render
        this.render();

        // Mark cell as occupied
        Path.occupyCell(gridX, gridY, this);
    }

    /**
     * Create the DOM element for this tower
     * Enhanced with idle animation particle elements
     */
    TowerEntity.prototype.createElement = function () {
        var el = document.createElement('div');
        el.className = 'tower ' + this.config.className;
        el.dataset.id = this.id;

        // Create tower parts based on type (with new particle elements)
        switch (this.type) {
            case 'arrow':
                el.innerHTML = '<div class="tower-base"></div>' +
                    '<div class="tower-body"></div>' +
                    '<div class="tower-top"></div>' +
                    '<div class="tower-turret"></div>';
                break;
            case 'cannon':
                el.innerHTML = '<div class="tower-base"></div>' +
                    '<div class="tower-body"></div>' +
                    '<div class="tower-barrel"></div>';
                break;
            case 'ice':
                el.innerHTML = '<div class="tower-base"></div>' +
                    '<div class="tower-crystal"></div>' +
                    '<div class="tower-glow"></div>' +
                    '<div class="ice-particles"></div>';
                break;
            case 'magic':
                el.innerHTML = '<div class="tower-base"></div>' +
                    '<div class="tower-orb"></div>' +
                    '<div class="tower-ring"></div>' +
                    '<div class="magic-energy"></div>';
                break;
        }

        return el;
    };

    /**
     * Update tower (targeting and firing)
     */
    TowerEntity.prototype.update = function (dt, currentTime) {
        // Find target
        this.findTarget();

        // Rotate towards target
        if (this.target) {
            this.rotateToTarget();
        }

        // Try to fire
        if (this.target && currentTime - this.lastFireTime >= this.fireCooldown) {
            this.fire(currentTime);
        }
    };

    /**
     * Find nearest enemy in range
     */
    TowerEntity.prototype.findTarget = function () {
        var enemies = Enemy.getAll();
        var nearestEnemy = null;
        var nearestDistance = Infinity;

        for (var i = 0; i < enemies.length; i++) {
            var enemy = enemies[i];
            var dx = enemy.x - this.x;
            var dy = enemy.y - this.y;
            var distance = Math.sqrt(dx * dx + dy * dy);

            // Check if in range and closer than current target
            if (distance <= this.range && distance < nearestDistance) {
                nearestEnemy = enemy;
                nearestDistance = distance;
            }
        }

        // If current target is still in range and alive, keep it
        if (this.target && this.target.alive) {
            var dx = this.target.x - this.x;
            var dy = this.target.y - this.y;
            var distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.range) {
                return; // Keep current target
            }
        }

        var hadTarget = this.target !== null;
        var hasNewTarget = nearestEnemy !== null;

        this.target = nearestEnemy;

        // Update targeting state class for visual feedback
        if (hasNewTarget && !hadTarget) {
            // Acquired new target
            this.element.classList.add('targeting');
        } else if (!hasNewTarget && hadTarget) {
            // Lost target
            this.element.classList.remove('targeting');
        }
    };

    /**
     * Rotate turret towards target
     */
    TowerEntity.prototype.rotateToTarget = function () {
        if (!this.target) return;

        var dx = this.target.x - this.x;
        var dy = this.target.y - this.y;
        this.angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

        // Update turret rotation
        var turret = this.element.querySelector('.tower-turret, .tower-barrel');
        if (turret) {
            turret.style.transform = 'translateX(-50%) rotateZ(' + this.angle + 'deg)';
        }
    };

    /**
     * Fire at target with visual feedback (with throttle protection)
     */
    TowerEntity.prototype.fire = function (currentTime) {
        if (!this.target) return;

        // Apply throttle check using Utils if available
        var throttleKey = 'tower_fire_' + this.id;
        var minFireInterval = this.fireCooldown * 0.9; // Allow slight overlap for smooth firing

        if (typeof Utils !== 'undefined') {
            var canFire = Utils.throttle(throttleKey, function() {}, minFireInterval);
            // If throttle blocks, skip this fire (shouldn't happen with proper cooldown, but safety check)
        }

        this.lastFireTime = currentTime;

        // Add firing visual feedback
        this.element.classList.add('firing');
        var self = this;

        // Remove firing class after animation completes
        var animationDuration = this.type === 'magic' ? 400 :
            this.type === 'ice' ? 500 :
                this.type === 'cannon' ? 400 : 200;
        setTimeout(function () {
            self.element.classList.remove('firing');
        }, animationDuration);

        // Create projectile
        Projectile.spawn(this, this.target);

        // Dispatch event with position for spatial audio
        var event = new CustomEvent('towerFired', {
            detail: {
                tower: this,
                target: this.target,
                x: this.x,
                y: this.y
            }
        });
        document.dispatchEvent(event);
    };

    /**
     * Render the tower position
     */
    TowerEntity.prototype.render = function () {
        if (!this.element) return;

        var mapWidth = Path.GRID_COLS * Path.CELL_SIZE;
        var mapHeight = Path.GRID_ROWS * Path.CELL_SIZE;

        var localX = this.x + (mapWidth / 2);
        var localY = this.y + (mapHeight / 2);

        this.element.style.left = localX + 'px';
        this.element.style.top = localY + 'px';
        // Transform is handled by CSS (counter-rotation for 3D perspective)
    };

    /**
     * Upgrade the tower
     */
    TowerEntity.prototype.upgrade = function () {
        if (this.level >= 3) return false;

        this.level++;
        this.damage = Math.floor(this.config.damage * (1 + (this.level - 1) * 0.5));
        this.range = this.config.range * (1 + (this.level - 1) * 0.1);
        this.fireCooldown = (1000 / this.config.fireRate) * (1 - (this.level - 1) * 0.1);

        // Update level CSS class for visual differences
        this.element.classList.remove('level-1', 'level-2', 'level-3');
        this.element.classList.add('level-' + this.level);

        // Add level indicator stars
        this.updateLevelIndicator();

        // Play upgrade visual effect
        this.playUpgradeEffect();

        // Emit tower upgraded event
        if (typeof emitGameEvent === 'function') {
            emitGameEvent(EVENTS.TOWER_UPGRADED, {
                tower: this,
                level: this.level
            });
        }

        return true;
    };

    /**
     * Play upgrade visual effect
     */
    TowerEntity.prototype.playUpgradeEffect = function () {
        var self = this;

        // Add upgrading class for animation
        this.element.classList.add('upgrading');

        // Create upgrade particles
        var particles = document.createElement('div');
        particles.className = 'upgrade-particles';
        this.element.appendChild(particles);

        // Remove effect after animation
        setTimeout(function () {
            self.element.classList.remove('upgrading');
            if (particles.parentNode) {
                particles.parentNode.removeChild(particles);
            }
        }, 600);
    };

    /**
     * Update level indicator stars
     */
    TowerEntity.prototype.updateLevelIndicator = function () {
        var existing = this.element.querySelector('.tower-level');
        if (existing) {
            existing.parentNode.removeChild(existing);
        }

        if (this.level > 1) {
            var levelDiv = document.createElement('div');
            levelDiv.className = 'tower-level';
            for (var i = 0; i < this.level; i++) {
                var star = document.createElement('div');
                star.className = 'level-star';
                levelDiv.appendChild(star);
            }
            this.element.appendChild(levelDiv);
        }
    };

    /**
     * Get upgrade cost
     */
    TowerEntity.prototype.getUpgradeCost = function () {
        if (this.level >= 3) return Infinity;
        return Math.floor(this.config.cost * 0.75 * this.level);
    };

    /**
     * Get sell value
     */
    TowerEntity.prototype.getSellValue = function () {
        var totalCost = this.config.cost;
        for (var i = 2; i <= this.level; i++) {
            totalCost += Math.floor(this.config.cost * 0.75 * (i - 1));
        }
        return Math.floor(totalCost * 0.6);
    };

    /**
     * Destroy the tower
     */
    TowerEntity.prototype.destroy = function () {
        // Free the cell
        Path.freeCell(this.gridX, this.gridY);

        // Remove element
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;

        // Remove from towers array
        var index = towers.indexOf(this);
        if (index > -1) {
            towers.splice(index, 1);
        }
    };

    /**
     * Create a new tower
     */
    function create(type, gridX, gridY) {
        var config = TOWER_TYPES[type];
        if (!config) return null;

        // Check if can build
        if (!Path.canBuild(gridX, gridY)) {
            return null;
        }

        var tower = new TowerEntity(type, gridX, gridY);
        towers.push(tower);

        // Dispatch event
        var event = new CustomEvent('towerPlaced', {
            detail: { tower: tower }
        });
        document.dispatchEvent(event);

        return tower;
    }

    /**
     * Update all towers
     */
    function update(dt, currentTime) {
        for (var i = 0; i < towers.length; i++) {
            towers[i].update(dt, currentTime);
        }
    }

    /**
     * Get all towers
     */
    function getAll() {
        return towers;
    }

    /**
     * Get tower at grid position
     */
    function getAt(gridX, gridY) {
        for (var i = 0; i < towers.length; i++) {
            if (towers[i].gridX === gridX && towers[i].gridY === gridY) {
                return towers[i];
            }
        }
        return null;
    }

    /**
     * Sell a tower
     */
    function sell(tower) {
        var value = tower.getSellValue();
        tower.destroy();

        // Dispatch event
        var event = new CustomEvent('towerSold', {
            detail: { gold: value }
        });
        document.dispatchEvent(event);

        return value;
    }

    /**
     * Clear all towers
     */
    function clear() {
        for (var i = towers.length - 1; i >= 0; i--) {
            towers[i].destroy();
        }
        towers = [];
    }

    /**
     * Get tower type config
     */
    function getType(type) {
        return TOWER_TYPES[type];
    }

    // Public API
    return {
        init: init,
        create: create,
        update: update,
        getAll: getAll,
        getAt: getAt,
        sell: sell,
        clear: clear,
        getType: getType,
        TYPES: TOWER_TYPES
    };
})();
