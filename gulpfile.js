const {
  src,
  dest,
  series
} = require('gulp')

const ts = require('gulp-typescript')
const tsProject = ts.createProject('./tsconfig.json')

const paths = {
  src: ['src/package.json', 'src/README.md'],
  srcJS: 'src/*.ts',
  srcDocs: 'src/docs/**/*',

  dist: 'dist/',
  distJS: 'dist/',
  distDocs: 'dist/docs'
}

function js(cb) {
  const tsResult = tsProject.src().pipe(tsProject())
  tsResult.dts.pipe(dest(paths.distJS))
  tsResult.pipe(dest(paths.distJS))

  cb()
}

function docs(cb) {
  src(paths.srcDocs).pipe(dest(paths.distDocs))

  cb()
}

function misc(cb) {
  src(paths.src).pipe(dest(paths.dist))

  cb()
}

exports.build = series(js, docs, misc)
