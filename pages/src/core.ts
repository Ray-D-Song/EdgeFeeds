import { Hono } from 'hono'
import { Feed } from 'feed'

interface Options {
  /**
   * for example: shopify
   * cache key: shopify
   * content key: shopify-${uuid}
   * feed key: feed-shopify
   * 
   */
  keyName: string

  url: string

  title: string

  description: string

  copyright: string

  getLinksMethod: () => Promise<string[]>

  linkConvertMethod: (link: string) => string
}

function createFeedModule(opt: Options) {
  const { keyName, url, title, description, copyright, getLinksMethod, linkConvertMethod } = opt

  const newModule = new Hono<{ Bindings: Bindings }>()

  newModule.get('/refresh', async (c) => {
    const links = await getLinksMethod()
    const cache = await c.env.KV.get(keyName, 'json')
    const moduleCache = cache ? cache as ModuleCache : []
    const unCachedLinks = links?.filter((link) => !moduleCache.some((cache) => cache.path === link)).slice(0, 5)

    if (unCachedLinks && unCachedLinks.length > 0) {
      const fetchPromises = unCachedLinks.map(async (link) => {
        const res = await fetch(`${c.req.url.replace('/refresh', '')}/extract?link=${link}`)
        if (!res.ok) return null
        const contentKey = await res.text()
        return { path: link, contentKey }
      })

      const results = await Promise.all(fetchPromises)
      const successfulResults = results.filter(result => result !== null)
      const updatedCache = [...moduleCache, ...successfulResults]
      await c.env.KV.put(keyName, JSON.stringify(updatedCache))
    }

    const res = await fetch(`${c.req.url.replace('/refresh', '')}/combine`)
    if (!res.ok) return c.json({ error: 'Combine failed' }, 500)

    return c.text('ok')
  })

  interface Source {
    title: string
    byline: string
    content: string
    excerpt: string
    siteName: string
  }
  newModule.get('/extract', async (c) => {
    const link = c.req.query('link')
    if (!link) return c.json({ error: 'Link is required' }, 400)
    const originalLink = linkConvertMethod(link)
    const sourceResponse = await fetch(`${c.env.READABLE_SCRAPE_HOST}?url=${originalLink}`)
    if (!sourceResponse.ok) return c.json({ error: 'Content extraction failed' }, 404)
    const source = (await sourceResponse.json()) as {page: Source}
    if (!source.page)
      return c.json({ error: 'Content extraction failed' }, 404)
    const { page } = source
    const contentKey = crypto.randomUUID()
    await c.env.KV.put(`${keyName}-${contentKey}`, JSON.stringify({
      id: link,
      link: originalLink,
      content: page.content,
      title: page.title,
      description: page.excerpt,
      date: new Date()
    }))
    return c.text(`${keyName}-${contentKey}`)
  })

  newModule.get('/feed', async (c) => {
    const rss = await c.env.KV.get(`feed-${keyName}`)
    return c.html(rss || '')
  })

  newModule.get('/combine', async (c) => {
    const list = await c.env.KV.list({
      prefix: `${keyName}-`,
      limit: 5
    })
    const tasks = list.keys.map(async (key) => {
      const content = await c.env.KV.get(key.name)
      return content ? JSON.parse(content) : null
    })
    const contents = await Promise.all(tasks)
    const feed = new Feed({
      title,
      description,
      id: url,
      link: url,
      copyright,
      updated: new Date(),
      feedLinks: {
        rss: `${c.req.url.replace('/combine', '')}/feed`
      }
    })
    contents.forEach((content) => {
      feed.addItem({
        ...content,
        date: new Date(content.date)
      })
    })
    const rss = feed.rss2()
    await c.env.KV.put(`feed-${keyName}`, rss)
    return c.text('ok')
  })

  return newModule
}

export default createFeedModule