var gm = require('gm');
var vinylSource = require('vinyl-source-stream');
var path = require('path');
var sizeOf = require('image-size');
var through = require('through2');
var fs = require('fs');
var extend = require('extend');

const PLUGIN_NAME = 'gulp-retinize';

// Define defaults

var options = {
  flags: {1: '@1x', 2: '@2x', 4: '@4x'},
  flagsPrefix: false,
  flagsOut: {1: '', 2: '@2x', 4: '@4x'},
  flagsOutPrefix: false,
  extensions: ['jpg', 'jpeg', 'png'],
  roundUp: true,
  filter: true,
  scaleUp: false,
  scanFolder: true,
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
        file = retina.tapFile(file, cb);
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

  this.tapFile = function(file, cb) {

    // Extract information from file to build new streams from,
    // if outgoing flags are different rename or delete,
    // then return file to be pushed downstream

    // Get image information (except filesize)

    var img = parseFile(file);

    // Append to new or existing set

    if (img) {
      sets[img.set.id] || (sets[img.set.id] = img.set);
      sets[img.set.id]['files'][img.file.dpi] = img.file;

      // Delete or rename file if required

      if (typeof options.flagsOut[img.file.dpi] === 'undefined' && options.filter) {
        file = undefined;
      } else if (img.file.newPath) {
        file.path = img.file.newPath;
      }
    };

    // Continue

    cb();
    return file;

  };

  this.flush = function() {

    // Executed after 'end' event, build new streams and push them into main stream

    var mainStream = this; // Context set by caller

    // Build arrays

    var images = buildAll(sets);
    console.log(images);

    // Build streams

    var streams = []
      .concat(buildResizeStreams(images.sources, images.targets))
      .concat(buildMissingStreams(images.missing));

    // Push streams into main stream

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

    // Build source, target and missing arrays from file set data

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


        // Build file paths in and out based on flags

        var filepathIn = folder + buildFilename(
          set.name,
          set.extension,
          options.flags[dpi],
          options.flagPrefix
        );
        var filepathOut = folder + buildFilename(
          set.name,
          set.extension,
          options.flagsOut[dpi],
          options.flagOutPrefix
        );


        // Build source, target, and missing (not yet streamed) files

        if ( set.files[dpi] || options.scanFolder ) {
          try {
            var size = sizeOf(filepathIn);
            results.sources[id] || (results.sources[id] = []);
            results.sources[id].push({
              pathIn: filepathIn,
              // base: base,
              size: size,
              dpi: dpi,
            });
            if (!set.files[dpi]) results.missing.push({
              pathIn: filepathIn,
              pathOut: filepathOut,
              base: base,
            });
            continue;
          } catch(e) {
            if (e.code !== 'ENOENT') {
              throw(e);
            }
          }
        }
        if (typeof options.flagsOut[dpi] !== 'undefined') results.targets.push({
          pathOut: filepathOut,
          base: set.base,
          dpi: dpi,
          id: id,
        });
      }
    }

    return results;

  }

  function buildMissingStreams(missing) {

    // Return read streams from files not included in Retinize's parent stream

    var streams = [];
    missing.forEach(function(img) {
      var stream = fs.createReadStream(img.pathIn)
        .pipe(vinylSource())
        .pipe(parseStream(img.pathOut, img.base));
      streams.push(stream);
    });
    return streams;

  }

  function buildResizeStreams(sources, targets) {

    // Determine which files to resize from and return resized streams

    var streams = [];
    targets.forEach(function(target) {
      var id = target.id;
      sources[id].sort(function(a, b) {
        return a.dpi - b.dpi;
      });
      var last;
      sources[id].every(function(source) {
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

    // Generate resized stream from source file
    
    var scale = target.dpi / source.dpi;
    var size;
    if (options.roundUp) {
      size = [Math.ceil(source.size.width * scale), Math.ceil(source.size.height * scale)];
    } else {
      size = [Math.floor(source.size.width * scale), Math.floor(source.size.height * scale)];
    }
    return gm(source.pathIn)
      .resize(size[0], size[1])
      .stream()
      .pipe(vinylSource())
      .pipe(parseStream(target.pathOut, target.base)); // Add path and base
    ;
      
  }

  function parseStream(path, base) {

    // Add base and path to vinyl stream

    return through.obj(function(file, enc, cb){
      file.base = base;
      file.path = path;
      cb(null, file);
    });

  };

  function parseFile(file) {

    // Extract and build file information

    var img = {};
    var fPath = file.path;
    var ext = path.extname(fPath);
    var fName = path.basename(fPath).slice(0, -ext.length);
    var base = file.base;
    var partialPath = fPath.slice(base.length, -fName.length - ext.length);

    var extracted = parseName(fName, options.flagsPrefix);
    if (!extracted) return false;
    var name = extracted.name;
    var fDpi = extracted.dpi;
    var fNameOut = buildFilename(name, ext, options.flagsOut[fDpi], options.flagsOutPrefix);

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
        dpi: fDpi,
        newPath: base + partialPath + fNameOut,
      }
    };

  }

  function parseName(fullName, prefix) {

    // Extract name and dpi from file (assumes extension is excluded)

    var result = false;
    for(var d in options.flags) {
      var flag = options.flags[d];
      if (flag === '') {
        // Name defaults to fullName if no other flag is found.
        result = {
          dpi: '',
          name: fullName
        };
      } else if (prefix) {
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

  function buildFilename(name, ext, flag, prefix) {

    // Generate filename from stem, dpi, and exetension

    if (prefix) return flag + name + ext;
    else return name + flag + ext;

  }

};