// A server experiment. It runs locally with `make dev NAME=__NAME__`; the site
// only publishes static files, so experiment.json says "deploy": false.
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono().basePath('/__NAME__')

app.get('/', (c) => c.text('Hello from __NAME__'))
app.get('/api/time', (c) => c.json({ now: new Date().toISOString() }))

serve({ fetch: app.fetch, hostname: '0.0.0.0', port: 5173 }, (info) => {
  console.log(`listening on http://localhost:${info.port}/__NAME__/`)
})
