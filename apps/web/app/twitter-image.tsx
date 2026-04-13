import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Northbridge Digital — Build. Launch. Grow.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "30%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(79,195,247,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #4FC3F7, #F5C542)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 800,
              color: "white",
            }}
          >
            NB
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              background: "linear-gradient(90deg, #4FC3F7, #F5C542)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Northbridge Digital
          </div>
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          Build. Launch. Grow.
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#9ca3af",
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          Websites, SEO, social media &amp; digital systems
        </div>
        <div
          style={{
            marginTop: 40,
            padding: "12px 28px",
            borderRadius: 999,
            background: "linear-gradient(90deg, #4FC3F7, #F5C542)",
            fontSize: 18,
            fontWeight: 600,
            color: "white",
          }}
        >
          Packages from $199/mo
        </div>
      </div>
    ),
    { ...size }
  );
}
