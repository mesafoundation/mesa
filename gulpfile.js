const { src, dest, series } = require('gulp')

const ts = require('gulp-typescript')

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
            tsProject()
        )

    tsResult.dts.pipe(dest(paths.distJS))

    tsResult
        .pipe(
            dest(paths.distJS)
        )
        
    cb()
}

function misc(cb) {
    src(paths.src).pipe(dest(paths.dist))

    cb()
}

exports.build = series(js, misc)