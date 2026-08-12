// Hand-written artist details. Anything not listed here still gets a page —
// it just shows the name, album count and discography from MusicBrainz.
//
// The key is the URL slug: lowercase, spaces become hyphens.
//   "The Beatles" -> "the-beatles" -> /artist/the-beatles

export const ARTIST_DATA = {
  "the-beatles": {
    formed: "Liverpool, England",
    years: "1960 – 1970",
    hallOfFame: { inducted: true, year: 1988 },
    span: { start: 1960, end: 1970 },
    members: [
      { name: "John Lennon", role: "rhythm guitar, vocals", from: 1960, to: 1969 },
      { name: "Paul McCartney", role: "bass, vocals", from: 1960, to: 1970 },
      { name: "George Harrison", role: "lead guitar, vocals", from: 1960, to: 1970 },
      { name: "Ringo Starr", role: "drums, vocals", from: 1962, to: 1970 },
      { name: "Pete Best", role: "drums", from: 1960, to: 1962 },
      { name: "Stuart Sutcliffe", role: "bass", from: 1960, to: 1961 },
    ],
  },

  "son-volt": {
    formed: "Belleville, Illinois",
    years: "1994 – present",
    hallOfFame: { inducted: false },
    span: { start: 1994, end: 2000 },
    members: [
      { name: "Jay Farrar", role: "vocals, guitar", from: 1994, to: 2000 },
      { name: "Dave Boquist", role: "guitar, fiddle, banjo", from: 1994, to: 2000 },
      { name: "Jim Boquist", role: "bass, backing vocals", from: 1994, to: 2000 },
      { name: "Mike Heidorn", role: "drums", from: 1994, to: 2000 },
    ],
  },
};
