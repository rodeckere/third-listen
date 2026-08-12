"use client";
import React, { useState } from "react";

const FONTS = `
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Spectral:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;700&display=swap');
`;

// Cutting room at night: black lacquer, warm needle light.
const INK = "#0E0F13";        // deepest black — the lacquer
const PAPER = "#15171C";      // page ground
const PAPER_DEEP = "#1D2027";  // raised panels: labels, track cells
const TEXT = "#E4E0D6";       // warm off-white, not clinical white
const MUTED = "#8B8778";
const SPOT = "#5FB0BE";       // cool teal, legible on dark
const HEAT = "#E4593C";       // vermilion, still the accent
const RULE = "#2E323B";
const DEFAULT_HEAT = "#E4593C";
const DEFAULT_SPOT = "#5FB0BE";

function extractPalette(img) {
  try {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const lum = (max + min) / 2;
      const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
      if (lum < 45 || lum > 225 || sat < 0.28) continue;
      const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
      const entry = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
      entry.r += r; entry.g += g; entry.b += b; entry.n += 1;
      buckets.set(key, entry);
    }

    const ranked = [...buckets.values()]
      .filter((e) => e.n > 8)
      .sort((a, b) => b.n - a.n)
      .map((e) => [
        Math.round(e.r / e.n),
        Math.round(e.g / e.n),
        Math.round(e.b / e.n),
      ]);

    if (ranked.length === 0) return null;

    const lift = ([r, g, b]) => {
      const boost = ([r, g, b]) => {
        // widen the gap between channels so washed-out colours gain identity
        const avg = (r + g + b) / 3;
        const sat = 1.9;
        let nr = avg + (r - avg) * sat;
        let ng = avg + (g - avg) * sat;
        let nb = avg + (b - avg) * sat;

        const lum = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
        const target = 165;
        const k = lum < target ? target / Math.max(lum, 1) : 1;

        const up = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
        return [up(nr), up(ng), up(nb)];
      };
      const [br, bg, bb] = boost([r, g, b]);
      return `rgb(${br}, ${bg}, ${bb})`;
    };
    const dist = (a, b) =>
      Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

    const first = ranked[0];
    const second = ranked.find((c) => dist(c, first) > 110) || ranked[1] || first;
    return { heat: lift(first), spot: lift(second) };
  } catch (e) {
    return null;
  }
}
const LOADING_LINES = [
  "Dropping the needle",
  "Blowing dust off the sleeve",
  "Reading the small print",
  "Checking who played what",
  "Cross-referencing the session sheets",
  "Finding out who really played bass",
  "Warming up the tubes",
  "Arguing with the liner notes",
  "Flipping to side two",
  "Counting the guitarists",
];

const DETAILS_PROMPT = `You are a music documentarian. Describe one album.

Return ONLY valid JSON, compact, no commentary.

Shape:
{
  "album": string, "artist": string, "year": string, "genre": string, "producer": string,
  "engineer": string, "label": string, "recordedAt": string, "recordedDates": string,
  "length": string,
 
  "tracks": [{ "number": number, "title": string }]
}




engineer: recording engineer(s), comma separated. "" if not documented.
label: the original release label.
recordedAt: studio name and city, e.g. "Abbey Road Studios, London". Several studios get
comma separated. "" if not documented.
recordedDates: the recording period, e.g. "April-June 1966" or "1987-1988". "" if unknown.
length: total running time as m:ss or h:mm:ss, e.g. "48:12".
Leave any field "" rather than guessing.
List every track in running order.


`;

const PERSONNEL_PROMPT = `You are a music documentarian. Give the personnel for one album.

SEARCH THE WEB FIRST, but keep it brief — two or three searches at most, then write the
JSON. Look for the album's published credits and, where they exist, the per-track session
personnel: AFM session sheets, box-set liner notes, Discogs credits, sessionography sites.
Use what you find in preference to memory. Do not keep searching once you have the credits;
the JSON is the deliverable and it must always be written. Where sources disagree or
are silent for a track, follow the accuracy rule at the end.

Return ONLY valid JSON, compact, no commentary.

Shape:
{

"lineup": [{ "name": string, "roles": [string] }],
"tracks": [{ "number": number, "title": string, "lyricsBy": [string], "musicBy": [string], "except": [{ "name": string, "roles": [string] }] }] [{ "name": string, "roles": [string] }] }]}

"lineup" holds only what is TRUE OF EVERY TRACK. A role belongs there only if that person
plays it on all of them. If someone's instruments change track to track, list only their
unchanging roles — or give them an empty roles array and specify each track.

"except" on a track holds the differences from that lineup:
  - a guest or extra player there -> name and roles
  - a lineup member playing a different set there -> name and THAT TRACK'S FULL SET of
    roles (this replaces their lineup roles for that track)
  - a lineup member absent there -> name with "roles": []

COMPLETENESS, WITHIN WHAT IS DOCUMENTED — every instrument you can hear on a track should
have someone credited for it, but only from the credits themselves. If the sources do not
say who played it, use an unnamed "Session drummer" style credit or leave it out. Never
close the gap by guessing a name. If a track has drums, somebody is credited with drums on it. Same for bass,
guitar, keyboards, horns, strings. Never leave an audible instrument unattributed.

ONLY WHAT THEY PLAYED ON THAT SONG. A multi-instrumentalist's album credit is the sum of
everything they played across the record, not what they played on any one track. Someone
credited "guitar, banjo, fiddle, lap steel, dobro" for the album is not playing all five on
every song — usually one or two. Search for the specific song, and where the sources are
silent, list only the instrument they play throughout the record and leave the rest off.
Adding an instrument to a track it is not on is inventing a credit.

Never list an instrument on a track where it is not played. A song with no drums must not
show drums, and a song with no fiddle must not show fiddle.

If you genuinely do not know whether someone played on a track at all, leave them off that
track rather than assuming.

CONSISTENCY, CAREFULLY — do not silently drop a player from tracks they did play. But do
NOT solve that by applying one uniform roster to the whole album. Session rosters changed
from date to date: a drummer may be on ten of thirteen tracks and a different one on the
rest, and bass players often rotated. Put someone in "lineup" only if they really are on
every track — for session-recorded albums that is usually just the singers — and let the
per-track "except" entries carry who actually played each song.

Better to show a player on the tracks that are documented and leave them off the rest than
to pad every track with the same names.

SESSION AND HOUSE BANDS — on albums cut with session musicians (Pet Sounds and the Wrecking
Crew, Motown and the Funk Brothers, Muscle Shoals, Stax), the band members may sing while
hired players handle the instruments. Credit the session players by name, consistently,
across the tracks they played. Where an instrument is clearly present but the specific
player is undocumented, credit it as "Session drummer", "Session bassist" and so on. Never
put a real person's name to an instrument the sources do not give them.

MULTI-INSTRUMENTALISTS who vary by song (Prince, Stevie Wonder, Todd Rundgren, McCartney
solo, Reznor): lineup gets ONLY their constant roles — usually just "lead vocals" — and
each track's "except" names what they actually played. Never attach a catch-all instrument
list to every track.

roles: one role per entry, never combined. Use "lyrics" as a role where that person wrote
the lyrics. Include backing vocalists, horn and string players.

BE SPECIFIC PER TRACK. Name the actual instrument played on that song, not a category:
"12-string electric guitar", "nylon-string guitar", "baritone guitar", "slide guitar",
"pedal steel", "tack piano", "Hammond organ", "Fender Rhodes", "harpsichord", "upright
bass", "Danelectro bass", "tambourine", "timpani", "vibraphone". Two guitarists on one
track are usually playing different things — say which. Only fall back to a plain
"electric guitar" or "acoustic guitar" when the specific instrument is genuinely unknown.

ORDER within every roles array: lead vocals, guitars, bass, drums and percussion, then
everything else (backing vocals, keyboards, horns, strings and guests last).

WRITERS PER TRACK. For each track, fill "lyricsBy" with whoever wrote the words and
"musicBy" with whoever wrote the music. On most rock records these are the same people —
put the same names in both. Where they genuinely differ (Elton John and Bernie Taupin,
Rodgers and Hammerstein), credit each correctly.

WRITERS ARE NOT PLAYERS. Never take a name from the personnel credits and use it as a
writer. A session musician credited on a song did not write it. Check the songwriting
credit itself.

COVERS. If a track is a cover, credit the original songwriter, not the artist performing
it. Judge each song on its own; do not carry a writer across from the previous track. Leave
both arrays empty for instrumentals with no composer credit. Every song with a composer has one. If you cannot recall who wrote a track, search for it
rather than leaving it blank — a missing writing credit is a failure, not a safe default.

Include one entry per track, and copy the "title" back exactly as given to you along with
its number. The track list is supplied — do not reorder it, rename it, or work from your
own memory of the running order. Include an entry even when "except" is empty.
MUSICIANS ONLY. The personnel are people who played or sang on the track. Producers,
engineers, arrangers-who-did-not-play, and mixers do NOT belong in track personnel. George
Martin appears only if he actually played an instrument on that specific track. Never
credit "producer" or "recording engineer" as a role.

ONE TRACK AT A TIME. Work through the tracks individually. Do not carry a distinctive
detail from one song onto another because they are on the same album — a sitar or tabla
player on one track does not appear on the next, and the writer of one song is not the
writer of the next. Before writing each track, ask who actually sings lead on THAT song.
Getting the lead vocalist wrong is the worst error you can make.

WRITERS AND SINGERS ARE PER TRACK. On albums where different members write and sing
different songs (The Beatles, Fleetwood Mac, The Band, Wilco), assign the lyrics credit and
the lead vocal to the correct person for each individual song, never to one default person
for the album.
ACCURACY — THE OVERRIDING RULE. Never invent anything. Not a name, not an instrument, not
a detail. If a source does not state it, it does not go in the sheet. An incomplete sheet
is correct; a filled-in one that guesses is not.

Specifically:
  - Never invent a musician. Only people named in the credits appear.
  - Never assign someone an instrument the sources do not put in their hands on that track.
    Knowing a player was at the session does NOT tell you what they played. Bassists play
    bass; do not promote them to guitar or mandolin to fill a gap.
  - Never invent makes and models. Write "electric guitar", not "Fender Stratocaster",
    unless a source names the instrument. Same for "organ" vs "Hammond C-3".
  - Never add vocal credits to an instrumental track. If a track has no singing, no one
    gets a vocal credit.
  - Never pad a track with musicians who played on other tracks of the album.
  -EVERY CREDITED MUSICIAN MUST APPEAR. Do not drop anyone the sources name.

Where the credits attach a musician to specific songs — phrasings like "drums on Live
Free", "accordion on Too Early", "bass on Mystifies Me" — that person belongs in that
track's "except" list ONLY, never in the lineup. These per-song credits are the most
important detail on the sheet; losing them makes every track look identical.

Where a source names a musician with no song attached, put them in the lineup. Where it is
genuinely unclear, prefer the lineup over omitting them. Fewer credits that
    are right beats more credits that are plausible.

When sources conflict, prefer detailed session logs and sessionographies over summary
album-level credit lists.`;




