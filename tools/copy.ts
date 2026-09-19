// Recursive copy done file by file. Node's cpSync takes a native fast path for
// directories that also copies the directory's own attributes, which the
// bind mount inside the container refuses (EACCES); copying entries one at a
// time sidesteps that and keeps the exclusion rule in one place.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export function copyDir(
  source: string,
  target: string,
  include: (relativePath: string) => boolean = () => true,
  prefix = '',
): void {
  mkdirSync(target, { recursive: true })
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const relativePath = prefix + entry.name
    if (!include(relativePath)) continue
    if (entry.isDirectory())
      copyDir(join(source, entry.name), join(target, entry.name), include, `${relativePath}/`)
    else copyFileSync(join(source, entry.name), join(target, entry.name))
  }
}
