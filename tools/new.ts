// Scaffolds experiments/<name> from templates/<template>, replacing __NAME__
// and __DATE__ in every text file.
//
//   node tools/new.ts <name> [html|vite-react|hono]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { copyDir } from './copy.ts'
import { EXPERIMENTS_DIR, NAME_PATTERN, ROOT } from './experiments.ts'

const TEMPLATES_DIR = join(ROOT, 'templates')
const [name, template = 'html'] = process.argv.slice(2)
const templates = readdirSync(TEMPLATES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

if (name === undefined || !NAME_PATTERN.test(name)) {
  console.error(
    `usage: node tools/new.ts <name> [${templates.join('|')}]\n<name> is lowercase words joined by hyphens; it becomes the URL path /<name>/`,
  )
  process.exit(2)
}
if (!templates.includes(template)) {
  console.error(`unknown template "${template}"; available: ${templates.join(', ')}`)
  process.exit(2)
}
const target = join(EXPERIMENTS_DIR, name)
if (existsSync(target)) {
  console.error(`experiments/${name} already exists`)
  process.exit(1)
}

copyDir(join(TEMPLATES_DIR, template), target)
const today = new Date().toISOString().slice(0, 10)
for (const file of readdirSync(target, { recursive: true, withFileTypes: true })) {
  if (!file.isFile()) continue
  const path = join(file.parentPath, file.name)
  const content = readFileSync(path, 'utf8')
  const replaced = content.replaceAll('__NAME__', name).replaceAll('__DATE__', today)
  if (replaced !== content) writeFileSync(path, replaced)
}

console.log(`created experiments/${name} from templates/${template}`)
console.log(`next: edit experiments/${name}/experiment.json, then \`make dev NAME=${name}\``)
if (existsSync(join(target, 'package.json')))
  console.log('the template has dependencies: run `make install` first')
