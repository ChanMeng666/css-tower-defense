/**
 * CSS Tower Defense - Path System
 * Manages the game map grid and enemy path
 */

var Path = (function() {
    'use strict';
    
    // Grid configuration
    var GRID_COLS = 12;
    var GRID_ROWS = 8;
    var CELL_SIZE = 60;
    
    // Path waypoints (grid coordinates)
    // Enemies follow this path from start to end
    var pathData = [
        { x: 0, y: 3 },   // Start (left edge, middle)
        { x: 2, y: 3 },
        { x: 2, y: 1 },
        { x: 5, y: 1 },
        { x: 5, y: 5 },
        { x: 8, y: 5 },
        { x: 8, y: 2 },
        { x: 10, y: 2 },
        { x: 10, y: 6 },
        { x: 11, y: 6 }   // End (right edge)
    ];
    
    // Grid state
    var grid = [];
    var pathCells = [];
    
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
                var isStart = (x === pathData[0].x && y === pathData[0].y);
                var isEnd = (x === pathData[pathData.length - 1].x && y === pathData[pathData.length - 1].y);
                
                grid[y][x] = {
                    x: x,
                    y: y,
                    type: isPath ? 'path' : 'grass',
                    isStart: isStart,
                    isEnd: isEnd,
                    buildable: !isPath,
                    occupied: false,
                    tower: null
                };
            }
        }
        
        return grid;
    }
    
    /**
     * Calculate all cells that are on the path
     */
    function calculatePathCells() {
        var cells = [];
        
        for (var i = 0; i < pathData.length - 1; i++) {
            var start = pathData[i];
            var end = pathData[i + 1];
            
            // Horizontal segment
            if (start.y === end.y) {
                var minX = Math.min(start.x, end.x);
                var maxX = Math.max(start.x, end.x);
                for (var x = minX; x <= maxX; x++) {
                    cells.push({ x: x, y: start.y });
                }
            }
            // Vertical segment
            else if (start.x === end.x) {
                var minY = Math.min(start.y, end.y);
                var maxY = Math.max(start.y, end.y);
                for (var y = minY; y <= maxY; y++) {
                    cells.push({ x: start.x, y: y });
                }
            }
        }
        
        return cells;
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
                
                // Position the cell
                cellElement.style.left = (x * CELL_SIZE) + 'px';
                cellElement.style.top = (y * CELL_SIZE) + 'px';
                
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
     */
    function getPathWaypoints() {
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
     * Get the start position (where enemies spawn)
     */
    function getStartPosition() {
        return gridToWorld(pathData[0].x, pathData[0].y);
    }
    
    /**
     * Get the end position (player's base)
     */
    function getEndPosition() {
        var end = pathData[pathData.length - 1];
        return gridToWorld(end.x, end.y);
    }
    
    // Public API
    return {
        init: init,
        render: render,
        getCell: getCell,
        gridToWorld: gridToWorld,
        worldToGrid: worldToGrid,
        getPathWaypoints: getPathWaypoints,
        occupyCell: occupyCell,
        freeCell: freeCell,
        canBuild: canBuild,
        getStartPosition: getStartPosition,
        getEndPosition: getEndPosition,
        GRID_COLS: GRID_COLS,
        GRID_ROWS: GRID_ROWS,
        CELL_SIZE: CELL_SIZE
    };
})();