const DISCOGRAPHY_PROMPT = `List the studio albums released under the named artist's own billing.

Search the web first to confirm the list is current and complete before answering.
Keep the JSON compact — no whitespace beyond what JSON requires, no commentary.

Return ONLY valid JSON. No markdown, no backticks, no preamble.

Shape:
{ "artist": string, "albums": [{ "title": string, "year": string }] }

RULES
Studio albums only — no live albums, compilations, soundtracks, EPs, or reissues.

Include any album whose billing contains this artist's own name. That covers records
co-billed with another named person — "Paul and Linda McCartney" (Ram) counts as a Paul
McCartney album, "Bruce Springsteen & the E Street Band" counts as a Springsteen album.

Do NOT include albums released under a separate band name that does not contain the
artist's name — Wings, The White Stripes, Nirvana. Those belong to the band.

Be exhaustive. Include every studio album through the present day, including releases from
the last three years. Order oldest first.
If the name matches no recording artist, return { "artist": "", "albums": [] }.`;



// Local index — filtered instantly on every keystroke, no network.
const SEED_ARTISTS = `The Beatles|The Rolling Stones|Led Zeppelin|Pink Floyd|David Bowie|
Bob Dylan|Neil Young|The Who|The Kinks|The Beach Boys|Van Halen|AC/DC|Black Sabbath|
Deep Purple|Queen|Rush|Aerosmith|Kiss|Alice Cooper|Lynyrd Skynyrd|The Allman Brothers Band|
Creedence Clearwater Revival|The Doors|Jimi Hendrix|Cream|Eric Clapton|Jeff Beck|
The Jeff Beck Group|The Yardbirds|Fleetwood Mac|Eagles|Steely Dan|Santana|Chicago|
Grateful Dead|Jefferson Airplane|The Velvet Underground|Lou Reed|Iggy Pop|The Stooges|
Patti Smith|Talking Heads|Blondie|Ramones|The Clash|Sex Pistols|The Jam|Elvis Costello|
Joy Division|New Order|The Smiths|The Cure|Depeche Mode|R.E.M.|Sonic Youth|Pixies|
Nirvana|Pearl Jam|Soundgarden|Alice in Chains|Stone Temple Pilots|Smashing Pumpkins|
Nine Inch Nails|Tool|Rage Against the Machine|Red Hot Chili Peppers|Beck|Radiohead|Blur|
Oasis|Pulp|Suede|The Verve|Manic Street Preachers|Massive Attack|Portishead|Bjork|
The White Stripes|Jack White|The Raconteurs|The Black Keys|Arcade Fire|The Strokes|
Interpol|LCD Soundsystem|Wilco|My Morning Jacket|The National|Vampire Weekend|Bon Iver|
Genesis|Yes|King Crimson|Emerson, Lake & Palmer|Jethro Tull|Peter Gabriel|Phil Collins|
Talk Talk|Roxy Music|Brian Eno|Kate Bush|Elton John|Billy Joel|Bruce Springsteen|
Tom Petty|John Mellencamp|Bob Seger|Van Morrison|Joni Mitchell|Carole King|James Taylor|
Simon & Garfunkel|Paul Simon|Crosby, Stills & Nash|The Band|Little Feat|Warren Zevon|
Jackson Browne|Linda Ronstadt|Emmylou Harris|Gram Parsons|Willie Nelson|Johnny Cash|
Waylon Jennings|Merle Haggard|Dolly Parton|Loretta Lynn|George Jones|Hank Williams|
Eric Church|Chris Stapleton|Sturgill Simpson|Jason Isbell|Steve Earle|Lucinda Williams|
Stevie Wonder|Marvin Gaye|Al Green|Otis Redding|Sam Cooke|Aretha Franklin|Ray Charles|
James Brown|Sly and the Family Stone|Curtis Mayfield|Isaac Hayes|Prince|Michael Jackson|
Parliament|Funkadelic|Earth, Wind & Fire|The Temptations|Miles Davis|John Coltrane|
Charles Mingus|Thelonious Monk|Duke Ellington|Herbie Hancock|Nina Simone|Billie Holiday|
Frank Sinatra|Tom Waits|Leonard Cohen|Nick Drake|Jeff Buckley|Elliott Smith|Sufjan Stevens|
Public Enemy|N.W.A|A Tribe Called Quest|Wu-Tang Clan|Nas|The Notorious B.I.G.|2Pac|
Jay-Z|Outkast|Kanye West|Kendrick Lamar|Eminem|Beastie Boys|De La Soul|Run-D.M.C.|
Metallica|Megadeth|Slayer|Iron Maiden|Judas Priest|Motorhead|Pantera|Slipknot|
The Smashing Pumpkins|Foo Fighters|Green Day|Weezer|The Offspring|Blink-182|
Bob Marley and the Wailers|Peter Tosh|Toots and the Maytals|Lee "Scratch" Perry|
Amy Winehouse|Adele|Lana Del Rey|Taylor Swift|Fiona Apple|PJ Harvey|Sinead O'Connor|
Alanis Morissette|Tori Amos|Sheryl Crow|Norah Jones|St. Vincent|Angel Olsen|Phoebe Bridgers`
  .replace(/\n/g, "")
  .split("|");

