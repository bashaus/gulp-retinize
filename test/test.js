var retinize = require('..');
var gulp = require('gulp');
var rimraf = require('rimraf');

var assert = require('chai').assert;
var fs = require('fs');
var exists = fs.exists;
var sizeOf = require('image-size');
var checksum = require('checksum').file;
var es = require('event-stream');

var source = __dirname+'/src/';
var destination = __dirname+'/dest/';

describe('Gulp Retinize Tests:', function() {

  describe('Default options, JPG images:', function() {
    run();
  });

  describe('Default options, PNG images:', function() {
    run(
      undefined,
      undefined,
      undefined,
      '.png'
    );
  });

  describe('Specific extension, multiple image types provided:', function() {
    run(
      {
        extensions: ['jpg']
      },
      undefined,
      undefined,
      '.png'
    );
  });

  // CASE INSENSITIVE EXTENSIONS

  // WARNING IF FILES MATCH BUT CASE DIFFERENT
  // CHECK HOW MANY STREAMS ARE CREATED

  describe('Different retina flag as extension:', function() {
    run(
      {
        flag: ['4x', '2x', '1x'],
      },
      {
        '4x': 'img4x',
        '2x': 'img2x',
        '1x': 'img1x',
      }
    );
  });

  describe('Different retina flag as prefix:', function() {
    run(
      {
        flag: ['4x', '2x', '1x'],
        flagPrefix: true,
      },
      {
        '4x': 'img4x',
        '2x': 'img2x',
        '1x': 'img1x',
      }
    );
  });

  describe('Omit prefix on 4x source and on 4x destination:', function() {
    run(
      {
        flag: ['', '@2x', '@1x'],
      },
      {
        '4x': 'img',
        '2x': 'img2x',
        '1x': 'img1x',
      }
    );
  });

  describe('Omit prefix on 1x source and on 1x destination:', function() {
    run(
      {
        flag: ['@4x', '@1x', ''],
      },
      {
        '4x': 'img4x',
        '2x': 'img2x',
        '1x': 'img',
      }
    );
  });

  describe('Omit prefix on 4x source, include on 4x destination:', function() {
    run(
      {
        flag: ['', '@2x', '@1x'],
        flagOut: ['@4x', '@2x', '@1x'],
      },
      {
        '4x': 'img',
        '2x': 'img2x',
        '1x': 'img1x',
      },
      {
        '4x': 'img4x',
        '2x': 'img2x',
        '1x': 'img1x',
      }
    );
  });

  describe('Include prefix on 4x source, omit on 4x destination:', function() {
    run(
      {
        flagOut: ['', '@2x', '@1x'],
      },
      {
        '4x': 'img4x',
        '2x': 'img2x',
        '1x': 'img1x',
      },
      {
        '4x': 'img',
        '2x': 'img2x',
        '1x': 'img1x',
      }
    );
  });


  // Primary test function (to be run with all permutations of options)

  function run(options, s, d, ext) {

    options || (options = {});
    ext     || (ext = '.jpg');
    s       || (s = {'4x': 'img@4x'+ext, '2x': 'img@2x'+ext, '1x': 'img@1x'+ext});
    d       || (d = s) || (d = {'4x': 'img@4x'+ext, '2x': 'img@2x'+ext, '1x': 'img'+ext});

    describe('When @4x, @2x, @1x provided...', function() {

      var dSub = '4x2x1x/';

      it('should execute without hanging or errors', function (next) {
        assertExecution([s['4x'], s['2x'], s['1x']], destination+dSub, options, next);
      });

      it('should copy @4x to destination', function () {
        assertExists(dSub+d['4x']);
        assertSame(dSub+d['4x'], s['4x']);
      });

      it('should copy @2x to destination', function () {
        assertExists(dSub+d['2x']);
        assertSame(dSub+d['2x'], s['2x']);
      });

      it('should copy @1x to destination', function () {
        assertExists(dSub+d['1x']);
        assertSame(dSub+d['1x'], s['1x']);
      });

      it('should copy otherfile to destination', function() {
        assertDifferent(dSub+'otherfile');
      });

      after(function(next) {
        rimraf(destination+d, next);
      });

    });

    describe('When @4x and @2x provided...', function() {

      var dSub = '4x2x/';

      it('should output a buffer or stream', function (next) {
        assertExecution([s['4x'], s['2x']], destination+dSub, options, next);
      });

      it('should copy @4x to destination', function () {
        assertExists(dSub+d['4x']);
        assertSame(dSub+d['4x'], s['4x']);
      });

      it('should copy @2x to destination', function () {
        assertExists(dSub+d['2x']);
        assertSame(dSub+d['2x'], s['2x']);
      });

      it('should create @1x as new file', function () {
        assertExists(dSub+d['1x']);
        assertDifferent(dSub+d['1x'], s['1x']);
      });

      it('should resize @2x to @1x', function () {
        assertScale(dSub+d['1x'], s['2x'], 2);
      });

      it('should copy otherfile to destination', function() {
        assertDifferent(dSub+'otherfile');
      });

      after(function(next) {
        rimraf(destination+d, next);
      });

    });

    describe('When @4x and @1x provided...', function() {

      var dSub = '4x1x/';

      it('should output a buffer or stream', function (next) {
        assertExecution([s['4x'], s['1x']], destination+dSub, options, next);
      });

      it('should copy @4x to destination', function () {
        assertExists(dSub+d['4x']);
        assertSame(dSub+d['4x'], s['4x']);
      });

      it('should copy @1x to destination', function () {
        assertExists(dSub+d['1x']);
        assertSame(dSub+d['1x'], s['1x']);
      });

      it('should create @2x as new file', function () {
        assertExists(dSub+d['2x']);
        assertDifferent(dSub+d['2x'], s['2x']);
      });

      it('should resize @4x to @2x', function () {
        assertScale(dSub+d['2x'], s['4x'], 2);
      });

      it('should copy otherfile to destination', function() {
        assertDifferent(dSub+'otherfile');
      });

      after(function(next) {
        rimraf(destination+d, next);
      });

    });

    describe('When @4x provided...', function() {

      var dSub = '4x/';

      it('should output a buffer or stream', function (next) {
        assertExecution(s['4x'], destination+dSub, options, next);
      });

      it('should copy @4x to destination', function () {
        assertExists(dSub+d['4x']);
        assertSame(dSub+d['4x'], s['4x']);
      });

      it('should create @2x as new file', function () {
        assertExists(dSub+d['2x']);
        assertDifferent(dSub+d['2x'], s['2x']);
      });

      it('should resize @4x to @2x', function () {
        assertScale(dSub+d['2x'], s['4x'], 2);
      });

      it('should create @1x as new file', function () {
        assertExists(dSub+d['1x']);
        assertDifferent(dSub+d['1x'], s['1x']);
      });

      it('should resize @4x to @1x', function () {
        assertScale(dSub+d['1x'], s['4x'], 4);
      });

      it('should copy otherfile to destination', function() {
        assertDifferent(dSub+'otherfile');
      });

      after(function(next) {
        rimraf(destination+d, next);
      });

    });

    describe('When @2x and @1x provided...', function() {

      var dSub = '2x/';

      it('should output a buffer or stream', function (next) {
        assertExecution(s['2x'], destination+dSub, options, next);
      });

      it('should not create @4x in destination', function () {
        assertMissing(dSub+d['4x']);
      });

      it('should copy @2x to destination', function () {
        assertExists(dSub+d['2x']);
        assertSame(dSub+d['2x'], s['2x']);
      });

      it('should copy @1x to destination', function () {
        assertExists(dSub+d['1x']);
        assertSame(dSub+d['1x'], s['1x']);
      });

      it('should copy otherfile to destination', function() {
        assertDifferent(dSub+'otherfile');
      });

      after(function(next) {
        rimraf(destination+d, next);
      });

    });

    describe('When @2x provided...', function() {

      var dSub = '2x/';

      it('should output a buffer or stream', function (next) {
        assertExecution(s['2x'], destination+dSub, options, next);
      });

      it('should not create @4x in destination', function () {
        assertMissing(dSub+d['4x']);
      });

      it('should copy @2x to destination', function () {
        assertExists(dSub+d['2x']);
        assertSame(dSub+d['2x'], s['2x']);
      });

      it('should create @1x as new file', function () {
        assertExists(dSub+d['1x']);
        assertDifferent(dSub+d['1x'], s['1x']);
      });

      it('should resize @2x to @1x', function () {
        assertScale(dSub+d['1x'], s['2x'], 2);
      });

      it('should copy otherfile to destination', function() {
        assertDifferent(dSub+'otherfile');
      });

      after(function(next) {
        rimraf(destination+d, next);
      });

    });

    describe('When no images provided...', function() {

      var dSub = '2x/';

      it('should output a buffer or stream', function (next) {
        assertExecution(s['2x'], destination+dSub, options, next);
      });

      it('should not create @4x in destination', function () {
        assertMissing(dSub+d['4x']);
      });

      it('should not create @2x in destination', function () {
        assertMissing(dSub+d['2x']);
      });

      it('should not create @1x in destination', function () {
        assertMissing(dSub+d['1x']);
      });

      it('should copy otherfile to destination', function() {
        assertDifferent(dSub+'otherfile');
      });

      after(function(next) {
        rimraf(destination+d, next);
      });

    });

  };


  // Primary execution (and assertion to verify stream behavior)

  function assertExecution(src, dest, opts, next) {
    typeof src === 'string' || (src = src.join(','));
    gulp.src(source+'{'+src+',otherfile}')
      .pipe(retinize())
      .pipe(es.map(function(file, cb){
        assert(
          file.isBuffer() || file.isStream(),
          'output is neither a buffer nor a stream'
        );
        cb(null, file);
      }))
      .pipe(gulp.dest(dest))
      .on('end', next);
    ;
  }


  // File system assertions

  function assertExists(file) {
    exists(destination+file, function(result) {
      assert(
        result,
        file+' not in destination'
      );
    });
  }

  function assertMissing(file) {
    exists(destination+file, function(result) {
      assert(
        !result,
        file+' in destination'
      );
    });
  }

  function assertSame(fileD, fileS) {
    checksum(destination+fileD, function(err, sumD) {
      checksum(source+fileS, function(err, sumS) {
        assert.equal(
          sumD,
          sumS,
          fileD+' is NOT identical to it\'s source '+fileS
        );
      });
    });
  }

  function assertDifferent(fileD, fileS) {
    checksum(destination+fileD, function(err, sumD) {
      checksum(source+fileS, function(err, sumS) {
        assert.notEqual(
          sumD,
          sumS,
          fileD+' is identical to it\'s source '+fileS
        );
      });
    });
  }

  function assertScale(fileD, fileS, scale) {
    sizeOf(destination+fileD, function(err, sizeD) {
      sizeOf(source+fileS, function(err, sizeS) {
        assert(
          sizeD.width*scale === sizeS.width && sizeD.height*scale === sizeS.height,
          fileD+' is not 1/'+scale+' the dimensions of it\s source '+fileS
        );
      });
    });
  }

});