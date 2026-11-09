import { describe, expect, it } from 'vitest';
import { youtubeId } from './youtube';

describe('youtubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc&index=3', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['  dQw4w9WgXcQ  ', 'dQw4w9WgXcQ'],
  ])('reads %s', (input, id) => {
    expect(youtubeId(input)).toBe(id);
  });

  it('returns an empty string for anything that is not a video', () => {
    expect(youtubeId('')).toBe('');
    expect(youtubeId('https://www.youtube.com/playlist?list=PLbd9yHyOxA03B9Y71cDbtGaHKlN3VulgA')).toBe('');
    expect(youtubeId('https://example.com/watch?v=short')).toBe('');
  });
});
