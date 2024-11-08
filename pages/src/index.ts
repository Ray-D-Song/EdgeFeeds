import { Hono } from 'hono'
import modules from './modules'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  return c.text('Tech Feeds')
})

app.route('/modules', modules)

export default app
