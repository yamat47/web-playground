// Builds dist/: the index page at / and every deployable experiment under
// /<name>/. Each experiment has already been built by `pnpm -r build`; this
// only collects the outputs, so the deploy is one `aws s3 sync` of dist/.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { copyDir } from './copy.ts'
import {
  DIST_DIR,
  ROOT,
  SITE_DIR,
  isPublished,
  loadExperiments,
  type Experiment,
} from './experiments.ts'

const experiments = loadExperiments()

rmSync(DIST_DIR, { recursive: true, force: true })
mkdirSync(DIST_DIR, { recursive: true })

for (const experiment of experiments) {
  const outputDir = experiment.outputDir
  if (outputDir === null) {
    console.log(`skip    ${experiment.name} (deploy: false)`)
    continue
  }
  if (!existsSync(join(outputDir, 'index.html'))) {
    throw new Error(
      `${relative(ROOT, outputDir)}/index.html does not exist; did the experiment's build run?`,
    )
  }
  // A plain experiment publishes its own directory, minus the files that
  // describe it. A built experiment publishes its output directory as is.
  const plain = outputDir === experiment.dir
  copyDir(
    outputDir,
    join(DIST_DIR, experiment.name),
    (relativePath) => !plain || isPublished(relativePath),
  )
  console.log(`publish ${experiment.name} <- ${relative(ROOT, outputDir)}`)
}

copyDir(join(SITE_DIR, 'public'), DIST_DIR)
writeFileSync(join(DIST_DIR, 'index.html'), renderIndex(experiments))
writeFileSync(
  join(DIST_DIR, 'experiments.json'),
  JSON.stringify(publicManifest(experiments), null, 2) + '\n',
)
console.log(`index   ${experiments.length} experiment(s) -> dist/index.html`)

function renderIndex(experiments: Experiment[]): string {
  const template = readFileSync(join(SITE_DIR, 'index.html'), 'utf8')
  if (!template.includes('<!-- experiments -->')) {
    throw new Error('site/index.html must contain the <!-- experiments --> placeholder')
  }
  const items = experiments.map(renderItem).join('\n')
  const list =
    items === ''
      ? '<p class="empty">No experiments yet.</p>'
      : `<ul class="experiments">\n${items}\n</ul>`
  return template.replace('<!-- experiments -->', list)
}

function renderItem(experiment: Experiment): string {
  const title = experiment.deploy
    ? `<a href="/${experiment.name}/">${escape(experiment.title)}</a>`
    : `${escape(experiment.title)} <span class="badge">local only</span>`
  const meta = [
    `<time datetime="${experiment.date}">${experiment.date}</time>`,
    experiment.source ? `<a href="${escape(experiment.source)}" rel="noopener">source</a>` : '',
    `<a href="https://github.com/yamat47/web-playground/tree/main/experiments/${experiment.name}" rel="noopener">code</a>`,
    ...experiment.tags.map((tag) => `<span class="tag">${escape(tag)}</span>`),
  ]
    .filter(Boolean)
    .join('\n      ')
  return `  <li>
    <h2>${title}</h2>
    <p>${escape(experiment.description)}</p>
    <p class="meta">
      ${meta}
    </p>
  </li>`
}

// dist/experiments.json: the same list for machines (the e2e tests read it).
function publicManifest(experiments: Experiment[]) {
  return experiments.map(({ name, title, description, date, source, tags, deploy }) => ({
    name,
    title,
    description,
    date,
    ...(source ? { source } : {}),
    tags,
    deploy,
    ...(deploy ? { path: `/${name}/` } : {}),
  }))
}

function escape(text: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (c) => entities[c] ?? c)
}
