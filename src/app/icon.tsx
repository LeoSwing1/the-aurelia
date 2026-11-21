import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#20372d", color: "#d9c08a", fontSize: 340, fontFamily: "serif", borderRadius: 96 }}>A</div>
    ),
    size,
  );
}
