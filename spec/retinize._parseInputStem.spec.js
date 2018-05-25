const expect = require('expect');
const Retinize = require('..');

describe('retinize#_parseInputStem', () => {
  describe('options.inputFlags', () => {
    const retinize = Retinize({
      inputFlags: { '1' : '-1x', '2' : '-2x', '4' : '-4x' }
    });

    it('parses custom input flags', () => {
      expect(retinize._parseInputStem('image-1x')).toEqual(['image', '1']);
      expect(retinize._parseInputStem('image-2x')).toEqual(['image', '2']);
      expect(retinize._parseInputStem('image-4x')).toEqual(['image', '4']);
    });
  });

  describe('options.inputPlace = "endsWidth"', () => {
    const retinize = Retinize({ inputPlace: 'endsWith' });

    it('parses scale when provided', () => {
      expect(retinize._parseInputStem('image@2x')).toEqual(['image', '2']);
      expect(retinize._parseInputStem('image@4x')).toEqual(['image', '4']);
    });

    it('returns null when scale is not found', () => {
      expect(retinize._parseInputStem('@2ximage')).toEqual(['@2ximage', null]);
      expect(retinize._parseInputStem('image')).toEqual(['image', null]);
    });
  });

  describe('options.inputPlace = "startsWith"', () => {
    const retinize = Retinize({ inputPlace: 'startsWith' });

    it('parses scale when provided', () => {
      expect(retinize._parseInputStem('@2ximage')).toEqual(['image', '2']);
      expect(retinize._parseInputStem('@4ximage')).toEqual(['image', '4']);
    });

    it('returns null when scale is not found', () => {
      expect(retinize._parseInputStem('image@2x')).toEqual(['image@2x', null]);
      expect(retinize._parseInputStem('image')).toEqual(['image', null]);
    });
  });
});
