import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'

interface FileRule {
  advice: string
  failAt: number
  name: string
  pattern: RegExp
  warnAt: number
}

interface FileReport {
  advice: string
  failAt: number
  file: string
  lines: number
  rule: string
  warnAt: number
}

const args = new Set(process.argv.slice(2))
const checkAll = args.has('--all')
const strict = args.has('--strict')

const rules: FileRule[] = [
  {
    name: 'console page',
    pattern: /^apps\/console\/src\/pages\/.*\.vue$/,
    warnAt: 320,
    failAt: 560,
    advice: 'Keep Vue pages focused on data loading and composition; move reusable layout/widgets into apps/console/src/components or layout.',
  },
  {
    name: 'console app entry',
    pattern: /^apps\/console\/src\/(?:App|main)\.(?:ts|vue)$/,
    warnAt: 260,
    failAt: 420,
    advice: 'Keep app shell logic small; move reusable layout and state behavior into apps/console/src/components, layout, theme, or stores.',
  },
  {
    name: 'server api module',
    pattern: /^apps\/server\/src\/api\/.*\.ts$/,
    warnAt: 320,
    failAt: 560,
    advice: 'Split API registration by surface and feature; move business rules into services.',
  },
  {
    name: 'server service public surface',
    pattern: /^apps\/server\/src\/service\/.*\/index\.ts$/,
    warnAt: 420,
    failAt: 720,
    advice: 'Keep service index files as public APIs; split query, mapping, and mutation helpers.',
  },
  {
    name: 'migration',
    pattern: /^apps\/server\/src\/migrations\/.*\.ts$/,
    warnAt: 1200,
    failAt: 2000,
    advice: 'Large migrations are acceptable for seed catalogs, but keep schema changes deterministic and append-only.',
  },
  {
    name: 'console shared Vue component',
    pattern: /^apps\/console\/src\/(?:components|layout|theme)\/.*\.vue$/,
    warnAt: 340,
    failAt: 580,
    advice: 'Keep shared UI components composable; move feature-specific behavior into app pages.',
  },
  {
    name: 'script',
    pattern: /^scripts\/.*\.ts$/,
    warnAt: 1000,
    failAt: 1600,
    advice: 'Large scripts should be split when they mix parsing, generation, and filesystem writes.',
  },
]

function main() {
  const files = getFilesToCheck()
  const reports = files.map(createReport).filter((report): report is FileReport => report !== null)
  const warnings = reports.filter((report) => report.lines > report.warnAt)
  const failures = reports.filter((report) => report.lines > report.failAt)

  console.log(`[agent-structure] checked ${reports.length} source file(s)${checkAll ? ' from git ls-files' : ' changed from HEAD'}.`)

  if (warnings.length === 0) {
    console.log('[agent-structure] no large-file responsibility warnings.')
    return
  }

  console.log('')
  console.log('[agent-structure] responsibility warnings:')
  for (const report of warnings.sort((left, right) => right.lines - left.lines)) {
    const marker = report.lines > report.failAt ? 'FAIL' : 'WARN'
    console.log(`- ${marker} ${report.file}: ${report.lines} lines (${report.rule}, warn>${report.warnAt}, fail>${report.failAt})`)
    console.log(`  ${report.advice}`)
  }

  if (failures.length > 0 && strict) {
    console.error('')
    console.error(`[agent-structure] ${failures.length} file(s) exceed strict failure thresholds.`)
    process.exit(1)
  }

  if (failures.length > 0) {
    console.log('')
    console.log('[agent-structure] strict mode would fail. Use --strict after splitting or documenting the exception.')
  }
}

function getFilesToCheck(): string[] {
  const files = checkAll
    ? gitLines(['ls-files'])
    : [
        ...gitLines(['diff', '--name-only', '--diff-filter=ACMRT', 'HEAD', '--']),
        ...gitLines(['ls-files', '--others', '--exclude-standard']),
      ]

  return Array.from(new Set(files))
    .filter(isSourceFile)
    .filter((file) => existsSync(file) && statSync(file).isFile())
    .sort()
}

function createReport(file: string): FileReport | null {
  const rule = getRule(file)
  if (!rule) {
    return null
  }

  const content = readFileSync(file, 'utf8')
  const lines = content.length === 0 ? 0 : content.split('\n').length

  return {
    advice: rule.advice,
    failAt: rule.failAt,
    file,
    lines,
    rule: rule.name,
    warnAt: rule.warnAt,
  }
}

function getRule(file: string): FileRule | null {
  return rules.find((rule) => rule.pattern.test(file)) ?? {
    name: 'source file',
    pattern: /.*/,
    warnAt: 360,
    failAt: 650,
    advice: 'Check whether this file still has one obvious responsibility.',
  }
}

function isSourceFile(file: string): boolean {
  if (!(file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.vue'))) {
    return false
  }
  if (file.endsWith('.d.ts')) {
    return false
  }
  return (
    file.startsWith('apps/')
    || file.startsWith('packages/')
    || file.startsWith('scripts/')
  )
}

function gitLines(args: string[]): string[] {
  const output = execFileSync('git', args, { encoding: 'utf8' })
  return output.split('\n').map((line) => line.trim()).filter(Boolean)
}

main()
