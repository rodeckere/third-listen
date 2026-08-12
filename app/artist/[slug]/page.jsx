"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ARTIST_DATA } from "../../artistData";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Spectral:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;700&display=swap');
`;

const INK = "#0E0F13";
const PAPER = "#15171C";
const PAPER_DEEP = "#1D2027";
const TEXT = "#E4E0D6";
const MUTED = "#8B8778";
const SPOT = "#5FB0BE";
const HEAT = "#E4593C";
const RULE = "#2E323B";

export default function ArtistPage() {
  const params = useParams();
  const slug = decodeURIComponent(params.slug || "");

  const [name, setName] = useState("");
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const extra = ARTIST_DATA[slug] || null;

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const query = slug.replace(/-/g, " ");

    fetch(`/api/mb?q=${encodeURIComponent(query)}&type=artist`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.artists || [];
        const exact = list.find(
          (a) => a.name.toLowerCase() === query.toLowerCase()
        );
        const match = exact || list[0];
        if (!match) throw new Error("no artist");
        if (!cancelled) setName(match.name);
        return fetch(`/api/mb-albums?mbid=${match.id}`).then((r) => r.json());
      })
      .then((d) => {
        if (cancelled) return;
        const list = (d["release-groups"] || [])
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
        setAlbums(list);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const displayName = name || slug.replace(/-/g, " ");
  const span = extra && extra.span ? extra.span : null;

  return (
    <div style={{ background: PAPER, minHeight: "100vh", color: TEXT }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 140px" }}>
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
          ← The Third Listen
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
            {extra && extra.formed && (
              <span>
                FORMED <span style={{ color: TEXT }}>{extra.formed}</span>
              </span>
            )}
            {extra && extra.years && (
              <span>
                ACTIVE <span style={{ color: TEXT }}>{extra.years}</span>
              </span>
            )}
            <span>
              ALBUMS <span style={{ color: TEXT }}>{albums.length || "—"}</span>
            </span>
          </div>
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
            </div>
          </div>
        )}

        {extra && extra.members && extra.members.length > 0 && span && (
          <>
            <SectionTitle>Members</SectionTitle>
            <div style={{ marginTop: 4 }}>
              {extra.members.map((m, i) => {
                const total = span.end - span.start || 1;
                const left = ((m.from - span.start) / total) * 100;
                const width = ((m.to - m.from) / total) * 100;
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
                      <div
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10.5,
                          color: MUTED,
                        }}
                      >
                        {m.role}
                      </div>
                    </div>
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
                          left: `${left}%`,
                          width: `${Math.max(width, 2)}%`,
                          top: 0,
                          bottom: 0,
                          background: SPOT,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        flex: "0 0 92px",
                        textAlign: "right",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: MUTED,
                      }}
                    >
                      {m.from}–{m.to}
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
            Loading discography...
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
              href={`/?album=${encodeURIComponent(`${a.title}, ${displayName}`)}`}
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
