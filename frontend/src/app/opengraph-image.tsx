import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Bella Roma Pizzaria";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#111111",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div style={{ fontSize: 140, lineHeight: 1 }}>🍕</div>
        <div
          style={{
            color: "#FF8400",
            fontSize: 80,
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          Bella Roma
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 32,
          }}
        >
          O sabor da Itália em sua mesa
        </div>
      </div>
    ),
    { ...size }
  );
}
