import { ImageResponse } from "next/og";

export const alt = "The Aurelia Hotel & Resort: stays, weddings, banquets and events";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand share card used as og:image and twitter:image on every page (file-based metadata).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "linear-gradient(135deg, #20372d 0%, #2f4f41 55%, #16261f 100%)", color: "#f4efe4", fontFamily: "serif" }}>
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 8, color: "#d9c08a" }}>HOTEL · RESORT · CELEBRATIONS</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 112, lineHeight: 1, letterSpacing: -2 }}>The Aurelia</div>
          <div style={{ marginTop: 24, fontSize: 38, fontStyle: "italic", color: "#e8dcc2" }}>Considered stays. Meaningful gatherings.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#d9c08a", letterSpacing: 4 }}>
          <span>ROOMS</span><span>WEDDINGS</span><span>BANQUETS</span><span>MEETINGS</span><span>FACILITIES</span>
        </div>
      </div>
    ),
    size,
  );
}
