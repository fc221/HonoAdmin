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

// 位置白名单：apps/*/src 下的源码文件必须命中其一；放错位置无条件 fail（不依赖 --strict）。
const placementScope = /^apps\/(?:server|console)\/src\//

const allowedPlacements: RegExp[] = [
  // server 根
  /^apps\/server\/src\/(?:app\.ts|hono-context\.d\.ts)$/,
  // api：组合入口 + 纯聚合 barrel
  /^apps\/server\/src\/api\/(?:index|menu|openapi|schema)\.ts$/,
  /^apps\/server\/src\/api\/shared\/[\w-]+\.ts$/,
  /^apps\/server\/src\/api\/(?:auth|install)\/(?:index|schema)\.ts$/,
  /^apps\/server\/src\/api\/user\/index\.ts$/,
  /^apps\/server\/src\/api\/user\/profile\/(?:index|schema)\.ts$/,
  /^apps\/server\/src\/api\/admin\/index\.ts$/,
  // admin 资源：默认平铺 <name>.ts；仅有专属 schema 时才 <name>/{index,schema}.ts
  /^apps\/server\/src\/api\/admin\/(?:system|web)\/(?:[\w-]+\.ts|[\w-]+\/(?:index|schema)\.ts)$/,
  /^apps\/server\/src\/entry\/[\w-]+\.ts$/,
  /^apps\/server\/src\/migrations\/(?:migrator|registry|types)\.ts$/,
  /^apps\/server\/src\/migrations\/(?:mysql|pg|sqlite)\/[\w-]+\.ts$/,
  /^apps\/server\/src\/public\/[\w-]+\.ts$/,
  /^apps\/server\/src\/service\/types\.ts$/,
  /^apps\/server\/src\/service\/common\/[\w-]+\.ts$/,
  // 业务域允许深层 feature 目录
  /^apps\/server\/src\/service\/(?:admin|user)\//,
  /^apps\/server\/src\/service\/system\/(?:middleware|security|statistics)\/[\w-]+\.ts$/,
  /^apps\/server\/src\/utils\/[\w-]+\.ts$/,
  // console
  /^apps\/console\/src\/(?:App\.vue|main\.ts|env\.d\.ts)$/,
  /^apps\/console\/src\/api\/client\.ts$/,
  /^apps\/console\/src\/components\//,
  /^apps\/console\/src\/composables\/[\w-]+\.ts$/,
  /^apps\/console\/src\/(?:icons|router|stores)\/[\w-]+\.ts$/,
  /^apps\/console\/src\/styles\//,
  /^apps\/console\/src\/views\/.+\.vue$/,
]

// api/schema.ts 与 api/menu.ts 是纯聚合 barrel，禁止在其中定义 schema 或引入 zod。
const pureBarrelFiles = new Set(['apps/server/src/api/menu.ts', 'apps/server/src/api/schema.ts'])

function main() {
  const files = getFilesToCheck()

  const placementViolations = findPlacementViolations(files)
  if (placementViolations.length > 0) {
    for (const violation of placementViolations) {
      console.error(violation)
    }
    console.error(`[agent-structure] ${placementViolations.length} placement violation(s).`)
    process.exit(1)
  }

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

function findPlacementViolations(files: string[]): string[] {
  const violations: string[] = []
  for (const file of files) {
    if (placementScope.test(file) && !allowedPlacements.some((pattern) => pattern.test(file))) {
      violations.push(`PLACEMENT ${file}: 不在允许的位置，参见 AGENTS.md 目录地图`)
    }
    if (pureBarrelFiles.has(file) && (/from 'zod'/).test(readFileSync(file, 'utf8'))) {
      violations.push(`PLACEMENT ${file}: 这两个文件是纯聚合 barrel，禁止定义 schema/引入 zod`)
    }
  }
  return violations
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
