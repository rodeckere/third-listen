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

const DETAILS_PROMPT = `You are a music documentarian. Describe one album.

Return ONLY valid JSON, compact, no commentary.

Shape:
{
  "album": string, "artist": string, "year": string, "genre": string, "producer": string,
  "signature": string, "note": string, "lyricsBy": string, "musicBy": string,
  "tracks": [{ "number": number, "title": string }]
}

signature (album level): one brief line naming what makes the album great. No hedging.
note: only a genuinely notable fact, else "".

lyricsBy / musicBy: use "excl." or track numbers where credits differ, e.g.
"Damon Albarn (excl. 8 - Alex James)".

List every track in running order. Nothing else.`;

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
  "tracks": [{ "number": number, "except": [{ "name": string, "roles": [string] }] }]
}

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

Never list an instrument on a track where it is not played. A song with no drums must not
show drums.

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

Include one entry per track, numbered in running order, even when "except" is empty.

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
  - Where a source is silent, leave it out rather than filling it in. Fewer credits that
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
  [/backing vocal|harmony vocal|background vocal/i, 4],
  [/lead vocal|^vocals?$|^vocal/i, 0],
  [/guitars?$|guitar|banjo|mandolin|sitar|lap steel|pedal steel|dobro/i, 1],
  [/^bass|double bass|upright bass/i, 2],
  [/drum|percussion|congas|timbales|vibraphone|tabla/i, 3],
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

    const hit = cache[title.toLowerCase()];
    if (hit) {
      setSheet(hit);
      return;
    }

    setLoading(true);
    setPending(title);
    setError("");
    setSheet(null);

    // Two smaller requests run at once: total wait is the slower one, not the sum.
    const detailsCall = ask(`${DETAILS_PROMPT}\n\nAlbum: ${title}`, 2000);
    const personnelCall = ask(`${PERSONNEL_PROMPT}\n\nAlbum: ${title}`, 8000, true);

    let details = null;
    try {
      details = await detailsCall;
      // show titles and signatures immediately; personnel fills in when it arrives
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
      const personnel = await personnelCall;
      const byNumber = new Map(
        (personnel.tracks || []).map((t) => [t.number, t.except || []])
      );
      const merged = {
        lineup: personnel.lineup || [],
        tracks: (details.tracks || []).map((t) => ({
          ...t,
          except: byNumber.get(t.number) || [],
        })),
      };
      const tracks = expandTracks(merged);
      const { core, additional } = splitPersonnel(tracks);
      const built = {
        ...details,
        tracks,
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
    if (open[name]) {
      setOpen((o) => ({ ...o, [name]: false }));
      return;
    }
    setOpen((o) => ({ ...o, [name]: true }));
    if (discoCache[name] || loadingArtist) return;
    setLoadingArtist(name);
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

      setDiscoCache((c) => ({ ...c, [name]: { albums, truncated: false } }));
    } catch (e) {
      setDiscoCache((c) => ({ ...c, [name]: { albums: [], error: e.message } }));
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

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 96px" }}>
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
          <div style={{ flex: "1 1 320px", position: "relative" }}>
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
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => chooseSuggestion(s)}
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
                const isOpen = !!open[m.name];
                const entry = discoCache[m.name];
                const busy = loadingArtist === m.name;
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
            Building {pending.split(",")[0]} — this takes a few seconds
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
        color: TEXT,
        borderLeft: `3px solid ${HEAT}`,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        padding: "7px 12px",
        marginTop: 30,
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
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Sheet({ sheet }) {
  const sig = sheet.signature || "";
  return (
    <div style={{ marginTop: 40 }}>
      {/* title block */}
      <div
        style={{
          background: INK,
          color: TEXT,
          padding: "26px 20px",
          textAlign: "center",
          borderTop: `4px solid ${HEAT}`,
          borderBottom: `4px solid ${SPOT}`,
        }}
      >
        <div
          style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: 34,
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
          }}
        >
          {(sheet.album || "").toUpperCase()}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            letterSpacing: "0.26em",
            marginTop: 10,
            color: SPOT,
          }}
        >
          {(sheet.artist || "").toUpperCase()}
        </div>
      </div>

      <Band>Album details</Band>
      <div>
        <Row label="Year" value={sheet.year} />
        <Row label="Genre" value={sheet.genre} />
        <Row label="Producer" value={sheet.producer} />
        <Row label="Signature" value={sig} />
        <Row label="Note" value={sheet.note} />
      </div>

      <Band>Writing credits</Band>
      <div>
        <Row label="Lyrics by" value={sheet.lyricsBy} />
        <Row label="Music by" value={sheet.musicBy} />
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
              borderTop: i === 0 ? "none" : `2px solid ${RULE}`,
              borderBottom: `1px solid ${RULE}`,
            }}
          >
            <div style={{ flex: "0 0 210px", background: PAPER_DEEP, color: TEXT, padding: "11px 12px" }}>
              <div
                style={{
                  fontFamily: "'Spectral', Georgia, serif",
                  fontWeight: 600,
                  fontSize: 15,
                  lineHeight: 1.25,
                }}
              >
                {t.number}. {t.title}
              </div>
            </div>
            <div style={{ flex: 1, padding: "11px 12px" }}>
              {(t.personnel || []).length === 0 && (
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: MUTED,
                  }}
                >
                  personnel loading...
                </div>
              )}
              {(t.personnel || []).map((p, j) => (
                <div
                  key={j}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    lineHeight: 1.75,
                  }}
                >
                  {p.name} ({(p.roles || []).join(", ")})
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
