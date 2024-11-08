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
}

function createFeedModule(opt: Options) {
  const { keyName, url, title, description, copyright, getLinksMethod } = opt

  const newModule = new Hono<{ Bindings: Bindings }>()

  newModule.get('/feed', async (c) => {
    const currentTime = new Date()
    const lastUpdate = await c.env.KV.get(`last-update-${keyName}`)
    if (!lastUpdate || currentTime.getTime() - new Date(lastUpdate).getTime() > 6 * 60 * 60 * 1000) {
      const res = await fetch(`${c.req.url.split('/feed')[0]}/refresh`)
      if (!res.ok) return c.json({ error: 'Refresh failed, please try again later' }, 500)
    }
    const rss = await c.env.KV.get(`combine-${keyName}`)
    return c.html(rss || '')
  })

  newModule.get('/refresh', async (c) => {
    const links = (await getLinksMethod()).slice(0, 5)
    const currentFeedLinks = (await c.env.KV.get(`links-${keyName}`, 'json')) as string[] || []
    const unCachedLinks = links?.filter((link) => !currentFeedLinks.some((cache) => cache === link)).slice(0, 5)

    if (unCachedLinks && unCachedLinks.length > 0) {
      for (const link of unCachedLinks) {
        const res = await fetch(`${c.env.READABLE_SCRAPE_HOST}?url=${link}`)
        if (!res.ok) continue
        const { page } = (await res.json()) as { page: RawContent }
        if (!page) continue
        await c.env.KV.put(`${keyName}-${link}`, JSON.stringify({
          id: link,
          link,
          content: page.content,
          title: page.title,
          description: page.excerpt,
          date: new Date()
        } satisfies Content))
        currentFeedLinks.unshift(link)
      }
    }
    const linksNeedCombine = currentFeedLinks.slice(0, 5)
    const res = await fetch(`${c.req.url.split('/refresh')[0]}/combine`, {
      method: 'POST',
      body: JSON.stringify(linksNeedCombine)
    })
    if (!res.ok) return c.json({ error: 'Combine failed' }, 500)
    await c.env.KV.put(`links-${keyName}`, JSON.stringify(linksNeedCombine))
    await c.env.KV.put(`last-update-${keyName}`, new Date().toISOString())
    return c.text('ok')
  })

  newModule.post('/combine', async (c) => {
    const links = await c.req.json()
    if (!links || !Array.isArray(links)) return c.json({ error: 'Links is required' }, 400)
    let contents: Content[] = []
    for (const link of links) {
      const content = await c.env.KV.get(`${keyName}-${link}`)
      if (content) {
        const parsedContent = JSON.parse(content)
        parsedContent.date = new Date(parsedContent.date)
        contents.push(parsedContent)
      }
    }
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
      feed.addItem(content)
    })
    const rss = feed.rss2()
    await c.env.KV.put(`combine-${keyName}`, rss)
    return c.text('ok')
  })

  return newModule
}

export default createFeedModule