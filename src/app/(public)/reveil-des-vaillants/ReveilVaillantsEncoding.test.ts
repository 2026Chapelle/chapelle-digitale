import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Reveil des Vaillants UTF-8 integrity', () => {
  const source = readFileSync(
    new URL('./ReveilVaillantsLanding.tsx', import.meta.url),
    'utf8',
  );

  it('contains no known encoding corruption markers', () => {
    const markers = [
      '\u00c3',
      '\u00c2',
      '\u00e2\u20ac',
      '\ufffd',
    ];

    for (const marker of markers) {
      expect(source.includes(marker)).toBe(false);
    }
  });

  it('preserves important French campaign text', () => {
    const expected = [
      'R\u00e9veil des Vaillants',
      'Le courage de r\u00e9pondre \u00e0 l\u2019appel',
      'De la caverne \u00e0 la destin\u00e9e',
      'S\u2019\u00e9quiper',
      'Conqu\u00e9rir',
      'Quelques r\u00e9ponses',
    ];

    for (const phrase of expected) {
      expect(source.toLowerCase()).toContain(phrase.toLowerCase());
    }
  });
});