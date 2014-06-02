var gm      = require('gm');
var vinylSource  = require('vinyl-source-stream');
var path    = require('path');
// var gutil   = require('gulp-util');
// var Err     = gutil.PluginError;
var sizeOf = require('image-size');
var through = require('through2');
var fs = require('fs');

const PLUGIN_NAME = 'gulp-retinize';

// TODO: Create version that does not check filesystem. (Not too much to extend, use es.map?or stream-reduce?)

// Define defaults

var defaults = {
  flags: {1: '@1x', 2: '@2x', 4: '@4x'},
  flagsOut: {1: '', 2: '@2x', 4: '@4x'},
  flagPrefix: false,
  extensions: ['jpg', 'jpeg', 'png'],
  roundUp: true,
  remove: true,
  scaleUp: false,
};

module.exports = function(options) { 

  // Extend Options
  options = defaults;// TODO: Parse and extend options

  // Instantiate Retina class w/ options
  var retina = new RetinaClass(options);

  // Return read stream to filter relevant images
  return through.obj(
    // Transform function filters image files
    function(file, enc, cb) {
      if (
        !file.isNull() &&
        !file.isDirectory() &&
        options.extensions.indexOf(path.extname(file.path).substr(1)) > -1
      ) {
        file = retina.tapFS(file, cb);
      } else {
        cb();
      }
      // Push only if file is returned by retina (otherwise it is dropped from stream)
      if (file) this.push(file);
    },
    // Flush function adds new images and ends stream
    retina.flush
  );

};

function RetinaClass(options) {

  var sets = [];
  var streams = [];

  this.tapFS = function(file, cb) {
    var img = parse(file);
      if (img) {
        if (sets.indexOf(img.id) === -1) {
          sets.push(img.id);
          var files = fromFS(img);
          streams = streams.concat(buildStreams(files[0], files[1]));
        }
        if (img.newPath === false) {
          // Omit file
          file = undefined;
        } else if (img.newPath) {
          // Rename file
          file.path = img.newPath;
        }
      };
    cb();
    return file;
  };

  this.flush = function() {
    var mainStream = this; // Context set by caller
    var counter = streams.length - 1;
    streams.forEach(function(newStream) {
      newStream.pipe(through.obj(function(file, enc, cb) {
        mainStream.push(file);
      }));
    });
  };

  function fromFS(img) {

    var size;
    var sources = [];
    var targets = [];
    var streams = [];
    for(var dpi in options.flags) {
      dpi = parseInt(dpi);
      var flag = options.flags[dpi];
      var filename = buildFilename(img.name, flag, img.extension);
      var filepath = img.folder + filename;
      try {
        var size = sizeOf(filepath);
        sources.push({
          path: filepath,
          size: size,
          dpi: dpi
        });
      } catch(e) {
        if (e.code === 'ENOENT') {
          targets.push({
            path: img.folder + filename,
            base: img.base,
            dpi: dpi
          });
        } else {
          throw(e); // ??
        }
      }
    }
    return [sources, targets];

  }

  function fromStream() {

  }

  function buildStreams(sources, targets) {
    var streams = [];
    targets.forEach(function(target) {
      sources.sort(function(a, b) {
        return a.dpi - b.dpi;
      });
      var last;
      sources.every(function(source) {
        if (source.dpi > target.dpi) {
          streams.push(resize(source, target));
          return last = false;
        } else {
          return last = source;
        }
      });
      if (last && options.scaleUp) streams.push(resize(source, last));
    });
    return streams;
  }

  function resize(source, target) {
    
    var scale = target.dpi / source.dpi;
    var size;
    if (options.roundUp) {
      size = [Math.ceil(source.size.width * scale), Math.ceil(source.size.height * scale)];
    } else {
      size = [Math.floor(source.size.width * scale), Math.floor(source.size.height * scale)];
    }
    return gm(source.path)
      .resize(size[0], size[1])
      .stream()
      .pipe(vinylSource())
      .pipe(through.obj(function(file, enc, cb){
        file.base = target.base;
        file.path = target.path;
        this.push(file);
        cb();
      }))
    ;
      
  }

  function parse(file) {

    // TODO: Clean up.

    var img = {};
    var fPath = file.path;
    var ext = path.extname(fPath);
    var fName = path.basename(fPath).slice(0, -ext.length);
    var base = file.base;
    var partialPath = fPath.slice(base.length, -fName.length - ext.length);
    var dpi;

    var extracted = extractDpi(fName);
    if (!extracted) return false;
    var name = extracted.name;
    var fDpi = extracted.dpi;

    var inFlag = options.flags[fDpi];
    var outFlag = options.flagsOut[fDpi];
    var newPath;
    if (typeof outFlag === 'undefined' && options.remove) {
      newPath = false
    } else if (outFlag !== inFlag) {
      newPath = base + partialPath+ buildFilename(name, outFlag, ext);
    }

    return {
      id: partialPath + name + ext,
      name: name,
      extension: ext,
      partialPath: partialPath,
      folder: base + partialPath,
      base: base,
      fDpi: fDpi,
      newPath: newPath,
    };

  }

  function extractDpi(fullName) {

    var result = false;
    for(var d in options.flags) {
      var flag = options.flags[d];
      if (flag === '') {
        // Name defaults to fullName if no other flag is found.
        result = {
          dpi: '',
          name: fullName
        };
      } else if (options.flagPrefix) {
        if (fullName.slice(0, flag.length) === flag) {
          result = {
            dpi: d,
            name: fullName.slice(flag.length)
          };
          break;
        }
      } else {
        if (fullName.slice(-flag.length) === flag) {
          result = {
            dpi: d,
            name: fullName.slice(0, -flag.length)
          };
          break;
        }
      }
    }
    return result;

  }

  function buildFilename(name, dpi, ext) {

    if (options.flagPrefix) return dpi + name + ext;
    else return name + dpi + ext;

  }

};