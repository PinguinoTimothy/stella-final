// The mascot's song: one YouTube video. Accepts the full link (watch, youtu.be, shorts, embed) or the bare 11-character id.
export function youtubeId(value) {
  const s = String(value || '').trim();
  const m = s.match(/(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/|\/v\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/) || s.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : '';
}