const SEED_ALBUMS = `Abbey Road~The Beatles~1969|Revolver~The Beatles~1966|
Sgt. Pepper's Lonely Hearts Club Band~The Beatles~1967|The White Album~The Beatles~1968|
Rubber Soul~The Beatles~1965|Let It Bleed~The Rolling Stones~1969|
Exile on Main St.~The Rolling Stones~1972|Sticky Fingers~The Rolling Stones~1971|
Led Zeppelin IV~Led Zeppelin~1971|Physical Graffiti~Led Zeppelin~1975|
The Dark Side of the Moon~Pink Floyd~1973|Wish You Were Here~Pink Floyd~1975|
The Wall~Pink Floyd~1979|Animals~Pink Floyd~1977|
The Piper at the Gates of Dawn~Pink Floyd~1967|Hunky Dory~David Bowie~1971|
Ziggy Stardust~David Bowie~1972|Low~David Bowie~1977|Heroes~David Bowie~1977|
Station to Station~David Bowie~1976|Scary Monsters~David Bowie~1980|
Blackstar~David Bowie~2016|Highway 61 Revisited~Bob Dylan~1965|
Blonde on Blonde~Bob Dylan~1966|Blood on the Tracks~Bob Dylan~1975|
After the Gold Rush~Neil Young~1970|Harvest~Neil Young~1972|
Rust Never Sleeps~Neil Young~1979|Who's Next~The Who~1971|Quadrophenia~The Who~1973|
Village Green Preservation Society~The Kinks~1968|Pet Sounds~The Beach Boys~1966|
Van Halen~Van Halen~1978|1984~Van Halen~1984|Back in Black~AC/DC~1980|
Highway to Hell~AC/DC~1979|Dirty Deeds Done Dirt Cheap~AC/DC~1976|
Paranoid~Black Sabbath~1970|Master of Reality~Black Sabbath~1971|
Machine Head~Deep Purple~1972|A Night at the Opera~Queen~1975|Moving Pictures~Rush~1981|
Rumours~Fleetwood Mac~1977|Hotel California~Eagles~1976|Aja~Steely Dan~1977|
Abraxas~Santana~1970|Are You Experienced~Jimi Hendrix~1967|
Electric Ladyland~Jimi Hendrix~1968|Disraeli Gears~Cream~1967|
The Velvet Underground & Nico~The Velvet Underground~1967|Transformer~Lou Reed~1972|
Horses~Patti Smith~1975|Remain in Light~Talking Heads~1980|
London Calling~The Clash~1979|Never Mind the Bollocks~Sex Pistols~1977|
All Mod Cons~The Jam~1978|Unknown Pleasures~Joy Division~1979|
The Queen Is Dead~The Smiths~1986|Disintegration~The Cure~1989|
Automatic for the People~R.E.M.~1992|Murmur~R.E.M.~1983|Doolittle~Pixies~1989|
Nevermind~Nirvana~1991|In Utero~Nirvana~1993|Ten~Pearl Jam~1991|
Superunknown~Soundgarden~1994|Dirt~Alice in Chains~1992|
The Downward Spiral~Nine Inch Nails~1994|OK Computer~Radiohead~1997|
Kid A~Radiohead~2000|The Bends~Radiohead~1995|In Rainbows~Radiohead~2007|
Parklife~Blur~1994|Definitely Maybe~Oasis~1994|
(What's the Story) Morning Glory?~Oasis~1995|Different Class~Pulp~1995|
Dummy~Portishead~1994|Odelay~Beck~1996|Sea Change~Beck~2002|
Elephant~The White Stripes~2003|White Blood Cells~The White Stripes~2001|
Is This It~The Strokes~2001|Funeral~Arcade Fire~2004|
Selling England by the Pound~Genesis~1973|Close to the Edge~Yes~1972|
In the Court of the Crimson King~King Crimson~1969|So~Peter Gabriel~1986|
Spirit of Eden~Talk Talk~1988|Roxy Music~Roxy Music~1972|
Hounds of Love~Kate Bush~1985|Born to Run~Bruce Springsteen~1975|
Nebraska~Bruce Springsteen~1982|Astral Weeks~Van Morrison~1968|
Moondance~Van Morrison~1970|Blue~Joni Mitchell~1971|Court and Spark~Joni Mitchell~1974|
Tapestry~Carole King~1971|Bridge Over Troubled Water~Simon & Garfunkel~1970|
Graceland~Paul Simon~1986|The Band~The Band~1969|
Music from Big Pink~The Band~1968|At Folsom Prison~Johnny Cash~1968|
Red Headed Stranger~Willie Nelson~1975|Desperate Man~Eric Church~2018|
Chief~Eric Church~2011|Traveller~Chris Stapleton~2015|
Songs of the Year~Sturgill Simpson~2016|Southeastern~Jason Isbell~2013|
Innervisions~Stevie Wonder~1973|Songs in the Key of Life~Stevie Wonder~1976|
What's Going On~Marvin Gaye~1971|Let's Get It On~Marvin Gaye~1973|
Call Me~Al Green~1973|Otis Blue~Otis Redding~1965|
There's a Riot Goin' On~Sly and the Family Stone~1971|
Superfly~Curtis Mayfield~1972|Purple Rain~Prince~1984|Sign o' the Times~Prince~1987|
1999~Prince~1982|Thriller~Michael Jackson~1982|Off the Wall~Michael Jackson~1979|
Kind of Blue~Miles Davis~1959|Bitches Brew~Miles Davis~1970|
A Love Supreme~John Coltrane~1965|Mingus Ah Um~Charles Mingus~1959|
Head Hunters~Herbie Hancock~1973|Rain Dogs~Tom Waits~1985|
Songs of Leonard Cohen~Leonard Cohen~1967|I'm Your Man~Leonard Cohen~1988|
Pink Moon~Nick Drake~1972|Grace~Jeff Buckley~1994|
It Takes a Nation of Millions~Public Enemy~1988|
Straight Outta Compton~N.W.A~1988|The Low End Theory~A Tribe Called Quest~1991|
Enter the Wu-Tang~Wu-Tang Clan~1993|Illmatic~Nas~1994|Ready to Die~The Notorious B.I.G.~1994|
Stankonia~Outkast~2000|My Beautiful Dark Twisted Fantasy~Kanye West~2010|
good kid, m.A.A.d city~Kendrick Lamar~2012|To Pimp a Butterfly~Kendrick Lamar~2015|
The Marshall Mathers LP~Eminem~2000|Paul's Boutique~Beastie Boys~1989|
Master of Puppets~Metallica~1986|Ride the Lightning~Metallica~1984|
Rust in Peace~Megadeth~1990|Reign in Blood~Slayer~1986|
The Number of the Beast~Iron Maiden~1982|Exodus~Bob Marley and the Wailers~1977|
Back to Black~Amy Winehouse~2006|21~Adele~2011|
When the Pawn...~Fiona Apple~1999|Rid of Me~PJ Harvey~1993|
Jagged Little Pill~Alanis Morissette~1995|Ram~Paul McCartney~1971|
Band on the Run~Wings~1973|Plastic Ono Band~John Lennon~1970|Imagine~John Lennon~1971`
  .replace(/\n/g, "")
  .split("|")
  .map((row) => {
    const [name, artist, year] = row.split("~");
    return { kind: "album", name, artist, year };
  });

