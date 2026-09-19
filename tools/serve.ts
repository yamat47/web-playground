// Static file server with the same URL rules as the CloudFront Function in
// front of the S3 bucket (infra-yamat47, accounts/yamat47/aws/functions):
//
//   /                      -> /index.html
//   /name/                 -> /name/index.html
//   /name                  -> 301 to /name/ (so relative asset URLs resolve)
//   /name/deep/path        -> /name/index.html when the last segment has no
//                             extension (SPA fallback within one experiment)
//   anything else missing  -> 404 (with /404.html when it exists)
//
// Usage:
//   node tools/serve.ts dist --port 4173                 # preview the whole site
//   node tools/serve.ts experiments/foo --prefix /foo/   # one plain experiment, as it will be mounted
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: 'string', default: '5173' },
    host: { type: 'string', default: '0.0.0.0' },
    prefix: { type: 'string', default: '/' },
  },
})

const dir = positionals[0]
if (dir === undefined) {
  console.error(
    'usage: node tools/serve.ts <directory> [--port 5173] [--host 0.0.0.0] [--prefix /name/]',
  )
  process.exit(2)
}
const root = resolve(dir)
const prefix = values.prefix.endsWith('/') ? values.prefix : `${values.prefix}/`
const port = Number(values.port)

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
}

// The CloudFront Function in infra-yamat47 (functions/web-playground-router.js)
// is the same function line for line; change both.
export function resolveUri(uri: string): { uri: string } | { redirect: string } {
  if (uri.endsWith('/')) return { uri: `${uri}index.html` }
  const segments = uri.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  if (last === undefined || last.includes('.')) return { uri }
  if (segments.length === 1) return { redirect: `/${segments[0]}/` }
  return { uri: `/${segments[0]}/index.html` }
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  let uri = decodeURIComponent(url.pathname)

  // --prefix mounts the directory the way assemble.ts will: /<name>/ on the site.
  if (prefix !== '/') {
    if (uri === '/' || uri === prefix.slice(0, -1)) return redirect(response, prefix)
    if (!uri.startsWith(prefix)) return notFound(response)
    uri = uri.slice(prefix.length - 1)
  }

  const resolved = resolveUri(uri)
  if ('redirect' in resolved)
    return redirect(
      response,
      prefix === '/' ? resolved.redirect : prefix.slice(0, -1) + resolved.redirect,
    )

  const file = join(root, normalize(resolved.uri))
  if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile())
    return notFound(response)
  send(response, 200, file)
})

server.listen(port, values.host, () => {
  console.log(`serving ${root} at http://localhost:${port}${prefix}`)
})

function send(response: ServerResponse<IncomingMessage>, status: number, file: string) {
  response.writeHead(status, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  })
  createReadStream(file).pipe(response)
}

function redirect(response: ServerResponse<IncomingMessage>, location: string) {
  response.writeHead(301, { location })
  response.end()
}

function notFound(response: ServerResponse<IncomingMessage>) {
  const page = join(root, '404.html')
  if (existsSync(page)) return send(response, 404, page)
  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
  response.end('Not found\n')
}
