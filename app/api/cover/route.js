export const revalidate = 604800;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const album = searchParams.get("album");
  const artist = searchParams.get("artist");
  if (!album) return Response.json({ url: "" });

  const clean = (s) => String(s).replace(/["\\]/g, "");
  const q = `releasegroup:"${clean(album)}"${
    artist ? ` AND artist:"${clean(artist)}" AND primarytype:Album` : ""
  }`;
  const res = await fetch(
    `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(q)}&fmt=json&limit=1`,
    { headers: { "User-Agent": "TheThirdListen/0.1 ( ericrodecker887@gmail.com )" } }
  );
  if (!res.ok) return Response.json({ url: "" });

  const data = await res.json();
  const id = (data["release-groups"] || [])[0]?.id;
  return Response.json({
    url: id ? `https://coverartarchive.org/release-group/${id}/front-500` : "",
  });
}