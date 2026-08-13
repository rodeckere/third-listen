export const revalidate = 604800;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mbid = searchParams.get("mbid");

  if (!mbid) {
    return Response.json({ error: "missing mbid" }, { status: 400 });
  }

  const res = await fetch(
    `https://musicbrainz.org/ws/2/artist/${mbid}?inc=artist-rels+area-rels+tags&fmt=json`,
    {
      headers: {
        "User-Agent": "TheThirdListen/0.1 ( ericrodecker887@gmail.com )",
      },
    }
  );

  if (!res.ok) {
    return Response.json({ error: `musicbrainz ${res.status}` }, { status: 502 });
  }

  const data = await res.json();

  // members of the band, with the years they were in it
  const members = (data.relations || [])
    .filter((r) => r.type === "member of band" && r.direction === "backward")
    .map((r) => ({
      name: r.artist ? r.artist.name : "",
      role: (r.attributes || []).join(", "),
      from: r.begin ? Number(r.begin.slice(0, 4)) : null,
      to: r.end ? Number(r.end.slice(0, 4)) : null,
      current: !r.ended,
    }))
    .filter((m) => m.name);

  const span = data["life-span"] || {};
  const beganYear = span.begin ? Number(span.begin.slice(0, 4)) : null;
  const endedYear = span.end ? Number(span.end.slice(0, 4)) : null;

  const genres = (data.tags || [])
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((t) => t.name);

  return Response.json({
    name: data.name,
    type: data.type || "",
    disambiguation: data.disambiguation || "",
    country: data.country || "",
    area: data.area ? data.area.name : "",
    beginArea: data["begin-area"] ? data["begin-area"].name : "",
    began: span.begin || "",
    ended: span.end || "",
    isEnded: !!span.ended,
    beganYear,
    endedYear,
    genres,
    members,
  });
}