function localSuggest(fragment) {
  const q = fragment.trim().toLowerCase();
  if (q.length < 2) return [];
  const score = (text) => {
    const t = text.toLowerCase();
    if (t.startsWith(q)) return 0;
    if (t.replace(/^the /, "").startsWith(q)) return 1;
    if (t.includes(q)) return 2;
    return -1;
  };
  const hits = [];
  SEED_ARTISTS.forEach((name) => {
    const s = score(name);
    if (s >= 0) hits.push({ s, item: { kind: "artist", name, artist: "", year: "" } });
  });
  SEED_ALBUMS.forEach((a) => {
    const s = Math.min(
      score(a.name) === -1 ? 9 : score(a.name),
      score(a.artist) === -1 ? 9 : score(a.artist) + 1
    );
    if (s < 9) hits.push({ s, item: a });
  });
  return hits
    .sort((a, b) => a.s - b.s || a.item.name.length - b.item.name.length)
    .slice(0, 7)
    .map((h) => h.item);
}

const SUGGEST_PROMPT = `Autocomplete a partial music search. Answer instantly from knowledge — do not search the web.

Return ONLY valid JSON, compact, no commentary.

Shape:
{ "suggestions": [{ "kind": "artist" | "album", "name": string, "artist": string, "year": string }] }

RULES
Up to 6, best first. Mix artists and albums when both are plausible.
For kind "artist": "name" is the act, "artist" and "year" are "".
For kind "album": "name" is the album title, "artist" is who made it, "year" its release year.
Match on the beginning of names where possible, but include obvious completions of a
partial word. Return { "suggestions": [] } if the fragment is too short to guess.`;

const MATCH_PROMPT = `Work out what a music search could refer to — artists and albums both.

Search the web to confirm. Return ONLY valid JSON, compact, no commentary.

Shape:
{
  "artists": [{ "name": string, "detail": string }],
  "albums": [{ "album": string, "artist": string, "year": string }]
}

ARTISTS — up to 5, most likely first. "detail" is a short disambiguator: genre, era, or
best-known work, e.g. "1990s alt-rock, Odelay" or "English blues-rock guitarist, Blow by Blow".
Include, as separate entries:
  - every distinct solo artist sharing or nearly sharing the searched name, even when one
    is far more famous
  - every BAND whose name contains the searched name
So "Beck" returns Beck, Jeff Beck, The Jeff Beck Group, and Beck, Bogert & Appice.
Acts the person merely guested with do not count.

ALBUMS — up to 5, most likely first. Studio albums whose title matches the search, by any
artist. If the search names both an album and an artist, return that one album.

Either array may be empty when the search clearly means only the other.`;


// Recover whatever parsed cleanly when a response is cut off mid-list.

function salvageJson(body) {
  // trim back to the last complete top-level object inside the array, then close it
  for (let i = body.lastIndexOf("}"); i > 0; i = body.lastIndexOf("}", i - 1)) {
    for (const tail of ["}]}", "]}", "}"]) {
      try {
        return { data: JSON.parse(body.slice(0, i + 1) + tail), truncated: true };
      } catch (e) {
        /* keep trying */
      }
    }
  }
  return null;
}

const INSTRUMENT_ORDER = [
  [/backing vocal|harmony vocal|background vocal/i, 7],
  [/lead vocal|^vocals?$|^vocal/i, 0],
  [/lead (electric )?guitar|lead guitars/i, 1],
  [/rhythm (electric )?guitar/i, 2],
  [/guitar|banjo|mandolin|sitar|lap steel|pedal steel|dobro/i, 3],
  [/bassoon|bass clarinet|bass drum|bass trombone|bass saxophone/i, 7],
  [/\bbass\b|guitarr[oó]n/i, 4],
  [/drum/i, 5],
  [/percussion|congas|timbales|vibraphone|tabla/i, 6],
];

function rankRole(role) {
  const r = String(role || "");
  for (const [pattern, rank] of INSTRUMENT_ORDER) {
    if (pattern.test(r)) return rank;
  }
  return 4;
}

function rankPerson(roles) {
  const list = roles || [];
  return list.length ? Math.min(...list.map(rankRole)) : 4;
}

function sortRoles(roles) {
  return [...(roles || [])].sort((a, b) => rankRole(a) - rankRole(b));
}

function sortPersonnel(people) {
  return [...people].sort((a, b) => rankPerson(a.roles) - rankPerson(b.roles));
}

function expandTracks(sheet) {
  const lineup = sheet.lineup || [];
  return (sheet.tracks || []).map((t) => {
    const byName = new Map(lineup.map((p) => [p.name, [...(p.roles || [])]]));
    (t.except || []).forEach((e) => {
      if (!e || !e.name) return;
      if (!e.roles || e.roles.length === 0) byName.delete(e.name);
      else byName.set(e.name, e.roles);
    });
    return {
      ...t,
      personnel: sortPersonnel(
        [...byName.entries()].map(([name, roles]) => ({ name, roles: sortRoles(roles) }))
      ),
    };
  });
}

// If someone plays several guitars but no single one clears 50%, the family total may.
// Same for keyboards. Report the family ("guitars") rather than dropping the instrument.
const FAMILIES = [
  {
    label: "guitars",
    test: /guitar|banjo|mandolin|sitar|lap steel|pedal steel|dobro/i,
    exclude: /bass/i,
  },
  { label: "keyboards", test: /piano|organ|rhodes|wurlitzer|harpsichord|clavinet|mellotron|synth/i },
  { label: "percussion", test: /percussion|tambourine|congas|bongos|timpani|vibraphone|shaker|maracas/i },
];

function collapseFamilies(roleList, threshold, kept) {
  const keptSet = new Set(kept);
  const out = [...kept];
  FAMILIES.forEach((fam) => {
    const members = roleList.filter(
      ([role]) => fam.test.test(role) && !(fam.exclude && fam.exclude.test(role))
    );
    if (members.length < 2) return;
    // already representing this family with a specific instrument? leave it alone
    if (members.some(([role]) => keptSet.has(role))) return;
    const union = new Set();
    members.forEach(([, set]) => set.forEach((i) => union.add(i)));
    if (union.size >= threshold) out.push(fam.label);
  });
  return out;
}

function splitPersonnel(tracks) {
  const total = tracks.length;
  if (!total) return { core: [], additional: [] };
  const threshold = total / 2;

  // count track appearances per person, and per person+role
  const people = new Map();
  tracks.forEach((t, i) => {
    (t.personnel || []).forEach((p) => {
      if (!p || !p.name) return;
      if (!people.has(p.name)) people.set(p.name, { tracks: new Set(), roles: new Map() });
      const entry = people.get(p.name);
      entry.tracks.add(i);
      (p.roles || []).forEach((role) => {
        const key = String(role).trim();
        if (!key) return;
        if (!entry.roles.has(key)) entry.roles.set(key, new Set());
        entry.roles.get(key).add(i);
      });
    });
  });

  const core = [];
  const additional = [];

  people.forEach((entry, name) => {
    const count = entry.tracks.size;
    const roleList = [...entry.roles.entries()];

    if (count >= threshold) {
      // core: keep only the roles that themselves clear 50% of all tracks
      const kept = roleList
        .filter(([, set]) => set.size >= threshold)
        .sort((a, b) => b[1].size - a[1].size)
        .map(([role]) => role);

      const fallback = roleList.map(([role]) => role);
      const shown = kept.length
        ? sortRoles(collapseFamilies(roleList, threshold, kept))
        : sortRoles(collapseFamilies(roleList, threshold, fallback));
      core.push({
        name,
        role: kept.length
          ? shown.join(", ")
          : shown.join(", ") + " (no single role over 50%)",
        rank: rankPerson(shown),
        count,
      });
    } else {
      // additional: every role, each with the track numbers it appears on
      const detail = roleList
        .sort((a, b) => rankRole(a[0]) - rankRole(b[0]))
        .map(([role, set]) => {
          const nums = [...set].map((i) => tracks[i].number ?? i + 1).sort((a, b) => a - b);
          return `${role} [${nums.join(", ")}]`;
        })
        .join(", ");
      additional.push({
        name,
        role: detail,
        rank: rankPerson(roleList.map(([role]) => role)),
        count,
      });
    }
  });

  core.sort((a, b) => a.rank - b.rank || b.count - a.count || a.name.localeCompare(b.name));
  additional.sort((a, b) => a.rank - b.rank || b.count - a.count || a.name.localeCompare(b.name));
  return { core, additional, total };
}

