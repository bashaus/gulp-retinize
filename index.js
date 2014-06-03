var gm      = require('gm');
var vinylSource  = require('vinyl-source-stream');
var path    = require('path');
var sizeOf = require('image-size');
var through = require('through2');
var fs = require('fs');
var extend = require('extend');

const PLUGIN_NAME = 'gulp-retinize';

// Define defaults

var options = {
  flags: {1: '@1x', 2: '@2x', 4: '@4x'},
  flagsPrefix: false, // TODO: Implement flagsOutPrefix
  flagsOut: {1: '', 2: '@2x', 4: '@4x'},
  extensions: ['jpg', 'jpeg', 'png'],
  roundUp: true,
  remove: true, // Will remove files containing flags but not containing flagsOut
  scaleUp: true,
  scanFolder: false,
};

module.exports = function(config) { 

  // Extend options
  extend(options, config);
  delete config;

  // Instantiate Retina class w/ options
  var retina = new RetinaClass(options);

  // Return read stream to filter relevant images
  return through.obj(
    // Transform function filters image files
    function(file, enc, cb) {
      if (
        !file.isNull() &&
        !file.isDirectory() &&
        options.extensions.some(function(ext) {
          return path.extname(file.path).substr(1).toLowerCase() === ext;
        })
      ) {
        file = retina.tapAll(file, cb);
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

  this.tapAll = function(file, cb) {
    var img = parse(file);
    if (img) {
      sets[img.set.id] || (sets[img.set.id] = img.set);
      sets[img.set.id]['files'][img.file.dpi] = img.file;
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

    var images = buildAll(sets);
    var streams = []
      .concat(buildResizeStreams(images.sources, images.targets))
      .concat(buildMissingStreams(images.missing));
    if (!streams.length) {
      mainStream.emit('end');
    } else {    
      var counter = streams.length;
      streams.forEach(function(newStream) {
        newStream.pipe(through.obj(function(file, enc, cb) {
          mainStream.push(file);
          --counter || mainStream.emit('end');
        }));
      });
    }
  };

  function buildAll(sets) {

    var results = {
      sources: [],
      targets: [],
      missing: [],
    };

    for (var id in sets) {
      var set = sets[id];
      var folder = set.folder;
      var base = set.base;
      for (var dpi in options.flags) {
        dpi = parseInt(dpi);
        var flag = options.flags[dpi];
        var filename = buildFilename(set.name, flag, set.extension);
        var filepath = folder + filename;
        if ( set.files[dpi] || options.scanFolder ) {
          try {
            var size = sizeOf(filepath);
            results.sources.push({
              path: filepath,
              base: base,
              size: size,
              dpi: dpi,
            });
            if (!set.files[dpi]) results.missing.push({
              path: filepath,
              base: base,
            });
            continue;
          } catch(e) {
            if (e.code !== 'ENOENT') {
              throw(e);
            }
          }
        }
        if (options.flagsOut[dpi]) results.targets.push({
          path: set.folder + filename,
          base: set.base,
          dpi: dpi,
        });
      }
    }

    return results;

  }

  function buildMissingStreams(missing) {

    var streams = [];
    missing.forEach(function(img) {
      var stream = fs.createReadStream(img.path)
        .pipe(vinylSource())
        .pipe(parseStream(img.path, img.base));
      streams.push(stream);
    });
    return streams;

  }

  function buildResizeStreams(sources, targets) {

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
      if (last && options.scaleUp){
        streams.push(resize(last, target));
      }
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
      .pipe(parseStream(target.path, source.base));
    ;
      
  }

  function parseStream(path, base) {

    return through.obj(function(file, enc, cb){
      file.base = base;
      file.path = path;
      cb(null, file);
    });

  };

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
      newPath = false;
    } else if (outFlag !== inFlag) {
      newPath = base + partialPath+ buildFilename(name, outFlag, ext);
    }

    return {
      set: {
        id: partialPath + name + ext,
        name: name,
        extension: ext,
        partialPath: partialPath,
        folder: base + partialPath,
        base: base,
        files: {},
      },
      file: {
        newPath: newPath,
        dpi: fDpi,
        path: fPath,
      }
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
      } else if (options.flagsPrefix) {
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

    if (options.flagsPrefix) return dpi + name + ext;
    else return name + dpi + ext;

  }

};