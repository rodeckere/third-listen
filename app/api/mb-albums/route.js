export const revalidate = 86400;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mbid = searchParams.get("mbid");

  if (!mbid) {
    return Response.json({ error: "missing mbid" }, { status: 400 });
  }

  const res = await fetch(
    `https://musicbrainz.org/ws/2/release-group?artist=${mbid}&type=album&fmt=json&limit=100`,
    {
      headers: {
        "User-Agent": "TheThirdListen/0.1 ( ericrodecker887@gmail.com )",
      },
    }
  );

  if (!res.ok) {
    return Response.json({ error: `musicbrainz ${res.status}` }, { status: 502 });
  }

  return Response.json(await res.json());
}