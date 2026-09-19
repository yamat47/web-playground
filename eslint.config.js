// Lints the repository's own scripts (tools/, e2e/). Experiments bring their
// own eslint config when they need one; a plain HTML experiment has nothing
// to lint.
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/', 'experiments/', 'templates/', 'e2e/test-results/', 'e2e/playwright-report/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
)