export default function AlbumSheetGenerator() {
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState(null);
  const [discography, setDiscography] = useState(null);
  const [savedList, setSavedList] = useState(null);
  const [cache, setCache] = useState({});
  const [matches, setMatches] = useState(null);
  const [view, setView] = useState("artists");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestState, setSuggestState] = useState("");

  const [open, setOpen] = useState({});
  const [discoCache, setDiscoCache] = useState({});
  const [loadingArtist, setLoadingArtist] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [loadingLine, setLoadingLine] = useState(0);

  React.useEffect(() => {
    if (!loading) return;
    setLoadingLine(Math.floor(Math.random() * LOADING_LINES.length));
    const timer = setInterval(() => {
      setLoadingLine((i) => (i + 1) % LOADING_LINES.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [loading]);

  async function ask(prompt, maxTokens, useSearch, model) {
    const payload = {
      model: model || "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    };
    if (useSearch) {
      payload.tools = [{ type: "web_search_20250305", name: "web_search" }];
    }
const res = await fetch("/api/sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        maxTokens,
        useSearch,
        model: payload.model,
      }),
    });

    const data = await res.json();

    if (data.error) {
      throw new Error(`API: ${data.error.message || data.error.type}`);
    }
    if (!Array.isArray(data.content)) {
      throw new Error("API returned no content");
    }

    const raw = data.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    // Slice out the JSON object even if the model wrapped it in prose
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) {
      // A searching turn can pause or spend its budget before writing anything.
      // Fall back to one clean attempt without search rather than failing.
      if (useSearch) {
        return ask(prompt, maxTokens, false, model);
      }
      throw new Error(
        `No JSON returned (stop: ${data.stop_reason || "unknown"}). ${raw.slice(0, 80)}`
      );
    }

    const body = raw.slice(start, end + 1);
    try {
      return JSON.parse(body);
    } catch (e) {
      const rescued = salvageJson(body);
      if (rescued) return { ...rescued.data, _truncated: true };
      throw new Error(`Response was cut off. ${body.slice(0, 90)}...`);
    }
  }

  async function buildSheet(title) {
    if (!title) return;
    setDiscography(null);
    setMatches(null);
    setOpen({});

    const hit = cache[title.toLowerCase()];
    if (hit) {
      setSheet(hit);
      return;
    }

    setLoading(true);
    setPending(title);
    setError("");
    setSheet(null);

let details = null;
    try {
      details = await ask(`${DETAILS_PROMPT}\n\nAlbum: ${title}`, 3000, true);
      setSheet({
        ...details,
        tracks: (details.tracks || []).map((t) => ({ ...t, personnel: [] })),
        corePersonnel: [],
        additionalPersonnel: [],
        _partial: true,
      });
    } catch (e) {
      setError(`Couldn't build that sheet. ${e.message}`);
      setLoading(false);
      setPending("");
      return;
    }

    try {
      const trackList = (details.tracks || [])
        .map((t) => `${t.number}. ${t.title}`)
        .join("\n");

      const personnel = await ask(
        `${PERSONNEL_PROMPT}\n\nAlbum: ${title}\n\nThese are the tracks, in this exact order. Use these numbers and titles verbatim:\n${trackList}`,
        8000,
        true
      );

      const byTitle = new Map(
        (personnel.tracks || []).map((t) => [
          String(t.title || "").toLowerCase().trim(),
          t.except || [],
        ])
      );
      const byNumber = new Map(
        (personnel.tracks || []).map((t) => [t.number, t.except || []])
      );

      const merged = {
        lineup: personnel.lineup || [],
       tracks: (details.tracks || []).map((t) => ({
          ...t,
         writerData: (() => {
            const pt =
              (personnel.tracks || []).find(
                (p) =>
                  String(p.title || "").toLowerCase().trim() ===
                  String(t.title || "").toLowerCase().trim()
              ) || {};
            return { lyrics: pt.lyricsBy || [], music: pt.musicBy || [] };
          })(),
          except:
            byTitle.get(String(t.title || "").toLowerCase().trim()) ||
            byNumber.get(t.number) ||
            [],
        })),
      };

      const tracks = expandTracks(merged);
      const { core, additional } = splitPersonnel(tracks);
const lastName = (n) => String(n).trim().split(/\s+/).slice(-1)[0];
      const coreNames = new Set(core.map((c) => c.name));

     const writerLabel = (writers) => {
        const list = (writers || []).filter(Boolean);
        if (list.length === 0) return "";

        const coreLast = new Set([...coreNames].map(lastName));
        const inCore = list.filter((w) => coreLast.has(lastName(w)));
        const outside = list.filter((w) => !coreLast.has(lastName(w)));

        // whole band writing together is billed as the band
        if (inCore.length === coreNames.size && coreNames.size > 0) {
          if (outside.length === 0) return details.artist;
          return `${details.artist} and ${outside.join(" and ")}`;
        }

        return [...inCore.map(lastName), ...outside].join("/");
      };

     const allNames = new Set();
      (core || []).forEach((c) => allNames.add(c.name));
      (additional || []).forEach((a) => allNames.add(a.name));
      tracks.forEach((t) =>
        (t.personnel || []).forEach((p) => allNames.add(p.name))
      );

      const surnameCount = new Map();
      allNames.forEach((n) => {
        const s = lastName(n);
        surnameCount.set(s, (surnameCount.get(s) || 0) + 1);
      });

      const shortName = (full) => {
        const parts = String(full).trim().split(/\s+/);
        if (parts.length < 2) return full;
        const surname = parts[parts.length - 1];
        const count = surnameCount.get(surname) || 0;
        if (count > 1) return `${parts[0][0]}. ${surname}`;
        return surname;
      };
      const tally = (which) => {
        const counts = new Map();
        tracks.forEach((t) => {
          const list = ((t.writerData || {})[which] || []).filter(Boolean);
          if (list.length === 0) return;
          const label = writerLabel(list);
          if (!label) return;
          counts.set(label, (counts.get(label) || 0) + 1);
        });
        const total = tracks.length;
        const ranked = [...counts.entries()].sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
        );
        if (ranked.length === 0) return "";
        if (ranked.length === 1 && ranked[0][1] === total) return ranked[0][0];
        return ranked
          .map(([name, n]) => `${name} (${n})`)
          .join("\n");
      };

      const lyricsSummary = tally("lyrics");
      const musicSummary = tally("music");
      const tracksWithWriters = tracks.map((t) => {
        const lyrics = writerLabel((t.writerData || {}).lyrics);
        const music = writerLabel((t.writerData || {}).music);
        let label = "";
        if (lyrics && lyrics === music)
          label = `Music and lyrics by:\n${lyrics}`;
        else if (lyrics && music)
          label = `Music by:\n${music}\nLyrics by:\n${lyrics}`;
        else if (music) label = `Music by:\n${music}`;
        else if (lyrics) label = `Lyrics by:\n${lyrics}`;
        return { ...t, writerLabel: label };
      });
      const built = {
        ...details,
       lyricsSummary,
        musicSummary,
        tracks: tracksWithWriters,
        corePersonnel: core,
        additionalPersonnel: additional,
      };
      setCache((c) => ({ ...c, [title.toLowerCase()]: built }));
      setSheet(built);
    } catch (e) {
      setError(`Personnel unavailable. ${e.message}`);
    } finally {
      setLoading(false);
      setPending("");
    }
  }

  async function listAlbums(name) {
    if (!name) return;
    setMatches(null);
    setLoading(true);
    setError("");
    setSheet(null);
    setDiscography(null);
    setSavedList(null);
    try {
      const result = await ask(
        `${DISCOGRAPHY_PROMPT}\n\nArtist: ${name}`,
        8000,
        true,
        "claude-haiku-4-5-20251001"
      );
      if (!result.albums || result.albums.length === 0) {
        setError("No studio albums found under that name. Try a different spelling.");
      } else {
        setDiscography(result);
      }
    } catch (e) {
      setError(`Couldn't load that discography. ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    const fragment = query.trim();
    if (fragment.length < 2 || !showSuggest) {
      setSuggestions([]);
      setSuggestState("");
      return;
    }

    // instant, offline
    const local = localSuggest(fragment);
    setSuggestions(local);
    setSuggestState(local.length ? "" : "thinking");

    // top up from the model only when the local index comes up short
    if (local.length >= 4) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await ask(
          `${SUGGEST_PROMPT}\n\nFragment: ${fragment}`,
          1000,
          false,
          "claude-haiku-4-5-20251001"
        );
        if (cancelled) return;
        const seen = new Set(local.map((s) => `${s.kind}:${s.name}`.toLowerCase()));
        const extra = (result.suggestions || []).filter(
          (s) => !seen.has(`${s.kind}:${s.name}`.toLowerCase())
        );
        const merged = [...local, ...extra].slice(0, 8);
        setSuggestions(merged);
        setSuggestState(merged.length ? "" : "none");
      } catch (e) {
        if (cancelled) return;
        setSuggestState(local.length ? "" : "none");
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, showSuggest]);
React.useEffect(() => {
    function onDocClick() {
      setShowSuggest(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);
  function chooseSuggestion(s) {
    setShowSuggest(false);
    setSuggestions([]);
    if (s.kind === "album") {
      setQuery(`${s.name}, ${s.artist}`);
      setMatches(null);
      buildSheet(`${s.name}, ${s.artist}`);
    } else {
      setQuery(s.name);
      run(s.name);
    }
  }

async function toggleArtist(name, mbid) {
    if (open[mbid]) {
      setOpen((o) => ({ ...o, [mbid]: false }));
      return;
    }
    setOpen((o) => ({ ...o, [mbid]: true }));
    if (discoCache[mbid] || loadingArtist) return;
    setLoadingArtist(mbid);
    try {
      const res = await fetch(`/api/mb-albums?mbid=${mbid}`);
      const data = await res.json();
      const albums = (data["release-groups"] || [])
        .filter(
          (g) =>
            g["primary-type"] === "Album" &&
            (!g["secondary-types"] || g["secondary-types"].length === 0)
        )
        .map((g) => ({
          title: g.title,
          year: g["first-release-date"] ? g["first-release-date"].slice(0, 4) : "",
        }))
        .sort((a, b) => (a.year || "9999").localeCompare(b.year || "9999"));

      setDiscoCache((c) => ({ ...c, [mbid]: { albums, truncated: false } }));
    } catch (e) {
      setDiscoCache((c) => ({ ...c, [mbid]: { albums: [], error: e.message } }));
    } finally {
      setLoadingArtist("");
    }
  }

async function run(override) {
    const value = (typeof override === "string" ? override : query).trim();
    setShowSuggest(false);
    setSuggestions([]);
    if (!value || loading) return;
    setLoading(true);
    setError("");
    setSheet(null);
    setSavedList(null);
    setMatches(null);
    setOpen({});
    try {
      const artistRes = await fetch(
        `/api/mb?q=${encodeURIComponent(value)}&type=artist`
      ).then((r) => r.json());

      await new Promise((r) => setTimeout(r, 1100));

      const albumRes = await fetch(
        `/api/mb?q=${encodeURIComponent(value)}&type=release-group`
      ).then((r) => r.json());

      const artists = (artistRes.artists || [])
        .filter((a) => a.score >= 60)
        .map((a) => ({
          name: a.name,
          mbid: a.id,
          detail: [
            a.disambiguation,
            a.country,
            a["life-span"] && a["life-span"].begin
              ? a["life-span"].begin.slice(0, 4)
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
        }));

      const albums = (albumRes["release-groups"] || [])
        .filter(
          (g) =>
            g["primary-type"] === "Album" &&
            (!g["secondary-types"] || g["secondary-types"].length === 0)
        )
        .map((g) => ({
          album: g.title,
          artist:
            g["artist-credit"] && g["artist-credit"][0]
              ? g["artist-credit"][0].name
              : "",
          year: g["first-release-date"] ? g["first-release-date"].slice(0, 4) : "",
        }));

      if (artists.length === 0 && albums.length === 0) {
        setError("Nothing found under that name. Try a different spelling.");
      } else {
        setMatches({ artists, albums });
        setView(artists.length ? "artists" : "albums");
      }
    } catch (e) {
      setError(`Couldn't search that. ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: PAPER, minHeight: "100vh", color: TEXT }}>
      <style>{FONTS}</style>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 160px" }}>
        {/* masthead */}
        <div style={{ borderBottom: `2px solid ${RULE}`, paddingBottom: 14, marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: SPOT,
            }}
          >
            <span style={{ display: "flex", gap: 4 }}>
              <Dot fill={HEAT} on />
              <Dot fill={SPOT} on />
              <Dot fill={INK} on />
            </span>
            <span>Third listen</span>
          </div>
          <h1
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: 46,
              lineHeight: 0.94,
              margin: "10px 0 0",
              letterSpacing: "-0.03em",
            }}
          >
            THE <span style={{ color: HEAT }}>THIRD</span> LISTEN
          </h1>
          <div
            style={{
              fontFamily: "'Spectral', Georgia, serif",
              fontStyle: "italic",
              fontSize: 16,
              marginTop: 8,
              color: MUTED,
            }}
          >
            No more skips left
          </div>
        </div>

        {/* input */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div
            style={{ flex: "1 1 320px", position: "relative" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run();
              if (e.key === "Escape") setShowSuggest(false);
            }}
            placeholder="Artist or album — e.g. Beck, or Abraxas"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 15px",
              fontFamily: "'Spectral', Georgia, serif",
              fontSize: 16,
              background: "transparent",
              border: `1.5px solid ${RULE}`,
              color: TEXT,
              outline: "none",
            }}
          />

          {showSuggest && suggestions.length === 0 && suggestState && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 20,
                background: PAPER_DEEP,
                border: `1.5px solid ${RULE}`,
                borderTop: "none",
                padding: "9px 13px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: suggestState.startsWith("err") ? HEAT : MUTED,
              }}
            >
              {suggestState === "thinking"
                ? "..."
                : suggestState === "none"
                ? "no suggestions"
                : suggestState}
            </div>
          )}

          {showSuggest && suggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 20,
                background: PAPER_DEEP,
                border: `1.5px solid ${RULE}`,
                borderTop: "none",
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    chooseSuggestion(s);
                  }}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "baseline",
                    gap: 10,
                    textAlign: "left",
                    padding: "9px 13px",
                    background: "transparent",
                    color: TEXT,
                    border: "none",
                    borderBottom: `1px solid ${RULE}`,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9.5,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: s.kind === "album" ? HEAT : SPOT,
                      flex: "0 0 44px",
                    }}
                  >
                    {s.kind === "album" ? "LP" : "Artist"}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Spectral', Georgia, serif",
                      fontSize: 15,
                    }}
                  >
                    {s.name}
                  </span>
                  {s.kind === "album" && (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10.5,
                        color: MUTED,
                      }}
                    >
                      {s.artist}
                      {s.year ? ` \u00b7 ${s.year}` : ""}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          </div>

          <button
            onClick={() => run()}
            disabled={loading}
            style={{
              padding: "13px 28px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: loading ? RULE : SPOT,
              color: INK,
              border: "none",
              cursor: loading ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            {loading && <Record size={15} />}
            {loading ? "Working" : "Search"}
          </button>
        </div>

        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5,
            color: MUTED,
            letterSpacing: "0.04em",
            marginTop: 0,
          }}
        >
          AI-generated listening notes. Many albums publish album-level credits only, so
          per-track personnel is best-effort.
        </p>

        {error && (
          <div
            style={{
              marginTop: 24,
              padding: 14,
              border: `1.5px solid ${HEAT}`,
              color: HEAT,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              lineHeight: 1.6,
              wordBreak: "break-word",
            }}
          >
            {error}
          </div>
        )}

        {matches && (
          <div style={{ marginTop: 34 }}>
            <div style={{ display: "flex", gap: 0, marginBottom: 4 }}>
              {[
                ["artists", `Artists (${matches.artists.length})`],
                ["albums", `Albums (${matches.albums.length})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  style={{
                    padding: "8px 18px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    background: view === key ? TEXT : "transparent",
                    color: view === key ? INK : TEXT,
                    border: `1.5px solid ${RULE}`,
                    borderRight: key === "artists" ? "none" : `1.5px solid ${RULE}`,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {view === "albums" && (
              <div>
                {matches.albums.length === 0 && (
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: MUTED,
                      padding: "12px",
                    }}
                  >
                    No album titles matched that search.
                  </div>
                )}
                {matches.albums.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => buildSheet(`${a.album}, ${a.artist}`)}
                    style={{
                      display: "flex",
                      width: "100%",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 3,
                      textAlign: "left",
                      padding: "11px 12px",
                      background: "transparent",
                      color: TEXT,
                      border: "none",
                      borderBottom: `1px solid ${RULE}`,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Spectral', Georgia, serif",
                        fontSize: 16,
                        fontWeight: 600,
                      }}
                    >
                      {a.album}
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: MUTED,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {a.artist}
                      {a.year ? ` \u00b7 ${a.year}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: view === "artists" ? "block" : "none" }}>
              {matches.artists.map((m, i) => {
                const isOpen = !!open[m.mbid];
                const entry = discoCache[m.mbid];
                const busy = loadingArtist === m.mbid;
                return (
                  <div key={i} style={{ borderBottom: `1px solid ${RULE}` }}>
                    <button
                      onClick={() => toggleArtist(m.name, m.mbid)}
                      style={{
                        display: "flex",
                        width: "100%",
                        alignItems: "center",
                        gap: 12,
                        textAlign: "left",
                        padding: "11px 12px",
                        background: isOpen ? PAPER_DEEP : "transparent",
                        color: TEXT,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 13,
                          color: HEAT,
                          width: 12,
                        }}
                      >
                        {isOpen ? "\u2013" : "+"}
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span
                          style={{
                            fontFamily: "'Spectral', Georgia, serif",
                            fontSize: 16,
                            fontWeight: 600,
                          }}
                        >
                          {m.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 11,
                            color: MUTED,
                            letterSpacing: "0.05em",
                          }}
                        >
                          {m.detail}
                        </span>
                      </span>
                    </button>

                    {isOpen && (
                      <div style={{ paddingLeft: 24, paddingBottom: 6 }}>
                        {busy && (
                          <div
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 11,
                              color: SPOT,
                              padding: "8px 12px",
                              display: "flex",
                              alignItems: "center",
                              gap: 9,
                            }}
                          >
                            <Record size={14} />
                            Loading albums...
                          </div>
                        )}
                        {entry && entry.error && (
                          <div
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 11,
                              color: HEAT,
                              padding: "8px 12px",
                            }}
                          >
                            {entry.error}
                          </div>
                        )}
                        {entry &&
                          entry.albums.map((a, j) => (
                            <button
                              key={j}
                              onClick={() => buildSheet(`${a.title}, ${m.name}`)}
                              style={{
                                display: "flex",
                                width: "100%",
                                alignItems: "baseline",
                                gap: 12,
                                textAlign: "left",
                                padding: "7px 12px",
                                background: "transparent",
                                color: TEXT,
                                border: "none",
                                borderLeft: `2px solid ${RULE}`,
                                cursor: "pointer",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: 11,
                                  color: SPOT,
                                  flex: "0 0 40px",
                                }}
                              >
                                {a.year}
                              </span>
                              <span
                                style={{
                                  fontFamily: "'Spectral', Georgia, serif",
                                  fontSize: 15,
                                }}
                              >
                                {a.title}
                              </span>
                            </button>
                          ))}
                        {entry && entry.truncated && (
                          <div
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 10.5,
                              color: HEAT,
                              padding: "6px 12px",
                            }}
                          >
                            List cut short - later albums may be missing.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {discography && (
          <div style={{ marginTop: 34 }}>
            <Band>{discography.artist} — studio albums</Band>
            <div>
              {discography.albums.map((a, i) => (
                <button
                  key={i}
                  onClick={() => buildSheet(`${a.title}, ${discography.artist}`)}
                  disabled={loading}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "baseline",
                    gap: 14,
                    textAlign: "left",
                    padding: "10px 12px",
                    background:
                      pending === `${a.title}, ${discography.artist}` ? PAPER_DEEP : "transparent",
                    color: TEXT,
                    border: "none",
                    borderBottom: `1px solid ${RULE}`,
                    cursor: loading ? "default" : "pointer",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      color: SPOT,
                      flex: "0 0 46px",
                    }}
                  >
                    {a.year}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Spectral', Georgia, serif",
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {a.title}
                  </span>
                </button>
              ))}
            </div>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10.5,
                color: discography._truncated ? HEAT : MUTED,
                letterSpacing: "0.04em",
              }}
            >
              {discography._truncated
                ? "List was cut short — later albums may be missing. Search a specific album to be sure."
                : "Pick an album to build its sheet."}
            </p>
          </div>
        )}

        {loading && pending && (
          <div
            style={{
              marginTop: 26,
              padding: "12px 14px",
              border: `1.5px solid ${HEAT}`,
              color: HEAT,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Record size={26} />
            {LOADING_LINES[loadingLine]} — {pending.split(",")[0]} — this takes a few seconds
          </div>
        )}

        {sheet && savedList && (
          <button
            onClick={() => {
              setDiscography(savedList);
              setSheet(null);
            }}
            style={{
              marginTop: 30,
              padding: "8px 16px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              background: "transparent",
              color: TEXT,
              border: `1.5px solid ${RULE}`,
              cursor: "pointer",
            }}
          >
            ← Back to {savedList.artist}
          </button>
        )}

        {sheet && <Sheet sheet={sheet} />}
      </div>
    </div>
  );
}

