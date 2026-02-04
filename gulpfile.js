/**
 * CSS Tower Defense - Build Configuration (Gulp 4)
 */

const gulp = require('gulp');
const concat = require('gulp-concat');
const less = require('gulp-less');
const cleanCss = require('gulp-clean-css');
const uglify = require('gulp-uglify');
const inject = require('gulp-inject');
const rename = require('gulp-rename');

// Script files in order
const scriptFiles = [
    './scripts/utils.js',     // Utility functions (must load first)
    './scripts/pool.js',      // Object pool for performance
    './scripts/noise.js',     // Perlin noise generator
    './scripts/effects.js',   // Visual Effects Manager
    './scripts/path.js',
    './scripts/weather.js',   // Weather System
    './scripts/seasons.js',   // Seasonal System
    './scripts/progression.js', // Progression System
    './scripts/enemy.js',
    './scripts/tower.js',
    './scripts/projectile.js',
    './scripts/wave.js',
    './scripts/display.js',
    './scripts/shop.js',
    './scripts/sfx.js',
    './scripts/game.js',
    './scripts/controller.js'
];

// Compile JavaScript files
function scripts() {
    return gulp.src(scriptFiles)
        .pipe(concat('script.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./dist/assets/'));
}

// Compile LESS to CSS
function compileLess() {
    return gulp.src('./styles/app.less')
        .pipe(less())
        .pipe(gulp.dest('./styles'));
}

// Minify CSS
function minifyCss() {
    return gulp.src('./styles/app.css')
        .pipe(cleanCss())
        .pipe(gulp.dest('./dist/assets/'));
}

// Copy static assets
function staticAssets() {
    return gulp.src([
        './assets/**/*',
        './vendor/**/*'
    ], { base: './' })
        .pipe(gulp.dest('./dist/'));
}

// Build for development (inject unminified files)
function buildDev() {
    const sources = gulp.src([
        ...scriptFiles,
        './styles/app.css'
    ], { read: false });

    return gulp.src('index.src.html')
        .pipe(inject(sources, { addRootSlash: false }))
        .pipe(rename('index.html'))
        .pipe(gulp.dest('./'));
}

// Build for production
function buildProd() {
    const sources = gulp.src([
        './dist/assets/script.js',
        './dist/assets/app.css'
    ], { read: false });

    return gulp.src('index.src.html')
        .pipe(inject(sources, {
            addRootSlash: false,
            transform: function (filepath) {
                if (filepath.endsWith('.js')) {
                    return '<script src="assets/script.js"></script>';
                }
                if (filepath.endsWith('.css')) {
                    return '<link rel="stylesheet" href="assets/app.css">';
                }
                return inject.transform.apply(inject.transform, arguments);
            }
        }))
        .pipe(rename('index.html'))
        .pipe(gulp.dest('./dist/'));
}

// Watch files
function watchFiles() {
    gulp.watch('./styles/*.less', gulp.series(compileLess, buildDev));
    gulp.watch('./scripts/*.js', buildDev);
    gulp.watch('./index.src.html', buildDev);
    console.log('Watching for changes...');
}

// Export tasks
exports.less = compileLess;
exports.scripts = scripts;
exports.build = gulp.series(compileLess, buildDev);
exports.compile = gulp.series(
    gulp.parallel(scripts, gulp.series(compileLess, minifyCss), staticAssets),
    buildProd
);
exports.watch = gulp.series(gulp.parallel(staticAssets, gulp.series(compileLess, buildDev)), watchFiles);
exports.default = exports.watch;
