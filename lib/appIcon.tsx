import { ImageResponse } from "next/og";

// Icône de l'appli : petite maison encre sur fond jaune, avec l'ombre rose décalée (section 9).
const house = (stroke: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M10 21v-6h4v6"/></svg>`,
  )}`;

export function appIcon(size: number, { maskable = false } = {}) {
  const glyph = Math.round(size * (maskable ? 0.5 : 0.64));
  const shift = Math.max(2, Math.round(size * 0.035));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFE14D", position: "relative" }}>
        <img src={house("#FF4F8B")} width={glyph} height={glyph} style={{ position: "absolute", left: (size - glyph) / 2 + shift, top: (size - glyph) / 2 + shift }} />
        <img src={house("#1B1B3A")} width={glyph} height={glyph} style={{ position: "absolute", left: (size - glyph) / 2, top: (size - glyph) / 2 }} />
      </div>
    ),
    { width: size, height: size },
  );
}
