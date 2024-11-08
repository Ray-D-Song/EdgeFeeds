import { Hono } from "hono";
import { scrape } from "./scrape";

const app = new Hono();

app.get(
  "/",
  async (c) => {
    const url = c.req.query("url")!;
    if (!url || url.length === 0)
      return c.json({ page: null, error: 'url is required' })
    try {
      const page = await scrape({ url });
      return c.json({ page });
    } catch (e) {
      if (e instanceof Error) {
        return c.json({ page: null, error: e.message });
      } else {
        return c.json({ page: null, error: "An unknown error occurred" });
      }
    }
  }
)

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: {
    FEED_HOST: string
  }, ctx: ExecutionContext) {
    ctx.waitUntil(fetch(env.FEED_HOST))
  }
}
