// Cloudflare Worker entry point for serving static SPA assets
// NOTE: Add `Request` and `Response` to ESLint globals (see DEPLOYMENT_LESSONS.md)
export default {
  async fetch(request: Request, env: Record<string, unknown>): Promise<Response> {
    const assets = env.ASSETS as { fetch: (req: Request) => Promise<Response> };
    return assets.fetch(request);
  },
};
