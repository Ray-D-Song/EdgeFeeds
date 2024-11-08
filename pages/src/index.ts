import { Hono } from 'hono'
import modules from './modules'
import { MODULES } from './constants'
import { validator } from 'hono/validator'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  return c.text('Tech Feeds')
})

app.route('/modules', modules)

app.get('/refresh-feeds', async (c) => {
  const res = await fetch(`${c.req.url.replace('/refresh-feeds', '')}/refresh-handler?moduleNumber=0&moduleTotal=${MODULES.length}`)
  if (!res.ok) {
    return c.json({ error: 'Failed to start tasks' }, 500)
  }
  return c.text('ok')
})

app.get('/refresh-handler', 
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
    const { moduleNumber, moduleTotal } = c.req.valid('query')
    const module = MODULES[moduleNumber]
    const res = await fetch(`${c.req.url.split('/refresh-handler')[0]}/modules/${module}/refresh?moduleNumber=${moduleNumber}&moduleTotal=${moduleTotal}`)
    if (!res.ok) {
      return c.json({ error: 'Failed to start task' }, 500)
    }
    return c.text(`task ${moduleNumber} of ${moduleTotal} started`)
  }
)

export default app
