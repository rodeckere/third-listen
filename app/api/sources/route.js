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
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1" +
    `&format=json&origin=*&titles=${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return "";
  const data = await res.json();
  const pages = (data.query && data.query.pages) || {};
  const first = Object.values(pages)[0];
  return (first && first.extract) || "";
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
  try {
    // find the release via DuckDuckGo's HTML endpoint — no key required
    const q = `site:discogs.com release ${artist} ${album}`;
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": UA } }
    );
    if (!res.ok) return "";
    const html = await res.text();
    const match = html.match(
      /https:\/\/www\.discogs\.com\/release\/\d+[^"&\s]*/
    );
    if (!match) return "";

    const page = await fetch(match[0], { headers: { "User-Agent": UA } });
    if (!page.ok) return "";
    const body = await page.text();

    // the credits block sits between these markers on a release page
    const start = body.search(/Credits/i);
    if (start === -1) return "";
    return stripHtml(body.slice(start, start + 14000)).slice(0, 6000);
  } catch (e) {
    return "";
  }
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
    debug.discogsLength = dc.length;
    if (dc) sources.push({ source: "Discogs release credits", text: dc });
  } catch (e) {
    debug.discogsError = e.message;
  }

  return Response.json({ album, artist, sources, debug });
}
