const { src, dest, series } = require('gulp')
const sourcemaps = require('gulp-sourcemaps')
const replace = require('gulp-replace')
const ts = require('gulp-typescript')
const terser = require('gulp-terser')
const babel = require('gulp-babel')

const tsProject = ts.createProject('./tsconfig.json')

const paths = {
    src: [
        'src/package.json',
        '*.md'
    ],
    srcJS: 'src/*.ts',

    dist: 'dist/',
    distJS: 'dist/'
}

function js(cb) {
    const tsResult = tsProject.src()
        .pipe(
            replace('const production = false', 'const production = true')
        ).pipe(
            sourcemaps.init()
        ).pipe(
            tsProject()
        )

    tsResult.dts.pipe(dest(paths.distJS))

    tsResult
        .pipe(
            babel({
                presets: [
                    '@babel/preset-env'
                ],
                plugins: [
                    '@babel/plugin-transform-runtime'
                ]
            })
        ).pipe(
            terser({
                keep_fnames: true,
                mangle: true
            })
        ).pipe(
            dest(paths.distJS)
        )
        
    cb()
}

function misc(cb) {
    src(paths.src).pipe(dest(paths.dist))

    cb()
}

exports.build = series(js, misc)