export const revalidate = 86400;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mbid = searchParams.get("mbid");

  if (!mbid) {
    return Response.json({ error: "missing mbid" }, { status: 400 });
  }

  const url = `https://musicbrainz.org/ws/2/release-group?artist=${mbid}&type=album&fmt=json&limit=100`;
  const headers = {
    "User-Agent": "TheThirdListen/0.1 ( ericrodecker887@gmail.com )",
  };

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