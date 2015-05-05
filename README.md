# gulp-retinize

_[Gulp.js](https://github.com/gulpjs/gulp) plugin utilizing [gm](https://github.com/aheckmann/gm) to automate down-scaling of images to target lower resolution or non-retina browsers._
Accepts @4x and @2x resolutions, outputting to @4x, @2x, and @1x. Overrides may be implemented by manually creating lower resolution copies in the source directory.

## Prerequisites

*  Works in Node 0.10+ with Gulp.js
*  Requires [GraphicsMagick for Node](https://github.com/aheckmann/gm). Please go there for installation directions and relevant questions.

## Install

1. Install [GraphicsMagick for Node](https://github.com/aheckmann/gm) (follow instructions).
*  Install Gulp ```npm install -g gulp```
*  Install gulp-retinize ```npm install --save-dev gulp-retinize```
*  Create your ```gulpfile.js```:

## Usage

```javascript
var gulp = require('gulp');
var retinize = require('gulp-retinize');

var retinizeOpts = {
    // Your options here.
};

gulp.task('images', images);

function images(file) {

  gutil.log(gutil.colors.green('Retinizing images...'));

  return gulp.src(file && file.path || './img/**/*.{png,jpg,jpeg}')
    .pipe(retinize(retinizeOpts))
    .on('error', function(e) {
      gutil.log(e.message);
    })
    .pipe(gulp.dest('./public/img/'))
  ;

}
```

## Options (Optional)

### options.flags

Type: ```Object```

Default: ```{1: '@1x', 2: '@2x', 4: '@4x'}```

The flags Retinize will use to detect which source images should be resized. Key is output resolution, value is flag.

### options.flagsPrefix

Type: ```Boolean```

Default: ```false```

Whether to look for the flags at the beginning of the source image filename, e.g., ```@2xgrumpycat``` or at the end, e.g., ```grumpycat@2x```. Defaults to the latter.

### options.flagsOut

Type: ```Object```

Default: ```{1: '', 2: '@2x', 4: '@4x'}```

The flags Retinize will append (or prepend) to the destination image files. Key is output resolution, value is flag. _Note that, by default, @1x files are unflagged._

### options.flagsOutPrefix

Type: ```Boolean```

Default: ```false```

Whether to output the flags at the beginning of the destination image filename, e.g., ```@2xgrumpycat``` or at the end, e.g., ```grumpycat@2x```. Defaults to the latter.

### options.extensions

Type: ```Array```

Default: ```['jpg', 'jpeg', 'png']```

Whitelist of allowed extensions.

### options.roundUp

Type: ```Boolean```

Default: ```true```

Whether to round partial resolutions up (```true```) (default) or down (```false```). For example, an @2x source image with dimensions of ```35px x 35px``` will be scaled to ```18px x 18px``` by default.

### options.filter

Type: ```Boolean```

Default: ```true```

Whether to omit resolutions not matched by ```options.flags```. For instance, by default, and image of ```grumpycat@4x``` will be ignored if ```options.flags``` is set to ```{1: '', 2: '@2x'}```.

### options.scaleUp

Type: ```Boolean```

Default: ```false```

Whether to scale images up if they are only included at a lower resolution in their source files. For example, if ```true```, an images directory that includes only ```grumpycat@2x.png``` will output destination files ```grumpycat@4x.png``` (scaled up), ```grumpycat@2x.png```, and ```grumpycat.png```. _Note that this depends on what resolutions are included in ```options.flagsOut```._

### options.scanFolder

Type: ```Boolean```

Default: ```true```

Whether to, for each image, scan its containing folder for other source image sizes. If ```false```, will only search within the files matched by ```gulp.src()```.

## Use With

### Gulp Watch _(NOT [gulp.watch](https://github.com/gulpjs/gulp/blob/master/docs/API.md#gulpwatchglob-opts-tasks)_

Install [gulp-watch](https://github.com/floatdrop/gulp-watch): ```npm install --save-dev gulp-watch``` and implement as follows:

```javascript
var gulp = require('gulp');
var retinize = require('gulp-retinize');
var watch = require('gulp-watch');

var retinizeOpts = {
    // Your options here.
};

gulp.task('images', images);

gulp.task('watch', function() {

  // Prevent gulp-watch from reading the file contents and follow the "change" event:
  watch(['./img/**/*.{png,jpg,svg}'], { read: false, events: ['change'] }, images);

});

function images(file) {
  // ... (see "Usage")
}
```

### LiveReload

Install [gulp-livereload](https://github.com/vohof/gulp-livereload) (```npm install --save-dev gulp-livereload```) and [Chrome Extension](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei) and implement as follows:

```javascript
var gulp = require('gulp');
var retinize = require('gulp-retinize');
var watch = require('gulp-watch');
var livereload = require('gulp-livereload');

var retinizeOpts = {
    /// Your options here.
};

gulp.task(images, images);

gulp.task('watch', function() {

  // Prevent gulp-watch from reading the file contents and follow the "change" event:
  watch(['./img/**/*.{png,jpg,svg}'], { read: false, events: ['change'] }, images);

  // Watch destination files and reload
  var server = livereload();
  livereload.listen();
  watch('./public/img/**/*', livereload.changed);

});


function images(file) {
  // ... (see "Usage")
}

```


## Caveats

*  Each file in stream that does not map to a real file will be ignored. This means that any image processing will have to happen downstream of Retinize.
*  This is a plugin I developed some time ago and only recently decided to publish. There may be a few problems here and there, especially when using outside my typical use cases, so please do feel free to post any issue for any reason.

## Credits

Developed in Alaska by [Matti Dupre](http://github.com/mattidupre)

Provided under [The MIT License (MIT)](LICENSE)