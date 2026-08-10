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

  const res = await fetch(url, {
    headers: {
      "User-Agent": "TheThirdListen/0.1 ( ericrodecker887@gmail.com )",
    },
  });

  if (!res.ok) {
    return Response.json({ error: `musicbrainz ${res.status}` }, { status: 502 });
  }

  return Response.json(await res.json());
}