function Record({ size = 22 }) {
  const label = size * 0.34;
  const hole = size * 0.07;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-block",
        position: "relative",
        flex: "0 0 auto",
        background: `repeating-radial-gradient(circle at 50% 50%, #000 0 1px, #22252C 1px 2.5px)`,
        boxShadow: `inset 0 0 0 1px #33373F`,
        animation: "spin 1.6s linear infinite",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: label,
          height: label,
          marginTop: -label / 2,
          marginLeft: -label / 2,
          borderRadius: "50%",
          background: HEAT,
        }}
      />
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: hole,
          height: hole,
          marginTop: -hole / 2,
          marginLeft: -hole / 2,
          borderRadius: "50%",
          background: PAPER,
        }}
      />
    </span>
  );
}

function Dot({ fill, on }) {
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: on ? fill : "transparent",
        border: `1px solid ${fill}`,
        display: "inline-block",
      }}
    />
  );
}

function Band({ children }) {
  return (
    <div
      style={{
        background: PAPER_DEEP,
        color: "var(--sheet-heat)",
        borderLeft: "5px solid var(--sheet-heat)",
        fontFamily: "'Archivo Black', sans-serif",
        fontSize: 15,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "12px 14px",
        marginTop: 38,
        display: "flex",
        alignItems: "center",
        gap: 9,
      }}
    >
      {children}
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", borderBottom: `1px solid ${RULE}` }}>
      <div
        style={{
          flex: "0 0 148px",
          background: PAPER_DEEP,
          color: TEXT,
          padding: "9px 12px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          padding: "9px 12px",
          fontFamily: "'Spectral', Georgia, serif",
          fontSize: 15,
          whiteSpace: "pre-line",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function shortNameOf(full, sheet) {
  const parts = String(full).trim().split(/\s+/);
  if (parts.length < 2) return full;
  const surname = parts[parts.length - 1];
  const names = new Set();
  (sheet.corePersonnel || []).forEach((c) => names.add(c.name));
  (sheet.additionalPersonnel || []).forEach((a) => names.add(a.name));
  (sheet.tracks || []).forEach((t) =>
    (t.personnel || []).forEach((p) => names.add(p.name))
  );
  let count = 0;
  names.forEach((n) => {
    const bits = String(n).trim().split(/\s+/);
    if (bits[bits.length - 1] === surname) count++;
  });
  return count > 1 ? `${parts[0][0]}. ${surname}` : surname;
}
function Sheet({ sheet }) {
  const [cover, setCover] = React.useState("");
  const [palette, setPalette] = React.useState(null);

  React.useEffect(() => {
    setCover("");
    setPalette(null);
    if (!sheet.album) return;
    let cancelled = false;
    fetch(
      `/api/cover?album=${encodeURIComponent(sheet.album)}&artist=${encodeURIComponent(
        sheet.artist || ""
      )}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setCover(d.url || "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sheet.album, sheet.artist]);
  return (
    <div
      style={{
        marginTop: 40,
        "--sheet-heat": palette ? palette.heat : DEFAULT_HEAT,
        "--sheet-spot": palette ? palette.spot : DEFAULT_SPOT,
        boxShadow: palette
          ? `0 0 90px 50px ${palette.heat}18, 0 0 140px 90px ${palette.spot}12`
          : "none",
        transition: "box-shadow 600ms ease",
      }}
    >
      {/* title block */}
      <div
        style={{
          position: "relative",
          background: INK,
          color: TEXT,
          borderTop: "4px solid var(--sheet-heat)",
          borderBottom: "4px solid var(--sheet-spot)",
          overflow: "hidden",
        }}
      >
        {cover && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${cover})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(38px) saturate(1.5)",
              opacity: 0.32,
              transform: "scale(1.25)",
            }}
          />
        )}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, ${INK}F2 0%, ${INK}CC 55%, ${INK}F2 100%)`,
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 26,
            padding: "30px 26px",
          }}
        >
          {cover && (
            <img
              src={cover}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: 176,
                height: 176,
                objectFit: "cover",
                flex: "0 0 auto",
                boxShadow: "0 10px 34px rgba(0,0,0,0.6)",
              }}
              onLoad={(e) => setPalette(extractPalette(e.target))}
              onError={() => setCover("")}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: 38,
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
              }}
            >
              {(sheet.album || "").toUpperCase()}
            </div>
            <div
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: 19,
                letterSpacing: "0.12em",
                marginTop: 14,
                color: "var(--sheet-spot)",
              }}
            >
              {(sheet.artist || "").toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <Band>Album details</Band>
      <div>
        <Row label="Year" value={sheet.year} />
        <Row label="Label" value={sheet.label} />
        <Row label="Genre" value={sheet.genre} />
        {sheet.musicSummary === sheet.lyricsSummary ? (
          <Row label="Written by" value={sheet.musicSummary} />
        ) : (
          <>
            <Row label="Music by" value={sheet.musicSummary} />
            <Row label="Lyrics by" value={sheet.lyricsSummary} />
          </>
        )}
        <Row label="Tracks" value={String((sheet.tracks || []).length || "")} />
        <Row label="Length" value={sheet.length} />
        <Row label="Recorded" value={sheet.recordedDates} />
        <Row label="Recorded at" value={sheet.recordedAt} />
        <Row label="Producer" value={sheet.producer} />
        <Row label="Engineer" value={sheet.engineer} />
       
      </div>

   

      <Band>Core personnel</Band>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10.5,
          color: MUTED,
          padding: "6px 12px",
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        On {Math.ceil((sheet.tracks || []).length / 2)} or more of {(sheet.tracks || []).length} tracks
        {" \u00b7 credits checked against published sources where available"}
      </div>
      <div>
        {(sheet.corePersonnel || []).map((p, i) => (
          <Row key={i} label={p.name} value={p.role} />
        ))}
      </div>

      <Band>Additional personnel</Band>
      <div>
        {(sheet.additionalPersonnel || []).length === 0 ? (
          <Row label="None" value="no guest musicians on this album" />
        ) : (
          sheet.additionalPersonnel.map((p, i) => (
            <Row key={i} label={p.name} value={p.role} />
          ))
        )}
      </div>

      <Band>Tracks</Band>
      <div>
        {(sheet.tracks || []).map((t, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              borderTop: i === 0 ? "none" : "2px solid var(--sheet-heat)",
              borderBottom: "none",
            }}
          >
            <div
              style={{
                flex: "0 0 210px",
                background: PAPER_DEEP,
                color: TEXT,
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                borderTop: `2px solid ${RULE}`,
                borderRight: `2px solid ${RULE}`,
              }}
            >
              <div
                style={{
                  fontFamily: "'Spectral', Georgia, serif",
                  fontWeight: 700,
                  fontSize: 19,
                  lineHeight: 1.25,
                }}
              >
                {t.number}. {t.title}
              </div>
              {t.writerLabel && (
                <div style={{ marginTop: 14 }}>
                  {t.writerLabel.split("\n").map((line, k) => {
                    const isLabel = line.trim().endsWith("by:");
                    return (
                      <div
                        key={k}
                        style={
                          isLabel
                            ? {
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 10.5,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                color: "var(--sheet-spot)",
                                marginTop: k === 0 ? 0 : 6,
                              }
                            : {
                                fontFamily: "'Spectral', Georgia, serif",
                                fontSize: 14,
                                color: TEXT,
                                lineHeight: 1.4,
                              }
                        }
                      >
                        {isLabel ? line.replace(/:$/, "") : line}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ flex: 1, padding: "16px 14px" }}>
              {(() => {
                const people = (t.personnel || []).filter(
                  (p) => (p.roles || []).length > 0
                );

                if (people.length === 0) {
                  return (
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: MUTED,
                      }}
                    >
                      personnel loading...
                    </div>
                  );
                }

            

                return people
                  .sort((a, b) => rankPerson(a.roles) - rankPerson(b.roles))
                  .map((p, j) => (
                    <div
                      key={j}
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        lineHeight: 1.9,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: "var(--sheet-spot)",
                        }}
                      >
                        {shortNameOf(p.name, sheet)}
                      </span>{" "}
                      <span style={{ color: MUTED }}>
                        {(p.roles || []).join(", ")}
                      </span>
                    </div>
                  ));
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
