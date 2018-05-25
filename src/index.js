const Vinyl = require('vinyl');
const PluginError = require('plugin-error');
const { Transform } = require('stream');
const sizeOf = require('image-size');
const sharp = require('sharp');
const extend = require('extend');

const PLUGIN_NAME = 'gulp-retinize';

const DEFAULT_OPTIONS = {
  inputFlags: { 1: '@1x', 2: '@2x', 4: '@4x' },
  inputPlace: 'endsWith', /* or: startsWith */
  outputFlags: { 1: '', 2: '@2x', 4: '@4x' },
  outputPlace: 'endsWith', /* or: prepend */
  rounding: 'ceil', /* or: floor */
  scaleUp: false /* or: true */
};

module.exports = function (options) {
  options = extend({}, DEFAULT_OPTIONS, options);

  class RetinizeTransform extends Transform {
    constructor() {
      super({ objectMode: true });
      this.images = [];
    }

    _transform(file, encoding, done) {
      // If the file is null, do nothing
      if (file.isNull()) {
        return done(null, file);
      }

      // If the file is a stream, do nothing (it's not supported)
      if (file.isStream()) {
        this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported'));
      }

      // Keep the original file
      this.push(file);

      // Process the file
      const processed = this._process(file);
      processed ? processed.then(() => done()) : done();
    }

    _process(file) {
      const [name, srcScale] = this._parseInputStem(file.stem);

      if (!srcScale) {
        return;
      }

      // Get the dimensions of the source file
      const srcSize = sizeOf(file.contents);

      // Generate all the sizes
      return Promise.all(
        this._generateSizes(srcScale).map(target => {
          const ratio = target / srcScale;

          return sharp(file.contents)
            .resize(
              Math[options.rounding](srcSize.width * ratio),
              Math[options.rounding](srcSize.height * ratio)
            )
            .toBuffer()
            .then(data => {
              const image = new Vinyl({
                base: file.base,
                path: file.path,
                contents: data
              });

              image.stem = this._generateOutputStem(name, target);
              this.images.push(image);
            });
        })
      );
    }

    _flush(done) {
      this.images.forEach(file => this.push(file));
      done();
    }

    _generateSizes(srcScale) {
      return Object.keys(options.outputFlags)
        .filter(target => target != srcScale)
        .filter(target => options.scaleUp ? true : target < srcScale);
    }

    _parseInputStem(filestem) {
      const scale = Object.keys(options.inputFlags)
        .find(key => filestem[options.inputPlace](options.inputFlags[key]));

      // If the scale can't be identified
      // Return the original filename with a null scale
      if (!scale) {
        return [filestem, null];
      }

      // Remove the scale from the file's name
      switch (options.inputPlace) {
        case 'startsWith':
          return [filestem.substring(options.inputFlags[scale].length), scale];

        case 'endsWith':
          return [filestem.substring(0, filestem.length - options.inputFlags[scale].length), scale];
      }
    }

    _generateOutputStem(name, target) {
      const flag = options.outputFlags[target];

      if (options.outputPlace == 'prepend') {
        return flag + name;
      }

      return name + flag;
    }
  }

  return new RetinizeTransform;
};
