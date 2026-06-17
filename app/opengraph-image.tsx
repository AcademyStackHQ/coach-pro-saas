import { ImageResponse } from "next/og"

export const alt = "CoachPro — Academy Management Software"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0b1220 0%, #1d4ed8 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
          <span style={{ color: "#93c5fd" }}>Coach</span>
          <span>Pro</span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          Run your academy from one place
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 32,
            color: "#cbd5e1",
            maxWidth: 820,
          }}
        >
          Enrolments, scheduling, fees and parent communication — all in one
          place.
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 48,
            fontSize: 24,
            color: "#93c5fd",
          }}
        >
          <span>Free to start</span>
          <span>·</span>
          <span>coachpro.in</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
