# gulp-retinize

[![npm version][img:npm]][url:npm]
[![build status][img:build-status]][url:build-status]

> [Gulp][url:gulp] plugin to automate down-scaling of images to target lower
  resolution or non-retina browsers.

By default, accepts @4x and @2x resolutions, outputting to @4x, @2x, and @1x.
Overrides may be implemented by manually creating lower resolution copies in
the source directory.

## Install

*  Install Gulp ```npm install -g gulp```
*  Install gulp-retinize ```npm install --save-dev gulp-retinize```
*  Create your ```gulpfile.js```:

## Usage

```javascript
const gulp = require('gulp');
const retinize = require('gulp-retinize');

/* Default options */
const RETINIZE_OPTS = {
  inputFlags: { 1: '@1x', 2: '@2x', 4: '@4x' },
  inputPlace: 'endsWith',
  outputFlags: { 1: '', 2: '@2x', 4: '@4x' },
  outputPlace: 'append',
  rounding: 'ceil',
  scaleUp: false
};

gulp.task('images', images);

function images(file) {
  console.log('Retinizing images...');

  return gulp.src(file && file.path || './img/**/*.{png,jpg,jpeg}')
    .pipe(retinize(RETINIZE_OPTS))
    .on('error', function(e) { console.log(e.message); })
    .pipe(gulp.dest('./public/img/'));
}
```

## Options

### options.inputFlags

Type: ```Object```

Default: ```{1: '@1x', 2: '@2x', 4: '@4x'}```

The flags Retinize will use to detect which source images should be resized.
Key is output resolution, value is flag.

### options.inputPlace

Type: ```String```

Default: ```endsWith```

Whether to look for the flags at the beginning of the source image filename:

*  ```startsWith``` => ```@2xgrumpycat```
*  ```endsWith``` => ```grumpycat@2x```

### options.outputFlags

Type: ```Object```

Default: ```{1: '', 2: '@2x', 4: '@4x'}```

The flags Retinize will append (or prepend) to the destination image files.
Key is output resolution, value is flag.

### options.outputPlace

Type: ```String```

Default: ```append```

Whether to output the flags at the beginning of the destination image filename:

*  ```prepend``` => ```@2xgrumpycat```
*  ```append``` => ```grumpycat@2x```

### options.rounding

Type: ```String```

Default: ```ceil```

Math function Whether to round partial resolutions up (```ceil```) (default) or
down (```floor```). For example, an @2x source image with dimensions
of ```35px x 35px``` will be scaled to ```18px x 18px``` by default.

### options.scaleUp

Type: ```Boolean```

Default: ```false```

Whether to scale images up if they are only included at a lower resolution in
their source files. For example, if ```true```, an images directory that
includes only ```grumpycat@2x.png``` will output destination
files ```grumpycat@4x.png``` (scaled up), ```grumpycat@2x.png```,
and ```grumpycat.png```.

The output resolutions depend on the value of ```options.flagsOut```.


## Credits

Developed in Alaska by [Matti Dupre][url:author].

Provided under [The MIT License (MIT)](LICENSE)

[url:author]: http://github.com/mattidupre

[url:gulp]: https://github.com/gulpjs/gulp

[img:build-status]: https://travis-ci.org/mattidupre/gulp-retinize.svg
[url:build-status]: https://travis-ci.org/mattidupre/gulp-retinize

[img:npm]: https://img.shields.io/npm/v/gulp-retinize.svg
[url:npm]: https://www.npmjs.com/package/gulp-retinize
