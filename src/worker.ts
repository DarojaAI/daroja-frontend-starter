// Cloudflare Worker entry point for serving static SPA assets
/* eslint-env serviceworker */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
