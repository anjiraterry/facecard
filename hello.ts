/**
 * Neon Functions Starter Handler
 * Web-standard handler (Workers/WinterTC-compatible) executed on Node.js 24 next to Postgres
 */
export default {
  async fetch(request: Request): Promise<Response> {
    return new Response(
      JSON.stringify({
        status: "ok",
        message: "Hello from Neon Functions on Facecard",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },
};
