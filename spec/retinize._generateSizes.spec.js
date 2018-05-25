const expect = require('expect');
const Retinize = require('..');

describe('retinize#_generateSizes', () => {
  describe('options.scaleUp = false', () => {
    const retinize = Retinize({ scaleUp: false });

    it('scales down', () => {
      // image@4x.png
      expect(retinize._generateSizes(4)).toEqual(['1', '2']);

      // image@2x.png
      expect(retinize._generateSizes(2)).toEqual(['1']);
    });

    it('does not scale up', () => {
      // image@2x.png
      expect(retinize._generateSizes(2)).not.toContain(4);
      expect(retinize._generateSizes(2)).toEqual(['1']);

      // image@1x.png
      expect(retinize._generateSizes(1)).not.toContain(4);
      expect(retinize._generateSizes(1)).not.toContain(2);
      expect(retinize._generateSizes(1)).toEqual([]);
    });

    it('does not scale itself', () => {
      expect(retinize._generateSizes(4)).not.toContain(4);
      expect(retinize._generateSizes(2)).not.toContain(2);
      expect(retinize._generateSizes(1)).not.toContain(1);
    });
  });

  describe('options.scaleUp = true', () => {
    const retinize = Retinize({ scaleUp: true });

    it('scales up and down', () => {
      expect(retinize._generateSizes(4)).toEqual(['1', '2']);
      expect(retinize._generateSizes(2)).toEqual(['1', '4']);
      expect(retinize._generateSizes(1)).toEqual(['2', '4']);
    });
  });
});
