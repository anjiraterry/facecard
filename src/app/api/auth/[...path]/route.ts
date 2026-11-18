import { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth/server";

type RouteContext = { params: Promise<{ path: string[] }> };

async function dispatch(
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  req: NextRequest,
  ctx: RouteContext
) {
  const handlers = getAuth().handler();
  return handlers[method](req, ctx);
}

export const GET = (req: NextRequest, ctx: RouteContext) => dispatch("GET", req, ctx);
export const POST = (req: NextRequest, ctx: RouteContext) => dispatch("POST", req, ctx);
export const PUT = (req: NextRequest, ctx: RouteContext) => dispatch("PUT", req, ctx);
export const DELETE = (req: NextRequest, ctx: RouteContext) => dispatch("DELETE", req, ctx);
export const PATCH = (req: NextRequest, ctx: RouteContext) => dispatch("PATCH", req, ctx);
