import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Platform Foundation (Step 1.1)", () => {
  const rootDir = process.cwd();

  it("should have wrangler.jsonc with compatibility_date >= 2025-05-05 and nodejs_compat", () => {
    const wranglerPath = path.join(rootDir, "wrangler.jsonc");
    expect(fs.existsSync(wranglerPath)).toBe(true);
    
    const content = fs.readFileSync(wranglerPath, "utf-8");
    // Strip comments for JSON parsing
    const cleanedJson = content.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const config = JSON.parse(cleanedJson);

    expect(config.compatibility_flags).toContain("nodejs_compat");
    
    const [year, month, day] = config.compatibility_date.split("-").map(Number);
    const dateNum = year * 10000 + month * 100 + day;
    expect(dateNum).toBeGreaterThanOrEqual(20250505);
  });

  it("should have open-next.config.ts configured", () => {
    const openNextPath = path.join(rootDir, "open-next.config.ts");
    expect(fs.existsSync(openNextPath)).toBe(true);
    const content = fs.readFileSync(openNextPath, "utf-8");
    expect(content).toContain("@opennextjs/cloudflare");
  });

  it("should enforce NO Node.js middleware per Cloudflare Workers architecture", () => {
    const middlewarePaths = [
      path.join(rootDir, "src", "middleware.ts"),
      path.join(rootDir, "src", "middleware.js"),
      path.join(rootDir, "src", "proxy.ts"),
      path.join(rootDir, "middleware.ts"),
      path.join(rootDir, "middleware.js"),
    ];

    for (const p of middlewarePaths) {
      expect(fs.existsSync(p), `Found forbidden middleware at ${p}`).toBe(false);
    }
  });

  it("should configure next.config.ts with unoptimized images for Cloudflare Workers", () => {
    const nextConfigPath = path.join(rootDir, "next.config.ts");
    expect(fs.existsSync(nextConfigPath)).toBe(true);
    const content = fs.readFileSync(nextConfigPath, "utf-8");
    expect(content).toContain("unoptimized: true");
  });
});
