const expect = require('expect');
const Retinize = require('..');

describe('retinize#_generateOutputStem', () => {
  describe('options.outputFlags', () => {
    const retinize = Retinize({
      outputFlags: { '1' : '-1x', '2' : '-2x', '4' : '-4x' }
    });

    it('generates output filename', () => {
      expect(retinize._generateOutputStem('image', '1')).toEqual('image-1x');
      expect(retinize._generateOutputStem('image', '2')).toEqual('image-2x');
      expect(retinize._generateOutputStem('image', '4')).toEqual('image-4x');
    });
  });

  describe('options.outputPlace = "endsWidth"', () => {
    const retinize = Retinize({ outputPlace: 'endsWith' });

    it('generates output filename', () => {
      expect(retinize._generateOutputStem('image', '1')).toEqual('image');
      expect(retinize._generateOutputStem('image', '2')).toEqual('image@2x');
      expect(retinize._generateOutputStem('image', '4')).toEqual('image@4x');
    });
  });

  describe('options.outputPlace = "prepend"', () => {
    const retinize = Retinize({ outputPlace: 'prepend' });

    it('generates output filename', () => {
      expect(retinize._generateOutputStem('image', '1')).toEqual('image');
      expect(retinize._generateOutputStem('image', '2')).toEqual('@2ximage');
      expect(retinize._generateOutputStem('image', '4')).toEqual('@4ximage');
    });
  });

  describe('options.outputFlags and options.outputPlace = "prepend"', () => {
    const retinize = Retinize({
      outputFlags: { '1' : '', '2' : '2x-', '4' : '4x-' },
      outputPlace: 'prepend'
    });

    it('generates output filename', () => {
      expect(retinize._generateOutputStem('image', '1')).toEqual('image');
      expect(retinize._generateOutputStem('image', '2')).toEqual('2x-image');
      expect(retinize._generateOutputStem('image', '4')).toEqual('4x-image');
    });
  });
});
