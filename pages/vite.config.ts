import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig, Plugin } from 'vite'
import { readdirSync, writeFileSync } from 'node:fs'

const generateModules: Plugin = {
  name: 'generate-modules',
  buildStart() {
    const modules = readdirSync('./src/modules')
      .filter((module) => module !== 'index.ts')
      .map((module) => module.replace('.ts', ''))
    writeFileSync('./src/constants.ts', `export const MODULES = ${JSON.stringify(modules)}`)

    // generate modules/index.ts
    const indexContent = `import { Hono } from 'hono'
${modules.map((module) => `import ${module} from './${module}'`).join('\n')}

const modules = new Hono()

${modules.map((module) => `modules.route('/${module}', ${module})`).join('\n')}

export default modules
`
    writeFileSync('./src/modules/index.ts', indexContent)
  },
  writeBundle() {
    if (process.env.NODE_ENV === 'production') {
      writeFileSync('../dist/pages/wrangler.toml', `name = "edge-feeds"

pages_build_output_dir = "."

compatibility_date = "2024-11-06"
compatibility_flags = [ "nodejs_compat" ]

[[kv_namespaces]]
binding = "KV"
id = "xxx"

[vars]
READABLE_SCRAPE_HOST = "READABLE-SCRAPE-HOST-SLOT"
`)
    }
  }
}

export default defineConfig({
  plugins: [
    generateModules,
    build({
      minify: false,
      outputDir: '../dist/pages',
    }),
    devServer({
      adapter,
      entry: 'src/index.ts'
    })
  ]
})
