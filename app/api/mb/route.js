export const revalidate = 86400;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const type = searchParams.get("type") || "artist";

  if (!q) {
    return Response.json({ error: "missing query" }, { status: 400 });
  }

  const url =
    type === "artist"
      ? `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(q)}&fmt=json&limit=8`
      : `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(q)}&fmt=json&limit=8`;

  const headers = {
    "User-Agent": "TheThirdListen/0.1 ( ericrodecker887@gmail.com )",
  };

  // MusicBrainz allows about one request a second — back off and retry
  let res;
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(url, { headers });
    if (res.ok) return Response.json(await res.json());
    if (res.status !== 503 && res.status !== 429) break;
    await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
  }

  return Response.json(
    { error: `musicbrainz ${res ? res.status : "unknown"}` },
    { status: 502 }
  );
}