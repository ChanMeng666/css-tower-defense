/**
 * CSS Tower Defense - Path System
 * Manages the game map grid and enemy path
 * Supports multiple map configurations
 */

var Path = (function() {
    'use strict';

    // ===========================================
    // MAP DEFINITIONS
    // ===========================================

    var MAP_DATA = {
        teAwa: {
            name: 'Te Awa',
            subtitle: 'The River',
            description: 'Classic serpentine path through the valley',
            cols: 12,
            rows: 8,
            cellSize: 60,
            waypoints: [
                { x: 0, y: 3 },
                { x: 2, y: 3 },
                { x: 2, y: 1 },
                { x: 5, y: 1 },
                { x: 5, y: 5 },
                { x: 8, y: 5 },
                { x: 8, y: 2 },
                { x: 10, y: 2 },
                { x: 10, y: 6 },
                { x: 11, y: 6 }
            ]
        },
        teMaunga: {
            name: 'Te Maunga',
            subtitle: 'The Mountain',
            description: 'Forked path — enemies choose randomly',
            cols: 14,
            rows: 8,
            cellSize: 54,
            // Two paths that fork and rejoin
            waypoints: [
                { x: 0, y: 3 },
                { x: 3, y: 3 }
                // Fork point at (3,3) — branches defined below
            ],
            branches: [
                // Upper branch
                [
                    { x: 3, y: 3 },
                    { x: 3, y: 1 },
                    { x: 7, y: 1 },
                    { x: 7, y: 3 },
                    { x: 10, y: 3 }
                ],
                // Lower branch
                [
                    { x: 3, y: 3 },
                    { x: 3, y: 6 },
                    { x: 7, y: 6 },
                    { x: 7, y: 4 },
                    { x: 10, y: 4 }
                ]
            ],
            // After branches rejoin
            waypointsEnd: [
                { x: 10, y: 3 },
                { x: 10, y: 5 },
                { x: 13, y: 5 }
            ],
            waypointsEndLower: [
                { x: 10, y: 4 },
                { x: 10, y: 5 },
                { x: 13, y: 5 }
            ]
        },
        teMoana: {
            name: 'Te Moana',
            subtitle: 'The Ocean',
            description: 'Circular path with center island bonus',
            cols: 10,
            rows: 10,
            cellSize: 54,
            waypoints: [
                { x: 0, y: 4 },
                { x: 2, y: 4 },
                { x: 2, y: 1 },
                { x: 7, y: 1 },
                { x: 7, y: 4 },
                { x: 7, y: 8 },
                { x: 2, y: 8 },
                { x: 2, y: 6 },
                { x: 4, y: 6 },
                { x: 4, y: 9 },
                { x: 9, y: 9 }
            ],
            // Center island cells get range bonus
            centerIsland: [
                { x: 4, y: 3 }, { x: 5, y: 3 },
                { x: 4, y: 4 }, { x: 5, y: 4 },
                { x: 4, y: 5 }, { x: 5, y: 5 }
            ]
        }
    };

    // Current map state
    var currentMapId = 'teAwa';
    var GRID_COLS = 12;
    var GRID_ROWS = 8;
    var CELL_SIZE = 60;
    var pathData = MAP_DATA.teAwa.waypoints;

    // Grid state
    var grid = [];
    var pathCells = [];

    /**
     * Set the active map
     * @param {string} mapId - Key from MAP_DATA
     */
    function setMap(mapId) {
        if (!MAP_DATA[mapId]) return;
        currentMapId = mapId;
        var map = MAP_DATA[mapId];
        GRID_COLS = map.cols;
        GRID_ROWS = map.rows;
        CELL_SIZE = map.cellSize;
        pathData = map.waypoints;
    }

    /**
     * Get current map ID
     */
    function getCurrentMap() {
        return currentMapId;
    }

    /**
     * Get all available maps
     */
    function getMaps() {
        var maps = [];
        for (var id in MAP_DATA) {
            if (MAP_DATA.hasOwnProperty(id)) {
                maps.push({
                    id: id,
                    name: MAP_DATA[id].name,
                    subtitle: MAP_DATA[id].subtitle,
                    description: MAP_DATA[id].description
                });
            }
        }
        return maps;
    }

    /**
     * Initialize the grid
     */
    function init() {
        grid = [];
        pathCells = calculatePathCells();

        for (var y = 0; y < GRID_ROWS; y++) {
            grid[y] = [];
            for (var x = 0; x < GRID_COLS; x++) {
                var isPath = isOnPath(x, y);
                var allWaypoints = getAllWaypoints();
                var firstWp = allWaypoints[0];
                var lastWp = allWaypoints[allWaypoints.length - 1];
                var isStart = (x === firstWp.x && y === firstWp.y);
                var isEnd = (x === lastWp.x && y === lastWp.y);

                var isCenterIsland = false;
                var map = MAP_DATA[currentMapId];
                if (map.centerIsland) {
                    for (var ci = 0; ci < map.centerIsland.length; ci++) {
                        if (map.centerIsland[ci].x === x && map.centerIsland[ci].y === y) {
                            isCenterIsland = true;
                            break;
                        }
                    }
                }

                grid[y][x] = {
                    x: x,
                    y: y,
                    type: isPath ? 'path' : 'grass',
                    isStart: isStart,
                    isEnd: isEnd,
                    buildable: !isPath,
                    occupied: false,
                    tower: null,
                    centerIsland: isCenterIsland
                };
            }
        }

        return grid;
    }

    /**
     * Get all waypoints including branches for path calculation
     */
    function getAllWaypoints() {
        var map = MAP_DATA[currentMapId];
        var all = (map.waypoints || []).slice();

        if (map.branches) {
            for (var b = 0; b < map.branches.length; b++) {
                var branch = map.branches[b];
                for (var i = 0; i < branch.length; i++) {
                    all.push(branch[i]);
                }
            }
        }
        if (map.waypointsEnd) {
            for (var e = 0; e < map.waypointsEnd.length; e++) {
                all.push(map.waypointsEnd[e]);
            }
        }
        if (map.waypointsEndLower) {
            for (var el = 0; el < map.waypointsEndLower.length; el++) {
                all.push(map.waypointsEndLower[el]);
            }
        }

        return all;
    }

    /**
     * Calculate all cells that are on any path
     */
    function calculatePathCells() {
        var cells = [];
        var map = MAP_DATA[currentMapId];

        // Main waypoints
        addSegmentCells(cells, map.waypoints);

        // Branch paths
        if (map.branches) {
            for (var b = 0; b < map.branches.length; b++) {
                addSegmentCells(cells, map.branches[b]);
            }
        }
        if (map.waypointsEnd) {
            addSegmentCells(cells, map.waypointsEnd);
        }
        if (map.waypointsEndLower) {
            addSegmentCells(cells, map.waypointsEndLower);
        }

        return cells;
    }

    /**
     * Add cells between consecutive waypoints
     */
    function addSegmentCells(cells, waypoints) {
        for (var i = 0; i < waypoints.length - 1; i++) {
            var start = waypoints[i];
            var end = waypoints[i + 1];

            if (start.y === end.y) {
                var minX = Math.min(start.x, end.x);
                var maxX = Math.max(start.x, end.x);
                for (var x = minX; x <= maxX; x++) {
                    cells.push({ x: x, y: start.y });
                }
            } else if (start.x === end.x) {
                var minY = Math.min(start.y, end.y);
                var maxY = Math.max(start.y, end.y);
                for (var y = minY; y <= maxY; y++) {
                    cells.push({ x: start.x, y: y });
                }
            }
        }
    }

    /**
     * Check if a cell is on the path
     */
    function isOnPath(x, y) {
        for (var i = 0; i < pathCells.length; i++) {
            if (pathCells[i].x === x && pathCells[i].y === y) {
                return true;
            }
        }
        return false;
    }

    /**
     * Render the grid to the DOM
     */
    function render() {
        var mapElement = document.getElementById('map');

        // Update map dimensions for the current map
        mapElement.style.width = (GRID_COLS * CELL_SIZE) + 'px';
        mapElement.style.height = (GRID_ROWS * CELL_SIZE) + 'px';

        // Update CSS custom properties for dynamic sizing
        document.documentElement.style.setProperty('--grid-cols', GRID_COLS);
        document.documentElement.style.setProperty('--grid-rows', GRID_ROWS);
        document.documentElement.style.setProperty('--cell-size', CELL_SIZE + 'px');
        document.documentElement.style.setProperty('--map-width', (GRID_COLS * CELL_SIZE) + 'px');
        document.documentElement.style.setProperty('--map-height', (GRID_ROWS * CELL_SIZE) + 'px');

        // Remove only existing cells, preserve other containers
        var existingCells = mapElement.querySelectorAll('.cell');
        for (var i = 0; i < existingCells.length; i++) {
            existingCells[i].parentNode.removeChild(existingCells[i]);
        }

        for (var y = 0; y < GRID_ROWS; y++) {
            for (var x = 0; x < GRID_COLS; x++) {
                var cell = grid[y][x];
                var cellElement = document.createElement('div');
                cellElement.className = 'cell';
                cellElement.dataset.x = x;
                cellElement.dataset.y = y;

                // Add type class
                cellElement.classList.add(cell.type);

                // Add special classes
                if (cell.isStart) {
                    cellElement.classList.add('start');
                }
                if (cell.isEnd) {
                    cellElement.classList.add('end');
                }
                if (cell.buildable && !cell.occupied) {
                    cellElement.classList.add('buildable');
                }
                if (cell.occupied) {
                    cellElement.classList.add('occupied');
                }
                if (cell.centerIsland) {
                    cellElement.classList.add('center-island');
                }

                // Position the cell
                cellElement.style.left = (x * CELL_SIZE) + 'px';
                cellElement.style.top = (y * CELL_SIZE) + 'px';
                cellElement.style.width = CELL_SIZE + 'px';
                cellElement.style.height = CELL_SIZE + 'px';

                mapElement.appendChild(cellElement);
            }
        }
    }

    /**
     * Get cell at grid coordinates
     */
    function getCell(x, y) {
        if (y >= 0 && y < GRID_ROWS && x >= 0 && x < GRID_COLS) {
            return grid[y][x];
        }
        return null;
    }

    /**
     * Convert grid coordinates to world position
     */
    function gridToWorld(x, y) {
        var mapWidth = GRID_COLS * CELL_SIZE;
        var mapHeight = GRID_ROWS * CELL_SIZE;

        return {
            x: (x * CELL_SIZE) + (CELL_SIZE / 2) - (mapWidth / 2),
            y: (y * CELL_SIZE) + (CELL_SIZE / 2) - (mapHeight / 2),
            z: 0
        };
    }

    /**
     * Convert world position to grid coordinates
     */
    function worldToGrid(worldX, worldY) {
        var mapWidth = GRID_COLS * CELL_SIZE;
        var mapHeight = GRID_ROWS * CELL_SIZE;

        var x = Math.floor((worldX + (mapWidth / 2)) / CELL_SIZE);
        var y = Math.floor((worldY + (mapHeight / 2)) / CELL_SIZE);

        return { x: x, y: y };
    }

    /**
     * Get the path waypoints in world coordinates
     * For branching maps, returns a randomly selected branch path
     */
    function getPathWaypoints() {
        var map = MAP_DATA[currentMapId];

        if (map.branches) {
            // Pick a random branch
            var branchIndex = Math.floor(Math.random() * map.branches.length);
            var branch = map.branches[branchIndex];
            var endPath = branchIndex === 0 ? map.waypointsEnd : map.waypointsEndLower;

            // Build full path: main waypoints (up to fork) + branch + end
            var fullPath = map.waypoints.slice();
            // Remove last point from main (it's the fork point, already in branch)
            // Branch starts with the fork point, so skip first
            for (var i = 1; i < branch.length; i++) {
                fullPath.push(branch[i]);
            }
            // Add end path (skip first as it overlaps with branch end)
            for (var j = 1; j < endPath.length; j++) {
                fullPath.push(endPath[j]);
            }

            return fullPath.map(function(point) {
                return gridToWorld(point.x, point.y);
            });
        }

        return pathData.map(function(point) {
            return gridToWorld(point.x, point.y);
        });
    }

    /**
     * Mark a cell as occupied by a tower
     */
    function occupyCell(x, y, tower) {
        var cell = getCell(x, y);
        if (cell && cell.buildable) {
            cell.occupied = true;
            cell.tower = tower;

            // Update DOM
            var cellElement = document.querySelector('.cell[data-x="' + x + '"][data-y="' + y + '"]');
            if (cellElement) {
                cellElement.classList.remove('buildable');
                cellElement.classList.add('occupied');
            }

            return true;
        }
        return false;
    }

    /**
     * Free a cell (when tower is sold)
     */
    function freeCell(x, y) {
        var cell = getCell(x, y);
        if (cell) {
            cell.occupied = false;
            cell.tower = null;

            // Update DOM
            var cellElement = document.querySelector('.cell[data-x="' + x + '"][data-y="' + y + '"]');
            if (cellElement) {
                cellElement.classList.remove('occupied');
                if (cell.buildable) {
                    cellElement.classList.add('buildable');
                }
            }

            return true;
        }
        return false;
    }

    /**
     * Check if a cell can have a tower built on it
     */
    function canBuild(x, y) {
        var cell = getCell(x, y);
        return cell && cell.buildable && !cell.occupied;
    }

    /**
     * Check if a cell is on the center island (Te Moana map)
     */
    function isCenterIsland(x, y) {
        var cell = getCell(x, y);
        return cell && cell.centerIsland;
    }

    /**
     * Get the start position (where enemies spawn)
     */
    function getStartPosition() {
        var allWp = getAllWaypoints();
        return gridToWorld(allWp[0].x, allWp[0].y);
    }

    /**
     * Get the end position (player's base)
     */
    function getEndPosition() {
        var map = MAP_DATA[currentMapId];
        var endPath = map.waypointsEnd || map.waypoints;
        var end = endPath[endPath.length - 1];
        return gridToWorld(end.x, end.y);
    }

    // Public API — note: GRID_COLS/GRID_ROWS/CELL_SIZE are getter-style via functions
    // but for backwards compat, we expose them as direct properties that get updated by setMap()
    var api = {
        init: init,
        render: render,
        getCell: getCell,
        gridToWorld: gridToWorld,
        worldToGrid: worldToGrid,
        getPathWaypoints: getPathWaypoints,
        occupyCell: occupyCell,
        freeCell: freeCell,
        canBuild: canBuild,
        isCenterIsland: isCenterIsland,
        getStartPosition: getStartPosition,
        getEndPosition: getEndPosition,
        setMap: setMap,
        getCurrentMap: getCurrentMap,
        getMaps: getMaps,
        MAP_DATA: MAP_DATA,
        GRID_COLS: GRID_COLS,
        GRID_ROWS: GRID_ROWS,
        CELL_SIZE: CELL_SIZE
    };

    // Define dynamic properties so other modules always get current values
    Object.defineProperty(api, 'GRID_COLS', { get: function() { return GRID_COLS; } });
    Object.defineProperty(api, 'GRID_ROWS', { get: function() { return GRID_ROWS; } });
    Object.defineProperty(api, 'CELL_SIZE', { get: function() { return CELL_SIZE; } });

    return api;
})();
