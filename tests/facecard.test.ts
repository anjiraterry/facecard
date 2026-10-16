import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("FaceCard Component (Phase 2)", () => {
  const faceCardPath = path.join(process.cwd(), "src", "components", "card", "FaceCard.tsx");

  it("should exist and contain modern avatar and 3D tilt perspective", () => {
    expect(fs.existsSync(faceCardPath)).toBe(true);
    const content = fs.readFileSync(faceCardPath, "utf-8");

    // Cardholder verification
    expect(content).toContain("card.cardholderName");

    // 3D Tilt perspective verification
    expect(content).toContain("perspective: 1000");
    expect(content).toContain("useMotionValue");
    expect(content).toContain("useSpring");
    expect(content).toContain("useTransform");
    expect(content).toContain("transformStyle: 'preserve-3d'");
  });

  it("should preserve the 4 tier finishes and Black Card specular sheen", () => {
    const content = fs.readFileSync(faceCardPath, "utf-8");
    expect(content).toContain("CLASSIC");
    expect(content).toContain("GOLD");
    expect(content).toContain("PLATINUM");
    expect(content).toContain("BLACK");
    expect(content).toContain("animation: 'sheen 6s ease-in-out infinite'");
  });
});
