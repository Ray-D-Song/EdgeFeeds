import { Hono } from 'hono'
import gitlab from './gitlab'
import notion from './notion'
import reactNative from './reactNative'
import shopify from './shopify'

const modules = new Hono()

modules.route('/gitlab', gitlab)
modules.route('/notion', notion)
modules.route('/reactNative', reactNative)
modules.route('/shopify', shopify)

export default modules
