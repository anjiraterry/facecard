import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(),
}));

const mockCount = vi.fn();
const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockUpdateMany = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    notification: {
      count: (...args: unknown[]) => mockCount(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

import { getSessionUser } from "@/lib/auth/session";
import { GET as getNotifications } from "@/app/api/notifications/route";
import { POST as markRead } from "@/app/api/notifications/read/route";

describe("Notifications Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSessionUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
    });
  });

  it("seeds welcome notification on first fetch and returns unreadCount", async () => {
    mockCount.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    mockCreate.mockResolvedValue({ id: "notif-welcome" });
    mockFindMany.mockResolvedValue([
      {
        id: "notif-welcome",
        type: "SYSTEM",
        title: "Welcome to Face Card",
        body: "You receive 3 free daily portrait scans every day at 00:00 WAT.",
        href: "/scan",
        metadata: null,
        readAt: null,
        createdAt: new Date("2026-11-19T12:00:00.000Z"),
      },
    ]);

    const res = await getNotifications(new NextRequest("http://localhost/api/notifications"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.unreadCount).toBe(1);
    expect(body.notifications[0].title).toBe("Welcome to Face Card");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("marks all notifications as read and returns unreadCount = 0", async () => {
    mockUpdateMany.mockResolvedValue({ count: 2 });
    mockCount.mockResolvedValue(0);

    const res = await markRead(
      new NextRequest("http://localhost/api/notifications/read", {
        method: "POST",
        body: JSON.stringify({ all: true }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.unreadCount).toBe(0);
    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
  });
});
