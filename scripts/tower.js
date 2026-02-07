/**
 * CSS Tower Defense - Tower System
 * Manages defense towers, targeting, and attacks
 */

var Tower = (function () {
    'use strict';

    // Tower type definitions - Māori weapons & deities
    var TOWER_TYPES = {
        taiaha: {
            name: 'Taiaha',
            cost: 50,
            damage: 15,
            range: 120,          // pixels
            fireRate: 2,         // attacks per second
            projectileType: 'arrow',
            projectileSpeed: 400,
            className: 'tower-arrow',
            description: 'Traditional fighting staff',
            lore: 'The taiaha is a traditional Māori fighting staff, embodying the warrior spirit.'
        },
        mere: {
            name: 'Mere',
            cost: 100,
            damage: 30,
            range: 150,
            fireRate: 0.8,
            projectileType: 'cannon',
            projectileSpeed: 300,
            className: 'tower-cannon',
            description: 'Pounamu greenstone club',
            splashRadius: 60,
            lore: 'The mere is a short, flat club made of pounamu (greenstone), a symbol of chieftainship.'
        },
        tangaroa: {
            name: 'Tangaroa',
            cost: 75,
            damage: 10,
            range: 100,
            fireRate: 1.5,
            projectileType: 'ice',
            projectileSpeed: 350,
            className: 'tower-ice',
            description: 'Ocean deity\'s blessing',
            slowEffect: 0.5,
            slowDuration: 2,
            lore: 'Tangaroa is the god of the sea. His waters slow all who pass through.'
        },
        tohunga: {
            name: 'Tohunga',
            cost: 150,
            damage: 50,
            range: 200,
            fireRate: 0.5,
            projectileType: 'magic',
            projectileSpeed: 250,
            className: 'tower-magic',
            description: 'Spiritual leader\'s power',
            ignoreArmor: true,
            lore: 'Tohunga were expert priests and healers, wielding spiritual power that pierces all defenses.'
        },
        tawhiri: {
            name: 'Tāwhiri',
            cost: 200,
            damage: 40,
            range: 140,
            fireRate: 2.5,
            projectileType: 'tesla',
            projectileSpeed: 1000,
            className: 'tower-tesla',
            description: 'Storm god\'s wrath',
            chainTargets: 3,
            chainDamageFalloff: 0.7,
            lore: 'Tāwhirimātea is the god of weather and storms, whose lightning strikes many foes.'
        },
        mahuika: {
            name: 'Mahuika',
            cost: 250,
            damage: 5,
            range: 100,
            fireRate: 10, // Very fast tick
            projectileType: 'flame',
            projectileSpeed: 400,
            className: 'tower-flame',
            description: 'Sacred fire goddess',
            burnDamage: 3,
            burnDuration: 3,
            burnInterval: 0.5,
            lore: 'Mahuika is the goddess of fire. Her flames were gifted to humanity by the hero Māui.'
        }
    };

    // Active towers list
    var towers = [];
    var towerIdCounter = 0;

    // Status indicator update throttle
    var statusUpdateTimer = 0;
    var STATUS_UPDATE_INTERVAL = 1.0; // Update indicators every 1 second

    // Tower prefix/modifier system (Terraria-inspired reforging)
    var PREFIXES = {
        // Common prefixes
        swift: { name: 'Swift', rarity: 'common', fireRateMult: 1.15, color: '#AAAAAA' },
        deadly: { name: 'Deadly', rarity: 'common', damageMult: 1.20, color: '#AAAAAA' },
        keen: { name: 'Keen', rarity: 'common', rangeMult: 1.10, color: '#AAAAAA' },
        // Rare prefixes
        arcane: { name: 'Arcane', rarity: 'rare', rangeMult: 1.25, color: '#0088FF' },
        fierce: { name: 'Fierce', rarity: 'rare', damageMult: 1.25, fireRateMult: 1.05, color: '#0088FF' },
        rapid: { name: 'Rapid', rarity: 'rare', fireRateMult: 1.25, color: '#0088FF' },
        // Epic prefixes
        mythical: { name: 'Mythical', rarity: 'epic', damageMult: 1.15, fireRateMult: 1.10, rangeMult: 1.10, color: '#AA00FF' },
        godly: { name: 'Godly', rarity: 'epic', damageMult: 1.30, rangeMult: 1.15, color: '#AA00FF' },
        // Legendary prefix
        legendary: { name: 'Legendary', rarity: 'legendary', damageMult: 1.25, fireRateMult: 1.25, rangeMult: 1.25, color: '#FF8800' }
    };

    // Prefix roll weights (common more likely)
    var PREFIX_WEIGHTS = {
        common: 60,
        rare: 25,
        epic: 12,
        legendary: 3
    };

    // Synergy definitions - adjacent tower combos
    var SYNERGIES = {
        freezeLightning: {
            name: 'Freeze Lightning',
            icon: '\u26A1\u2744', // ⚡❄
            requires: ['tangaroa', 'tawhiri'],
            effect: { target: 'tawhiri', damageMult: 1.25 },
            description: 'Tesla deals +25% damage to slowed enemies'
        },
        fireBlast: {
            name: 'Fire Blast',
            icon: '\uD83D\uDD25\uD83D\uDCA5', // 🔥💥
            requires: ['mere', 'mahuika'],
            effect: { target: 'mere', splashMult: 1.3 },
            description: 'Cannon splash triggers burning'
        },
        blessing: {
            name: 'Blessing',
            icon: '\u2728', // ✨
            requires: ['tohunga'],
            effectAll: true,
            effect: { fireRateMult: 1.15 },
            description: 'Adjacent towers +15% attack speed'
        },
        array: {
            name: 'Array',
            icon: '\u25C6', // ◆
            requires: 'same',
            minCount: 2,
            effect: { rangeMult: 1.10 },
            description: 'Same-type towers +10% range (max 3x)'
        },
        pierceIce: {
            name: 'Pierce Ice',
            icon: '\u27B3\u2744', // ➳❄
            requires: ['taiaha', 'tangaroa'],
            effect: { target: 'taiaha', damageMult: 1.20 },
            description: 'Arrow deals +20% damage to slowed targets'
        }
    };

    // Tower cost/stats helpers
    function getType(type) {
        var config = TOWER_TYPES[type];
        if (!config) return null;

        // Apply Progression Upgrades
        // Make a copy to not mutate base config permanently for this session
        var upgraded = Object.assign({}, config);

        // Apply progression upgrades
        if (typeof Progression !== 'undefined') {
            upgraded.cost = Math.floor(upgraded.cost * Progression.getTowerCostMultiplier());
            upgraded.damage = Math.floor(upgraded.damage * Progression.getDamageMultiplier());
            upgraded.range = Math.floor(upgraded.range * Progression.getRangeMultiplier());

            // Attack speed affects fire rate
            upgraded.fireRate = upgraded.fireRate * Progression.getAttackSpeedMultiplier();

            // Splash radius boost
            if (upgraded.splashRadius) {
                upgraded.splashRadius = Math.floor(upgraded.splashRadius * Progression.getSplashRadiusMultiplier());
            }

            // Slow duration boost
            if (upgraded.slowDuration) {
                upgraded.slowDuration = upgraded.slowDuration * Progression.getSlowDurationMultiplier();
            }
        }

        // Apply environmental modifiers for display
        if (typeof Weather !== 'undefined' && Weather.getRangeMultiplier) {
            var envRange = Weather.getRangeMultiplier();
            if (typeof Seasons !== 'undefined' && Seasons.getTowerModifier) {
                envRange *= Seasons.getTowerModifier(type, 'range');
            }
            if (Weather.getTowerModifier) {
                envRange *= Weather.getTowerModifier(type, 'range');
            }
            upgraded.range = Math.floor(upgraded.range * envRange);
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

        // Stats (base values)
        this.baseDamage = config.damage;
        this.baseRange = config.range;
        this.baseFireRate = config.fireRate;
        this.level = 1;

        // Prefix/modifier (Terraria-style reforging)
        this.prefix = null;

        // Calculated stats (updated by applyPrefix)
        this.damage = config.damage;
        this.range = config.range;
        this.fireRate = config.fireRate;

        // Synergies (populated by synergy system)
        this.activeSynergies = [];

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
            case 'taiaha':
                el.innerHTML = '<div class="tower-base"></div>' +
                    '<div class="tower-body"></div>' +
                    '<div class="tower-top"></div>' +
                    '<div class="tower-turret"></div>';
                break;
            case 'mere':
                el.innerHTML = '<div class="tower-base"></div>' +
                    '<div class="tower-body"></div>' +
                    '<div class="tower-barrel"></div>';
                break;
            case 'tangaroa':
                el.innerHTML = '<div class="tower-base"></div>' +
                    '<div class="tower-crystal"></div>' +
                    '<div class="tower-glow"></div>' +
                    '<div class="ice-particles"></div>';
                break;
            case 'tohunga':
                el.innerHTML = '<div class="tower-base"></div>' +
                    '<div class="tower-orb"></div>' +
                    '<div class="tower-ring"></div>' +
                    '<div class="magic-energy"></div>';
                break;
            case 'tawhiri':
                el.innerHTML = '<div class="tower-base"></div>' +
                    '<div class="tower-coil"></div>' +
                    '<div class="tower-spark"></div>' +
                    '<div class="tesla-arc"></div>';
                break;
            case 'mahuika':
                el.innerHTML = '<div class="tower-base"></div>' +
                    '<div class="tower-tank"></div>' +
                    '<div class="tower-nozzle"></div>' +
                    '<div class="flame-particles"></div>';
                break;
        }

        return el;
    };

    /**
     * Update tower (targeting and firing)
     */
    TowerEntity.prototype.update = function (dt, currentTime) {
        // Check stun state
        if (this.stunned) {
            this.stunTimer -= dt;
            if (this.stunTimer <= 0) {
                this.stunned = false;
                this.element.classList.remove('stunned');
            }
            return; // Can't target or fire while stunned
        }

        // Find target
        this.findTarget();

        // Rotate towards target
        if (this.target) {
            this.rotateToTarget();
        }

        // Try to fire (use environmental cooldown)
        if (this.target && currentTime - this.lastFireTime >= this.getEffectiveCooldown()) {
            this.fire(currentTime);
        }
    };

    /**
     * Apply stun effect (from Tipua trample)
     */
    TowerEntity.prototype.applyStun = function (duration) {
        this.stunned = true;
        this.stunTimer = duration;
        this.target = null; // Lose current target
        this.element.classList.add('stunned');
    };

    /**
     * Get effective range including environmental and synergy modifiers
     */
    TowerEntity.prototype.getEffectiveRange = function () {
        var envRange = 1.0;
        if (typeof Weather !== 'undefined' && Weather.getRangeMultiplier) {
            envRange *= Weather.getRangeMultiplier();
        }
        if (typeof Seasons !== 'undefined' && Seasons.getTowerModifier) {
            envRange *= Seasons.getTowerModifier(this.type, 'range');
        }
        if (typeof Weather !== 'undefined' && Weather.getTowerModifier) {
            envRange *= Weather.getTowerModifier(this.type, 'range');
        }
        // Apply synergy range bonus
        if (this._synergyBonuses) {
            envRange *= this._synergyBonuses.rangeMult;
        }
        // Center island bonus (Te Moana map)
        if (Path.isCenterIsland && Path.isCenterIsland(this.gridX, this.gridY)) {
            envRange *= 1.2; // +20% range on center island
        }
        // Apply endless mode range bonus
        if (typeof Wave !== 'undefined' && Wave.isEndless && Wave.isEndless()) {
            var eb = Wave.getEndlessBonuses();
            if (eb && eb.rangeMult) envRange *= eb.rangeMult;
        }
        return this.range * envRange;
    };

    /**
     * Find nearest enemy in range
     */
    TowerEntity.prototype.findTarget = function () {
        var enemies = Enemy.getAll();
        var nearestEnemy = null;
        var nearestDistance = Infinity;
        var effectiveRange = this.getEffectiveRange();

        for (var i = 0; i < enemies.length; i++) {
            var enemy = enemies[i];

            // Skip stealthed enemies unless this is a tohunga (magic) tower
            if (enemy.stealthed && this.type !== 'tohunga') {
                continue;
            }

            var dx = enemy.x - this.x;
            var dy = enemy.y - this.y;
            var distance = Math.sqrt(dx * dx + dy * dy);

            // Check if in range and closer than current target
            if (distance <= effectiveRange && distance < nearestDistance) {
                nearestEnemy = enemy;
                nearestDistance = distance;
            }
        }

        // If current target is still in range and alive, keep it
        if (this.target && this.target.alive) {
            var dx = this.target.x - this.x;
            var dy = this.target.y - this.y;
            var distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= effectiveRange) {
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
     * Get effective fire cooldown including environmental and synergy modifiers
     */
    TowerEntity.prototype.getEffectiveCooldown = function () {
        var envFireRate = 1.0;
        if (typeof Weather !== 'undefined' && Weather.getTowerModifier) {
            envFireRate *= Weather.getTowerModifier(this.type, 'fireRate');
        }
        if (typeof Seasons !== 'undefined' && Seasons.getTowerModifier) {
            envFireRate *= Seasons.getTowerModifier(this.type, 'fireRate');
        }
        // Apply crafting attack speed
        if (typeof Crafting !== 'undefined' && Crafting.getMultiplier) {
            envFireRate *= Crafting.getMultiplier('attack_speed_mult');
        }
        // Apply synergy fire rate bonus
        if (this._synergyBonuses) {
            envFireRate *= this._synergyBonuses.fireRateMult;
        }
        // Apply mana ability boost (Tūpuna)
        if (typeof Game !== 'undefined' && Game.isAbilityActive && Game.isAbilityActive('tupuna')) {
            envFireRate *= 2.0;
        }
        // Higher fire rate multiplier = shorter cooldown
        return this.fireCooldown / envFireRate;
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
        var animationDuration = this.type === 'tohunga' ? 400 :
            this.type === 'tangaroa' ? 500 :
                this.type === 'mere' ? 400 : 200;
        setTimeout(function () {
            self.element.classList.remove('firing');
        }, animationDuration);

        // Apply environmental + crafting + synergy damage modifier before spawning projectile
        var baseDamage = this.damage;
        var envDamage = 1.0;
        if (typeof Weather !== 'undefined' && Weather.getTowerModifier) {
            envDamage *= Weather.getTowerModifier(this.type, 'damage');
        }
        if (typeof Seasons !== 'undefined' && Seasons.getTowerModifier) {
            envDamage *= Seasons.getTowerModifier(this.type, 'damage');
        }
        if (typeof Crafting !== 'undefined' && Crafting.getMultiplier) {
            envDamage *= Crafting.getMultiplier('damage_mult');
        }
        // Apply synergy damage bonus
        if (this._synergyBonuses) {
            envDamage *= this._synergyBonuses.damageMult;
        }
        // Apply endless mode damage bonus
        if (typeof Wave !== 'undefined' && Wave.isEndless && Wave.isEndless()) {
            var eb = Wave.getEndlessBonuses();
            if (eb && eb.damageMult) envDamage *= eb.damageMult;
        }
        this.damage = Math.floor(baseDamage * envDamage);

        // Create projectile
        Projectile.spawn(this, this.target);

        // Restore base damage after projectile captures it
        this.damage = baseDamage;

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

        // Recalculate stats (includes prefix if any)
        this.applyPrefix();

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
     * Get reforge cost (50% of base cost)
     */
    TowerEntity.prototype.getReforgeCost = function () {
        return Math.floor(this.config.cost * 0.5);
    };

    /**
     * Reforge tower with random prefix
     */
    TowerEntity.prototype.reforge = function () {
        // Roll for prefix rarity
        var roll = Math.random() * 100;
        var cumulative = 0;
        var targetRarity = 'common';

        for (var rarity in PREFIX_WEIGHTS) {
            cumulative += PREFIX_WEIGHTS[rarity];
            if (roll < cumulative) {
                targetRarity = rarity;
                break;
            }
        }

        // Get all prefixes of that rarity
        var candidates = [];
        for (var prefixId in PREFIXES) {
            if (PREFIXES[prefixId].rarity === targetRarity) {
                candidates.push(prefixId);
            }
        }

        // Pick random prefix (ensure different from current if possible)
        if (candidates.length > 1 && this.prefix) {
            var currentIndex = candidates.indexOf(this.prefix);
            if (currentIndex > -1) {
                candidates.splice(currentIndex, 1);
            }
        }

        var newPrefixId = candidates[Math.floor(Math.random() * candidates.length)];
        this.prefix = newPrefixId;
        this.applyPrefix();

        return PREFIXES[newPrefixId];
    };

    /**
     * Apply prefix modifiers to tower stats
     */
    TowerEntity.prototype.applyPrefix = function () {
        // Reset to base stats with level scaling
        var levelDamageMult = 1 + (this.level - 1) * 0.5;
        var levelRangeMult = 1 + (this.level - 1) * 0.1;
        var levelFireRateMult = 1 - (this.level - 1) * 0.1;

        this.damage = Math.floor(this.baseDamage * levelDamageMult);
        this.range = this.baseRange * levelRangeMult;
        this.fireCooldown = (1000 / this.baseFireRate) * levelFireRateMult;

        // Apply prefix if exists
        if (this.prefix && PREFIXES[this.prefix]) {
            var p = PREFIXES[this.prefix];
            if (p.damageMult) this.damage = Math.floor(this.damage * p.damageMult);
            if (p.rangeMult) this.range *= p.rangeMult;
            if (p.fireRateMult) this.fireCooldown /= p.fireRateMult;
        }

        // Update visual
        this.updatePrefixVisual();
    };

    /**
     * Update tower visual to show prefix
     */
    TowerEntity.prototype.updatePrefixVisual = function () {
        // Remove old prefix indicator
        var existing = this.element.querySelector('.tower-prefix');
        if (existing) existing.parentNode.removeChild(existing);

        if (this.prefix && PREFIXES[this.prefix]) {
            var p = PREFIXES[this.prefix];
            var prefixEl = document.createElement('div');
            prefixEl.className = 'tower-prefix prefix-' + p.rarity;
            prefixEl.textContent = p.name;
            prefixEl.style.color = p.color;
            this.element.appendChild(prefixEl);

            // Add rarity glow
            this.element.classList.remove('prefix-common', 'prefix-rare', 'prefix-epic', 'prefix-legendary');
            this.element.classList.add('prefix-' + p.rarity);
        }
    };

    /**
     * Get adjacent towers (within 1 grid cell in 4 cardinal + 4 diagonal directions)
     */
    TowerEntity.prototype.getAdjacentTowers = function () {
        var adjacent = [];
        var offsets = [
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
            { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
        ];

        for (var i = 0; i < offsets.length; i++) {
            var nx = this.gridX + offsets[i].dx;
            var ny = this.gridY + offsets[i].dy;
            var neighbor = getAt(nx, ny);
            if (neighbor) {
                adjacent.push(neighbor);
            }
        }
        return adjacent;
    };

    /**
     * Get synergy bonuses for this tower based on adjacent towers
     * Returns { damageMult, fireRateMult, rangeMult, splashMult, synergies[] }
     */
    TowerEntity.prototype.getSynergyBonuses = function () {
        var bonuses = { damageMult: 1, fireRateMult: 1, rangeMult: 1, splashMult: 1, synergies: [] };
        var adjacent = this.getAdjacentTowers();
        if (adjacent.length === 0) return bonuses;

        var adjacentTypes = {};
        for (var i = 0; i < adjacent.length; i++) {
            adjacentTypes[adjacent[i].type] = (adjacentTypes[adjacent[i].type] || 0) + 1;
        }

        for (var synergyId in SYNERGIES) {
            var syn = SYNERGIES[synergyId];

            // Array synergy: same-type adjacent
            if (syn.requires === 'same') {
                var sameCount = adjacentTypes[this.type] || 0;
                if (sameCount >= syn.minCount) {
                    var stacks = Math.min(sameCount, 3);
                    var arrayRangeMult = 1 + (syn.effect.rangeMult - 1) * stacks;
                    bonuses.rangeMult *= arrayRangeMult;
                    bonuses.synergies.push({ id: synergyId, name: syn.name, icon: syn.icon, stacks: stacks });
                }
                continue;
            }

            // Blessing synergy: tohunga buffs all adjacent
            if (syn.effectAll) {
                if (this.type !== 'tohunga' && adjacentTypes['tohunga']) {
                    bonuses.fireRateMult *= syn.effect.fireRateMult;
                    bonuses.synergies.push({ id: synergyId, name: syn.name, icon: syn.icon });
                }
                continue;
            }

            // Pair synergies: check if this tower is the target and the partner is adjacent
            if (syn.requires && Array.isArray(syn.requires) && syn.effect.target) {
                if (this.type === syn.effect.target) {
                    var partnerType = syn.requires[0] === syn.effect.target ? syn.requires[1] : syn.requires[0];
                    if (adjacentTypes[partnerType]) {
                        if (syn.effect.damageMult) bonuses.damageMult *= syn.effect.damageMult;
                        if (syn.effect.fireRateMult) bonuses.fireRateMult *= syn.effect.fireRateMult;
                        if (syn.effect.rangeMult) bonuses.rangeMult *= syn.effect.rangeMult;
                        if (syn.effect.splashMult) bonuses.splashMult *= syn.effect.splashMult;
                        bonuses.synergies.push({ id: synergyId, name: syn.name, icon: syn.icon });
                    }
                }
            }
        }

        return bonuses;
    };

    /**
     * Update floating status indicators above the tower
     */
    TowerEntity.prototype.updateStatusIndicators = function () {
        // Remove existing status container
        var existing = this.element.querySelector('.tower-status');
        if (existing) existing.remove();

        var indicators = [];

        // Upgrade available indicator
        if (this.level < 3 && Game.getGold() >= this.getUpgradeCost()) {
            indicators.push('upgrade');
        }

        // Weather/season buff/debuff indicators
        var envDamage = 1.0;
        var envRange = 1.0;
        var envFireRate = 1.0;
        if (typeof Weather !== 'undefined' && Weather.getTowerModifier) {
            envDamage *= Weather.getTowerModifier(this.type, 'damage');
            envRange *= Weather.getTowerModifier(this.type, 'range');
            envFireRate *= Weather.getTowerModifier(this.type, 'fireRate');
        }
        if (typeof Seasons !== 'undefined' && Seasons.getTowerModifier) {
            envDamage *= Seasons.getTowerModifier(this.type, 'damage');
            envRange *= Seasons.getTowerModifier(this.type, 'range');
            envFireRate *= Seasons.getTowerModifier(this.type, 'fireRate');
        }

        var totalEnv = envDamage * envRange * envFireRate;
        if (totalEnv > 1.05) {
            indicators.push('buff');
        } else if (totalEnv < 0.95) {
            indicators.push('debuff');
        }

        // Synergy indicator (check if tower has active synergies)
        if (this.activeSynergies && this.activeSynergies.length > 0) {
            indicators.push('synergy');
        }

        // Only show if there are indicators
        if (indicators.length === 0) return;

        var container = document.createElement('div');
        container.className = 'tower-status';
        for (var i = 0; i < indicators.length; i++) {
            var icon = document.createElement('div');
            icon.className = 'status-icon status-' + indicators[i];
            container.appendChild(icon);
        }
        this.element.appendChild(container);
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
     * Recalculate synergy bonuses for all towers
     */
    function recalculateAllSynergies() {
        for (var i = 0; i < towers.length; i++) {
            var bonuses = towers[i].getSynergyBonuses();
            towers[i]._synergyBonuses = bonuses;
            towers[i].activeSynergies = bonuses.synergies;
        }
    }

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

        // Recalculate synergies for all towers
        recalculateAllSynergies();

        // Trigger synergy flash effects for newly activated synergies
        if (tower.activeSynergies && tower.activeSynergies.length > 0 && typeof Effects !== 'undefined' && Effects.synergyFlash) {
            var adjacent = tower.getAdjacentTowers();
            for (var a = 0; a < adjacent.length; a++) {
                if (adjacent[a].activeSynergies && adjacent[a].activeSynergies.length > 0) {
                    Effects.synergyFlash(tower, adjacent[a]);
                }
            }
        }

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

        // Periodically update synergies and status indicators
        statusUpdateTimer += dt;
        if (statusUpdateTimer >= STATUS_UPDATE_INTERVAL) {
            statusUpdateTimer = 0;
            recalculateAllSynergies();
            for (var j = 0; j < towers.length; j++) {
                towers[j].updateStatusIndicators();
            }
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

        // Recalculate synergies after tower removal
        recalculateAllSynergies();

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
        recalculateSynergies: recalculateAllSynergies,
        TYPES: TOWER_TYPES,
        PREFIXES: PREFIXES,
        SYNERGIES: SYNERGIES
    };
})();
