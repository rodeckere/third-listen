"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ARTIST_DATA } from "../../artistData";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Spectral:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;700&display=swap');
`;

const PAPER = "#15171C";
const PAPER_DEEP = "#1D2027";
const TEXT = "#E4E0D6";
const MUTED = "#8B8778";
const SPOT = "#5FB0BE";
const HEAT = "#E4593C";
const RULE = "#2E323B";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function ArtistPage() {
  const params = useParams();
  const slug = decodeURIComponent(params.slug || "");

  const [info, setInfo] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const extra = ARTIST_DATA[slug] || null;

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const query = slug.replace(/-/g, " ");

    (async () => {
      try {
        const search = await fetch(
          `/api/mb?q=${encodeURIComponent(query)}&type=artist`
        ).then((r) => r.json());

        const list = search.artists || [];
        const exact = list.find(
          (a) => a.name.toLowerCase() === query.toLowerCase()
        );
        const match = exact || list[0];
        if (!match) throw new Error("no artist");

        await wait(1200);
        const detail = await fetch(`/api/mb-artist?mbid=${match.id}`).then((r) =>
          r.json()
        );
        if (!cancelled) setInfo(detail);

        await wait(1200);
        const groups = await fetch(`/api/mb-albums?mbid=${match.id}`).then((r) =>
          r.json()
        );
        if (cancelled) return;

        const studio = (groups["release-groups"] || [])
          .filter(
            (g) =>
              g["primary-type"] === "Album" &&
              (!g["secondary-types"] || g["secondary-types"].length === 0)
          )
          .map((g) => ({
            title: g.title,
            year: g["first-release-date"]
              ? g["first-release-date"].slice(0, 4)
              : "",
          }))
          .sort((a, b) => (a.year || "9999").localeCompare(b.year || "9999"));

        setAlbums(studio);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const displayName = (info && info.name) || slug.replace(/-/g, " ");
  const thisYear = new Date().getFullYear();

  // where they're from — prefer the specific city over the country
  const from =
    (extra && extra.formed) ||
    (info && (info.beginArea || info.area)) ||
    "";

  // active years
  const active =
    (extra && extra.years) ||
    (info && info.beganYear
      ? `${info.beganYear} – ${info.endedYear || "present"}`
      : "");

  // members: hand-written wins, otherwise MusicBrainz
  const members =
    extra && extra.members && extra.members.length > 0
      ? extra.members
      : (info && info.members) || [];

  // work out the timeline span from whatever data we have
  const years = members.flatMap((m) => [m.from, m.to]).filter(Boolean);
  const spanStart =
    (extra && extra.span && extra.span.start) ||
    (info && info.beganYear) ||
    (years.length ? Math.min(...years) : null);
  const spanEnd =
    (extra && extra.span && extra.span.end) ||
    (info && info.endedYear) ||
    (years.length ? Math.max(...years, thisYear) : null);

  const canChart =
    spanStart && spanEnd && spanEnd > spanStart && members.length > 0;

  return (
    <div style={{ background: PAPER, minHeight: "100vh", color: TEXT }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "40px 24px 140px" }}>
        <a
          href="/"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: MUTED,
            textDecoration: "none",
          }}
        >
          ← Search
        </a>

        <div
          style={{
            marginTop: 22,
            paddingBottom: 22,
            borderBottom: `3px solid ${HEAT}`,
          }}
        >
          <h1
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: 52,
              lineHeight: 0.96,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            {displayName.toUpperCase()}
          </h1>

          {info && info.disambiguation && (
            <div
              style={{
                fontFamily: "'Spectral', Georgia, serif",
                fontStyle: "italic",
                fontSize: 15,
                color: MUTED,
                marginTop: 8,
              }}
            >
              {info.disambiguation}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 26,
              flexWrap: "wrap",
              marginTop: 16,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: MUTED,
              letterSpacing: "0.06em",
            }}
          >
            {from && (
              <span>
                {info && info.type === "Person" ? "FROM" : "FORMED"}{" "}
                <span style={{ color: TEXT }}>{from}</span>
              </span>
            )}
            {active && (
              <span>
                ACTIVE <span style={{ color: TEXT }}>{active}</span>
              </span>
            )}
            <span>
              ALBUMS <span style={{ color: TEXT }}>{albums.length || "—"}</span>
            </span>
          </div>

          {info && info.genres && info.genres.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {info.genres.map((g, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: SPOT,
                    border: `1px solid ${RULE}`,
                    padding: "4px 9px",
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {extra && extra.hallOfFame && extra.hallOfFame.inducted && (
          <div
            style={{
              marginTop: 26,
              border: `2px solid ${HEAT}`,
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: 30,
                color: HEAT,
                lineHeight: 1,
              }}
            >
              ★
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: 15,
                  letterSpacing: "0.08em",
                  color: HEAT,
                }}
              >
                THIRD LISTEN HALL OF FAME
              </div>
              {extra.hallOfFame.year && (
                <div
                  style={{
                    fontFamily: "'Spectral', Georgia, serif",
                    fontSize: 14,
                    color: MUTED,
                    marginTop: 4,
                  }}
                >
                  Inducted {extra.hallOfFame.year}
                </div>
              )}
            </div>
          </div>
        )}

        {members.length > 0 && (
          <>
            <SectionTitle>Members</SectionTitle>
            {canChart && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: MUTED,
                  padding: "8px 0 2px",
                  marginLeft: 224,
                }}
              >
                <span>{spanStart}</span>
                <span>{spanEnd}</span>
              </div>
            )}
            <div>
              {members.map((m, i) => {
                const from = m.from || spanStart;
                const to = m.to || (m.current ? spanEnd : spanEnd);
                const total = canChart ? spanEnd - spanStart : 1;
                const left = canChart ? ((from - spanStart) / total) * 100 : 0;
                const width = canChart ? ((to - from) / total) * 100 : 0;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "9px 0",
                      borderBottom: `1px solid ${RULE}`,
                    }}
                  >
                    <div style={{ flex: "0 0 210px" }}>
                      <div
                        style={{
                          fontFamily: "'Spectral', Georgia, serif",
                          fontSize: 16,
                          fontWeight: 600,
                        }}
                      >
                        {m.name}
                      </div>
                      {m.role && (
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10.5,
                            color: MUTED,
                          }}
                        >
                          {m.role}
                        </div>
                      )}
                    </div>
                    {canChart && (
                      <div
                        style={{
                          flex: 1,
                          position: "relative",
                          height: 10,
                          background: PAPER_DEEP,
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: `${Math.max(left, 0)}%`,
                            width: `${Math.max(width, 2)}%`,
                            top: 0,
                            bottom: 0,
                            background: m.current ? SPOT : MUTED,
                          }}
                        />
                      </div>
                    )}
                    <div
                      style={{
                        flex: "0 0 104px",
                        textAlign: "right",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: MUTED,
                      }}
                    >
                      {m.from || "?"}–{m.to || (m.current ? "present" : "?")}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <SectionTitle>Studio albums</SectionTitle>
        {loading && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: SPOT,
              padding: "12px 0",
            }}
          >
            Loading...
          </div>
        )}
        {notFound && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: HEAT,
              padding: "12px 0",
            }}
          >
            Couldn't find that artist.
          </div>
        )}
        <div>
          {albums.map((a, i) => (
            <a
              key={i}
              href={`/?album=${encodeURIComponent(
                `${a.title}, ${displayName}`
              )}&from=${encodeURIComponent(slug)}&name=${encodeURIComponent(
                displayName
              )}`}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 16,
                padding: "11px 0",
                borderBottom: `1px solid ${RULE}`,
                textDecoration: "none",
                color: TEXT,
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
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {a.title}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div
      style={{
        marginTop: 44,
        marginBottom: 6,
        fontFamily: "'Archivo Black', sans-serif",
        fontSize: 15,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: HEAT,
        borderLeft: `5px solid ${HEAT}`,
        background: PAPER_DEEP,
        padding: "12px 14px",
      }}
    >
      {children}
    </div>
  );
}
