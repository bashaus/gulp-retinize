var gm      = require('gm');
var source  = require('vinyl-source-stream');
var es      = require('event-stream');
var path    = require('path');
var reduce  = require('stream-reduce');
var gutil   = require('gulp-util');

const PLUGIN_NAME = 'gulp-retinize';

var defaults = {
  logError: false,
  prefixIn: false,
  prefixOut: false,
  flagsIn: ['@4x', '@2x', '@1x'],
  flagsOut: ['@4x', '@2x', ''],
}

var stream = es.through();
var internal = es.through();

module.exports = function(){
  stream = es.through(function(file){
    this.push(file);
    internal.push(file);
  }, function() {
    internal.emit('end');
  });
  return stream;
};

internal
  .pipe(es.map(function(file, cb){
    if (!file.isNull() && !file.isDirectory()){
      gm(file.contents).size(function(err, size){
        cb(err, {
          file: file,
          size: size,
        });
      });
    } else {
      cb();
    }
  }))
  .pipe(reduce(function(acc, data){
    var name = path.basename(data.file.path);
    var shortPath = data.file.path.substr(data.file.base.length);

    var base = data.file.path.substr(data.file.base.length).substr(1, shortPath.length - name.length - 1);
    var fileArr = path.basename(data.file.path);
      .match(/(.+?)(?:\@([124])x)?\.(png|jpg)/);
    var original = fileArr[1]+'.'+fileArr[3];

    acc[base] || (acc[base] = {});
    acc[base][original] || (acc[base][original] = {});

    acc[base][original]['at'+(fileArr[2] || '1')+'x'] = {
      path: data.file.path,
      name: fileArr[1],
      extension: fileArr[3],
      width: data.size.width,
      height: data.size.height,
      contents: data.file.contents,
    };

    return acc;

  }, {}))
  .on('data', function(data){
    var streams = []; // Could also be done with promises.
    for (var base in data){
      for (var original in data[base]){
        var set = data[base][original];
        var resize = function(path, width, height){
          return gm(path)
            .resize(Math.ceil(width), Math.ceil(height))
            .stream();
        }
        if (set.at4x && !set.at2x){
          streams.push(
            gm(set.at4x.path)
              .resize(Math.ceil(set.at4x.width/2), Math.ceil(set.at4x.height/2))
              .stream()
              .pipe(source(base+set.at4x.name+'@2x.'+set.at4x.extension))
          );
        }
        if (set.at4x && !set.at2x && !set.at1x){
          streams.push(
            gm(set.at4x.path)
              .resize(Math.ceil(set.at4x.width/4), Math.ceil(set.at4x.height/4))
              .stream()
              .pipe(source(base+set.at4x.name+config.defRoot+'.'+set.at4x.extension))
          );
        }
        if (set.at2x && !set.at1x){
          streams.push(
            gm(set.at2x.path)
              .resize(Math.ceil(set.at2x.width/2), Math.ceil(set.at2x.height/2))
              .stream()
              .pipe(source(base+set.at2x.name+config.defRoot+'.'+set.at2x.extension))
          );
        }
      }
    }
    es.merge.apply(es.merge, streams)
      .pipe(es.map(function(file, cb){
        stream.push(file);
        cb();
      }))
      .on('end', function(){
        stream.emit('end');
      });
  })
;

function checkSizes(set){
  var pass = true;
  if (set.at1x && set.at2x){
    if (set.at1x.width !== set.at2x.width/2 || set.at1x.height !== set.at2x.height/2){
      pass = false;
      gutil.log('mismatch'); // TODO: Write better messages
    }
  }
  if (set.at1x && set.at4x){
    if (set.at1x.width !== set.at4x.width/4 || set.at1x.height !== set.at4x.height/4){
      pass = false;
      gutil.log('mismatch');
    }
  }
  if (set.at2x && set.at4x){
    if (set.at2x.width !== set.at4x.width/2 || set.at2x.height !== set.at4x.height/2){
      pass = false;
      gutil.log('mismatch');
    }
  }
}