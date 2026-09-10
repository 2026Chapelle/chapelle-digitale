import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  parseReactionYouTubeId,
} from './live-reaction-replay'

describe('strict replay YouTube identity parser', () => {
  it.each([
    ['ABCDEFGHIJK', 'ABCDEFGHIJK'],

    [
      'https://www.youtube.com/watch?v=ABCDEFGHIJK',
      'ABCDEFGHIJK',
    ],

    [
      'http://youtube.com/watch?v=ABCDEFGHIJK',
      'ABCDEFGHIJK',
    ],

    [
      'https://m.youtube.com/watch?v=ABCDEFGHIJK',
      'ABCDEFGHIJK',
    ],

    [
      'https://www.youtube.com/watch?list=PLabc&v=ABCDEFGHIJK&feature=share',
      'ABCDEFGHIJK',
    ],

    [
      'https://www.youtube.com/embed/ABCDEFGHIJK',
      'ABCDEFGHIJK',
    ],

    [
      'https://www.youtube.com/embed/ABCDEFGHIJK/',
      'ABCDEFGHIJK',
    ],

    [
      'https://youtube.com/live/ABCDEFGHIJK?feature=share',
      'ABCDEFGHIJK',
    ],

    [
      'https://youtube.com/shorts/ABCDEFGHIJK',
      'ABCDEFGHIJK',
    ],

    [
      'https://youtu.be/ABCDEFGHIJK',
      'ABCDEFGHIJK',
    ],

    [
      'http://youtu.be/ABCDEFGHIJK?si=test',
      'ABCDEFGHIJK',
    ],
  ])(
    'accepts exact YouTube identity %s',
    (value, expected) => {
      expect(
        parseReactionYouTubeId(value),
      ).toBe(expected)
    },
  )

  it.each([
    undefined,
    null,
    '',
    '   ',
    42,
    {},
    [],
    'ABCDEFGHIJ',
    'ABCDEFGHIJKL',

    'https://youtube.com.attacker.invalid/watch?v=ABCDEFGHIJK',
    'https://notyoutube.example/watch?v=ABCDEFGHIJK',

    'ftp://youtube.com/watch?v=ABCDEFGHIJK',

    'https://user:pass@youtube.com/watch?v=ABCDEFGHIJK',

    'https://youtube.com:444/watch?v=ABCDEFGHIJK',

    'https://www.youtube.com/watch',
    'https://www.youtube.com/watch?list=PLabc',

    'https://www.youtube.com/watch?v=ABCDEFGHIJK&v=ZZZZZZZZZZZ',

    'https://www.youtube.com/watch?v=ABCDEFGHIJ',

    'https://www.youtube.com/embed/ABCDEFGHIJK/extra',
    'https://www.youtube.com/live/ABCDEFGHIJK/extra',
    'https://www.youtube.com/shorts/ABCDEFGHIJK/extra',

    'https://youtu.be/ABCDEFGHIJK/extra',

    'https://www.youtube.com/playlist?list=PLabc',

    'https://cdn.example.com/video.mp4',

    'not a url',
  ])(
    'rejects malformed or ambiguous value %#',
    value => {
      expect(
        parseReactionYouTubeId(value),
      ).toBeNull()
    },
  )
})