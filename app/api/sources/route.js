export const revalidate = 604800;

const UA = "TheThirdListen/0.1 ( ericrodecker887@gmail.com )";

// ---------- Wikipedia ----------

async function wikipediaSearch(query) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*" +
    `&srsearch=${encodeURIComponent(query)}&srlimit=5`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.query && data.query.search) || [];
}

async function wikipediaPage(title) {
  // The plain-text extract drops bulleted lists, which is exactly where
  // personnel usually live. Fetch the raw wikitext instead.
  const url =
    "https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext" +
    `&format=json&origin=*&page=${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return "";
  const data = await res.json();
  const raw =
    (data.parse && data.parse.wikitext && data.parse.wikitext["*"]) || "";

  return raw
    .replace(/\{\{[^{}]*\}\}/g, " ")
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
    .replace(/'''?/g, "")
    .replace(/<ref[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/^\*\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

// Pull just the sections that carry credits, so we don't ship the whole article.
function creditSections(text) {
  if (!text) return "";
  const lines = text.split("\n");
  const wanted =
    /^==+\s*(personnel|credits|musicians|track listing|recording|production|charts personnel)/i;
  const heading = /^==+\s*[^=]+\s*==+$/;
  const out = [];
  let capture = false;
  for (const line of lines) {
    if (heading.test(line)) {
      capture = wanted.test(line);
      if (capture) out.push(line);
      continue;
    }
    if (capture) out.push(line);
  }
  return out.join("\n").slice(0, 9000);
}

// ---------- Discogs ----------
// Public search needs a token, but a release page can be read as HTML.

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function discogsCredits(album, artist) {
  const token = process.env.DISCOGS_TOKEN;
  if (!token) return { text: "", note: "no token" };

  const headers = {
    "User-Agent": UA,
    Authorization: `Discogs token=${token}`,
  };

  const search = await fetch(
    `https://api.discogs.com/database/search?type=release&release_title=${encodeURIComponent(
      album
    )}&artist=${encodeURIComponent(artist)}&per_page=5`,
    { headers }
  );
  if (!search.ok) return { text: "", note: `search ${search.status}` };

  let found = await search.json();
  let first = (found.results || [])[0];

  // Artist names don't always match — P!nk vs Pink. Retry on title alone.
  if (!first) {
    const retry = await fetch(
      `https://api.discogs.com/database/search?type=release&q=${encodeURIComponent(
        album + " " + artist.replace(/[^a-zA-Z0-9 ]/g, "")
      )}&per_page=5`,
      { headers }
    );
    if (retry.ok) {
      found = await retry.json();
      first = (found.results || [])[0];
    }
  }
  if (!first) return { text: "", note: "no release found" };

  const rel = await fetch(`https://api.discogs.com/releases/${first.id}`, {
    headers,
  });
  if (!rel.ok) return { text: "", note: `release ${rel.status}` };

  const data = await rel.json();

  const lines = [];
  lines.push(`Release: ${data.title} (${data.year || "?"})`);
  if (data.labels) {
    lines.push(`Label: ${data.labels.map((l) => l.name).join(", ")}`);
  }

  if (data.extraartists && data.extraartists.length) {
    lines.push("", "ALBUM CREDITS:");
    data.extraartists.forEach((a) => {
      lines.push(`${a.name} - ${a.role}`);
    });
  }

  if (data.tracklist && data.tracklist.length) {
    lines.push("", "TRACKLIST:");
    data.tracklist.forEach((t) => {
      const credits = (t.extraartists || [])
        .map((a) => `${a.name} (${a.role})`)
        .join(", ");
      lines.push(
        `${t.position}. ${t.title}${credits ? " — " + credits : ""}`
      );
    });
  }

  if (data.notes) lines.push("", "NOTES:", data.notes);

  return { text: lines.join("\n").slice(0, 8000), note: "ok" };
}

// ---------- route ----------

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const album = searchParams.get("album") || "";
  const artist = searchParams.get("artist") || "";
  if (!album) {
    return Response.json({ error: "missing album" }, { status: 400 });
  }

  const sources = [];
  const debug = {};

  try {
    const hits = await wikipediaSearch(`${album} ${artist} album`);
    debug.wikiHits = hits.map((h) => h.title);
    if (hits.length) {
      const text = await wikipediaPage(hits[0].title);
      debug.wikiTextLength = text.length;
      const sections = creditSections(text);
      debug.wikiSectionLength = sections.length;
      if (sections) {
        sources.push({ source: `Wikipedia — ${hits[0].title}`, text: sections });
      }
    }
  } catch (e) {
    debug.wikiError = e.message;
  }

  try {
    const dc = await discogsCredits(album, artist);
    debug.discogs = dc.note;
    debug.discogsLength = dc.text.length;
    if (dc.text) {
      sources.push({ source: "Discogs release credits", text: dc.text });
    }
  } catch (e) {
    debug.discogsError = e.message;
  }

  return Response.json({ album, artist, sources, debug });
}
