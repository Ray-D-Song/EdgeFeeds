import { Hono } from 'hono'
import { Feed } from 'feed'
import { validator } from 'hono/validator'
import { MODULES } from './constants'

interface Task {
  moduleName: string
  todoTasks: string[]
}

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

  newModule.get('/refresh', 
    validator('query', (value, c) => {
      if (!value.moduleNumber) {
        return c.json({ error: 'moduleNumber is required' }, 400)
      }
      if (!value.moduleTotal) {
        return c.json({ error: 'moduleTotal is required' }, 400)
      }
      if (value.moduleNumber > value.moduleTotal) {
        return c.json({ error: 'moduleNumber is greater than moduleTotal' }, 400)
      }
      return {
        moduleNumber: Number(value.moduleNumber),
        moduleTotal: Number(value.moduleTotal)
      }
    }),
    async (c) => {
      const links = await getLinksMethod()
      const cache = await c.env.KV.get(keyName, 'json')
      const moduleCache = cache ? cache as ModuleCache : []
      const unCachedLinks = links?.filter((link) => !moduleCache.some((cache) => cache.path === link)).slice(0, 5)

      if (unCachedLinks && unCachedLinks.length > 0) {
        const tasks = (await c.env.KV.get('tasks', 'json')) as Task[] || []
        const newTasks = unCachedLinks.map(linkConvertMethod)
        const updatedTasks = [...tasks, { moduleName: keyName, todoTasks: newTasks }]
        await c.env.KV.put('tasks', JSON.stringify(updatedTasks))

        // const fetchPromises = unCachedLinks.map(async (link) => {
        //   const res = await fetch(`${c.req.url.replace('/refresh', '')}/extract?link=${link}`)
        //   if (!res.ok) return null
        //   const contentKey = await res.text()
        //   return { path: link, contentKey }
        // })

        // const results = await Promise.all(fetchPromises)
        // const successfulResults = results.filter(result => result !== null)
        // const updatedCache = [...moduleCache, ...successfulResults]
        // await c.env.KV.put(keyName, JSON.stringify(updatedCache))

        const { moduleNumber, moduleTotal } = c.req.valid('query')
        const res = await fetch(`${c.req.url.replace('/refresh', '')}/extract?moduleNumber=${moduleNumber}&moduleTotal=${moduleTotal}&taskNum=0`)
        if (!res.ok) return c.json({ error: 'Extract failed' }, 500)
      }

      // const res = await fetch(`${c.req.url.replace('/refresh', '')}/combine`)
      // if (!res.ok) return c.json({ error: 'Combine failed' }, 500)

    return c.text('ok')
  })

  interface Source {
    title: string
    byline: string
    content: string
    excerpt: string
    siteName: string
  }
  newModule.get('/extract', validator('query', (value, c) => {
    if (!value.moduleNumber) return c.json({ error: 'moduleNumber is required' }, 400)
    if (!value.moduleTotal) return c.json({ error: 'moduleTotal is required' }, 400)
    if (!value.taskNum) return c.json({ error: 'taskNum is required' }, 400)
    return {
      moduleNumber: Number(value.moduleNumber),
      moduleTotal: Number(value.moduleTotal),
      taskNum: Number(value.taskNum)
    }
  }), async (c) => {
    const { moduleNumber, moduleTotal, taskNum } = c.req.valid('query')
    const tasks = (await c.env.KV.get('tasks', 'json')) as Task[] || []
    const task = tasks.find((task) => task.moduleName === keyName)
    if (!task) return c.json({ error: 'Task not found' }, 404)

    const originalLink = task.todoTasks[taskNum]
    const sourceResponse = await fetch(`${c.env.READABLE_SCRAPE_HOST}?url=${originalLink}`)
    if (!sourceResponse.ok) return c.json({ error: 'Content extraction failed' }, 404)
    const source = (await sourceResponse.json()) as {page: Source}
    if (!source.page)
      return c.json({ error: 'Content extraction failed' }, 404)
    const { page } = source
    const contentKey = crypto.randomUUID()
    await c.env.KV.put(`${keyName}-${contentKey}`, JSON.stringify({
      id: originalLink,
      link: originalLink,
      content: page.content,
      title: page.title,
      description: page.excerpt,
      date: new Date()
    }))
    if (task.todoTasks.length === taskNum + 1) {
      const res = await fetch(`${c.req.url.replace('/extract', '')}/combine?moduleNumber=${moduleNumber}&moduleTotal=${moduleTotal}`)
      if (!res.ok) return c.json({ error: 'Combine failed' }, 500)
    } else {
      const res = await fetch(`${c.req.url.replace('/extract', '')}/extract?moduleNumber=${moduleNumber}&moduleTotal=${moduleTotal}&taskNum=${taskNum + 1}`)
      if (!res.ok) return c.json({ error: 'Extract failed' }, 500)
    }
    return c.text(`${keyName}-${contentKey}`)
  })

  newModule.get('/feed', async (c) => {
    const rss = await c.env.KV.get(`feed-${keyName}`)
    return c.html(rss || '')
  })

  newModule.get('/combine', validator('query', (value, c) => {
    if (!value.moduleNumber) return c.json({ error: 'moduleNumber is required' }, 400)
    if (!value.moduleTotal) return c.json({ error: 'moduleTotal is required' }, 400)
    return {
      moduleNumber: Number(value.moduleNumber),
      moduleTotal: Number(value.moduleTotal)
    }
  }), async (c) => {
    const { moduleNumber, moduleTotal } = c.req.valid('query')
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
    if (moduleNumber === moduleTotal - 1) {
      const res = await fetch(`${c.req.url.replace('/combine', '')}/refresh-handler?moduleNumber=${moduleNumber + 1}&moduleTotal=${moduleTotal}`)
      if (!res.ok) return c.json({ error: `Refresh handler failed: ${MODULES[moduleNumber + 1]}` }, 500)
    }
    return c.text('ok')
  })

  return newModule
}

export default createFeedModule