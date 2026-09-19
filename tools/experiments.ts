// The experiment contract: what experiments/<name>/experiment.json must
// contain and how an experiment's published files are located. Everything
// else in tools/ builds on this.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const ROOT = resolve(import.meta.dirname, '..')
export const EXPERIMENTS_DIR = join(ROOT, 'experiments')
export const SITE_DIR = join(ROOT, 'site')
export const DIST_DIR = join(ROOT, 'dist')

// Lowercase words joined by single hyphens: the name is the URL path.
export const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export type Experiment = {
  name: string
  title: string
  description: string
  /** ISO date (YYYY-MM-DD) the experiment was started. Newest first on the index page. */
  date: string
  /** Article or spec the experiment tries out, when there is one. */
  source?: string
  tags: string[]
  /** false keeps the experiment local-only (a server, for example); the index page still lists it. */
  deploy: boolean
  /** Directory of the experiment. */
  dir: string
  /** Directory whose files are published under /<name>/, or null when deploy is false. */
  outputDir: string | null
}

// Files at the top level of a plain (build-less) experiment that describe it
// rather than belong to it.
const NOT_PUBLISHED = new Set(['experiment.json', 'README.md', 'node_modules', 'package.json'])

export function isPublished(relativePath: string): boolean {
  return relativePath.includes('/') || !NOT_PUBLISHED.has(relativePath)
}

export function loadExperiments(): Experiment[] {
  if (!existsSync(EXPERIMENTS_DIR)) return []
  const names = readdirSync(EXPERIMENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  return names
    .map(loadExperiment)
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name))
}

export function loadExperiment(name: string): Experiment {
  const dir = join(EXPERIMENTS_DIR, name)
  const manifestPath = join(dir, 'experiment.json')
  if (!NAME_PATTERN.test(name)) {
    throw new Error(
      `experiments/${name}: the directory name must match ${NAME_PATTERN} (it becomes the URL path)`,
    )
  }
  if (!existsSync(manifestPath)) {
    throw new Error(`experiments/${name}: experiment.json is missing`)
  }
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const fields = validate(name, manifest)
  const hasBuild = existsSync(join(dir, 'package.json'))
  const outputDir = fields.deploy ? join(dir, fields.output ?? (hasBuild ? 'dist' : '.')) : null
  return { name, ...fields, dir, outputDir }
}

type ManifestFields = Pick<
  Experiment,
  'title' | 'description' | 'date' | 'source' | 'tags' | 'deploy'
> & {
  output?: string
}

function validate(name: string, manifest: unknown): ManifestFields {
  const fail = (message: string): never => {
    throw new Error(`experiments/${name}/experiment.json: ${message}`)
  }
  if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest))
    fail('must be a JSON object')
  const record = manifest as Record<string, unknown>

  const string = (key: string): string => {
    const value = record[key]
    if (typeof value !== 'string' || value.trim() === '')
      fail(`"${key}" must be a non-empty string`)
    return value as string
  }

  const title = string('title')
  const description = string('description')
  const date = string('date')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))
    fail('"date" must be YYYY-MM-DD')

  const tags = record['tags'] ?? []
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string'))
    fail('"tags" must be an array of strings')

  const deploy = record['deploy'] ?? true
  if (typeof deploy !== 'boolean') fail('"deploy" must be a boolean')

  const fields: ManifestFields = {
    title,
    description,
    date,
    tags: tags as string[],
    deploy: deploy as boolean,
  }

  if (record['source'] !== undefined) {
    const source = string('source')
    if (!URL.canParse(source)) fail('"source" must be a URL')
    fields.source = source
  }
  if (record['output'] !== undefined) fields.output = string('output')

  const known = new Set(['title', 'description', 'date', 'source', 'tags', 'deploy', 'output'])
  for (const key of Object.keys(record)) if (!known.has(key)) fail(`unknown field "${key}"`)

  return fields
}
