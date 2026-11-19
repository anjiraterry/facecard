import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(),
}));

const mockAggregate = vi.fn();
const mockUserFindUnique = vi.fn();
const mockSavedFindMany = vi.fn();
const mockSavedFindFirst = vi.fn();
const mockSavedCreate = vi.fn();
const mockSavedFindUnique = vi.fn();
const mockSavedUpdate = vi.fn();
const mockSavedDelete = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    scan: { aggregate: (...args: unknown[]) => mockAggregate(...args) },
    savedScan: {
      findMany: (...args: unknown[]) => mockSavedFindMany(...args),
      findFirst: (...args: unknown[]) => mockSavedFindFirst(...args),
      create: (...args: unknown[]) => mockSavedCreate(...args),
      findUnique: (...args: unknown[]) => mockSavedFindUnique(...args),
      update: (...args: unknown[]) => mockSavedUpdate(...args),
      delete: (...args: unknown[]) => mockSavedDelete(...args),
    },
  },
}));

import { getSessionUser } from "@/lib/auth/session";
import { GET as getCard } from "@/app/api/card/route";
import { GET as getSavedScans, POST as saveScan } from "@/app/api/scans/saved/route";
import { PATCH as patchSavedScan, DELETE as deleteSavedScan } from "@/app/api/scans/saved/[id]/route";

describe("Harmony Index & Saved Gallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSessionUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
    });
  });

  it("computes Harmony Index as the average of all scored scans and keeps active tier card in sync", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      handle: "amara",
      tier: "CLASSIC",
      lifetimePoints: 400,
      spendableBalance: 400,
      avatarUrl: null,
      streak: { currentCount: 2 },
      cards: [{ equippedSkin: null, equippedTitle: null, equippedFrame: null }],
      scans: [{ score: 92, band: "LETHAL", categoryScores: { photoCraft: 90, harmony: 88, skinClarity: 85, aura: 91 } }],
    });
    // Average of e.g. 70, 82, 92 -> 81.333 -> 81
    mockAggregate.mockResolvedValue({ _avg: { score: 81.333 }, _count: { id: 3 } });

    const req = new NextRequest("http://localhost/api/card");
    const res = await getCard(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.activeCard.score).toBe(81);
    const classicTier = body.tiers.find((t: { tier: string }) => t.tier === "CLASSIC");
    expect(classicTier.status).toBe("ACTIVE");
    expect(classicTier.card.score).toBe(body.activeCard.score);
  });

  it("saves a scan to gallery and lists saved scans", async () => {
    mockSavedFindFirst.mockResolvedValue(null);
    mockSavedCreate.mockResolvedValue({
      id: "saved-1",
      scanId: "11111111-1111-4111-8111-111111111111",
      score: 86,
      band: "DANGEROUS",
      tier: "GOLD",
      verdictLine: "High-impact aura.",
      categoryScores: null,
      imageDataUrl: "data:image/jpeg;base64,/9j/4AAQ",
      caption: null,
      isFavorite: false,
      createdAt: new Date("2026-11-19T12:00:00.000Z"),
    });

    const postReq = new NextRequest("http://localhost/api/scans/saved", {
      method: "POST",
      body: JSON.stringify({
        scanId: "11111111-1111-4111-8111-111111111111",
        score: 86,
        band: "DANGEROUS",
        tier: "GOLD",
        verdictLine: "High-impact aura.",
        imageDataUrl: "data:image/jpeg;base64,/9j/4AAQ",
      }),
    });
    const postRes = await saveScan(postReq);
    expect(postRes.status).toBe(201);
    const postBody = await postRes.json();
    expect(postBody.item.id).toBe("saved-1");

    mockSavedFindMany.mockResolvedValue([
      {
        id: "saved-1",
        scanId: "11111111-1111-4111-8111-111111111111",
        score: 86,
        band: "DANGEROUS",
        tier: "GOLD",
        verdictLine: "High-impact aura.",
        categoryScores: null,
        imageDataUrl: "data:image/jpeg;base64,/9j/4AAQ",
        caption: null,
        isFavorite: false,
        createdAt: new Date("2026-11-19T12:00:00.000Z"),
      },
    ]);
    const getRes = await getSavedScans();
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.items).toHaveLength(1);
    expect(getBody.items[0].score).toBe(86);
  });

  it("toggles favorite and deletes saved scan for owner only", async () => {
    mockSavedFindUnique.mockResolvedValue({ id: "saved-1", userId: "user-1" });
    mockSavedUpdate.mockResolvedValue({
      id: "saved-1",
      scanId: null,
      score: 86,
      band: "DANGEROUS",
      tier: "GOLD",
      verdictLine: null,
      categoryScores: null,
      imageDataUrl: "data:image/jpeg;base64,/9j/4AAQ",
      caption: null,
      isFavorite: true,
      createdAt: new Date("2026-11-19T12:00:00.000Z"),
    });

    const patchRes = await patchSavedScan(
      new NextRequest("http://localhost/api/scans/saved/saved-1", {
        method: "PATCH",
        body: JSON.stringify({ isFavorite: true }),
      }),
      { params: Promise.resolve({ id: "saved-1" }) }
    );
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.item.isFavorite).toBe(true);

    mockSavedDelete.mockResolvedValue({ id: "saved-1" });
    const delRes = await deleteSavedScan(
      new NextRequest("http://localhost/api/scans/saved/saved-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "saved-1" }) }
    );
    expect(delRes.status).toBe(200);
  });
});
