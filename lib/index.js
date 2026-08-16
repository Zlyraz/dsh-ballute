/**
 * dsh-ballute（Ballute 气囊）宿主端。
 *
 * 路由（前缀 /api/ballute，仅限本机同源）：
 *   GET  /api/ballute/v1/state          自检状态 + 可体检的第三方模块清单
 *   POST /api/ballute/v1/disable        { module } 按包名停用插件（M1 崩卡一键发声）
 *   GET  /api/ballute/v1/inspect        ?module=包名 | ?fixture=夹具名 静态契约体检（M2 预检）
 *   POST /api/ballute/v1/crash          崩溃遥测上报 → $DSH_HOME/ballute/crash-log.jsonl（M3 黑匣子）
 *   GET  /api/ballute/v1/crashes        ?limit=N&plugin=X 崩溃历史（最新在前，每请求重读）
 *
 * 补丁写入工艺复用自 dsh-workshop：stripEmptyArray + 原子写 + 串行队列。
 * 归因链：client 侧 entry.registrant = 注册 fiber 名 = 包名（boot.tsx 以
 * manifest row id = 包名建 loader entry），host 侧按 options.name 反查行 id。
 */
import { readFile, writeFile, rename, realpath, mkdir, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-ballute'
export const inject = ['webServer', 'loader']

const ROUTE_PREFIX = '/api/ballute'
const SELF_ROW = 'ballute'
const SELF_NAME = 'dsh-ballute'

/** 宿主基础设施行：停用会连带破坏运行链，禁止开关（复用工坊名单）。 */
const PROTECTED_MODULE_PATTERNS = [
  /^cordis:/u,
  /^@deepseek-ai\/cordis-plugin-/u,
  /^@deepseek-ai\/dsh-host-/u,
  /^@deepseek-ai\/dsh-client-modules$/u,
  /^@deepseek-ai\/dsh-client-connection$/u,
  /^@deepseek-ai\/dsh-client-hmr$/u,
  /^@deepseek-ai\/dsh-client-runtime$/u,
  /^@deepseek-ai\/dsh-client-locale$/u,
  /^@deepseek-ai\/dsh-client-web/u,
  /^@deepseek-ai\/dsh-web-frontend$/u,
  /^@deepseek-ai\/dsh-web-app$/u,
  /^@deepseek-ai\/dsh-settings/u,
  /^@deepseek-ai\/dsh-credentials$/u,
  /^@deepseek-ai\/dsh-session/u,
  /^@deepseek-ai\/dsh-storage/u,
  /^@deepseek-ai\/dsh-typert/u,
  /^@deepseek-ai\/dsh-api-remotes$/u,
  /^@deepseek-ai\/dsh-tools$/u,
  /^@deepseek-ai\/dsh-system-prompt$/u,
  /^@deepseek-ai\/dsh-agent/u,
  /^@deepseek-ai\/dsh-llm$/u,
  /^@deepseek-ai\/dsh-persona$/u,
  /^@deepseek-ai\/dsh-scope$/u,
  /^@deepseek-ai\/dsh-launch-environment$/u,
  /^@deepseek-ai\/dsh-shell$/u,
  /^@deepseek-ai\/dsh-subprocess/u,
  /^@deepseek-ai\/dsh-fs$/u,
  /^@deepseek-ai\/dsh-sandbox/u,
  /^@deepseek-ai\/dsh-jobs/u,
  /^@deepseek-ai\/dsh-skill/u,
  /^@deepseek-ai\/dsh-goal$/u,
  /^@deepseek-ai\/dsh-workflow$/u,
  /^@deepseek-ai\/dsh-subagent/u,
  /^@deepseek-ai\/dsh-web$/u,
  /^@deepseek-ai\/dsh-workspace/u,
  /^@deepseek-ai\/dsh-user-approval$/u,
  /^@deepseek-ai\/dsh-user-questions$/u,
  /^@deepseek-ai\/dsh-commands$/u,
  /^@deepseek-ai\/dsh-hook/u,
  /^@deepseek-ai\/dsh-spill$/u,
  /^@deepseek-ai\/dsh-guard$/u,
  /^@deepseek-ai\/dsh-tool-call-timeout-policy$/u,
  /^@deepseek-ai\/dsh-repeat-tool-reminder$/u,
]

function isProtectedModule(moduleName) {
  return typeof moduleName === 'string' && PROTECTED_MODULE_PATTERNS.some((p) => p.test(moduleName))
}

function dshHome() {
  return process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
}

function defaultPatchPath() {
  return join(dshHome(), 'profiles', 'web', 'cordis.patch.yml')
}

/** 从 loader 树推导 profile 的 cordis.patch.yml 绝对路径。 */
function findPatchPath(ctx) {
  for (const entry of ctx.loader.entries()) {
    const cfg = entry.options?.config
    if (entry.options?.name !== 'cordis:include' || cfg == null || typeof cfg.path !== 'string') continue
    if (!cfg.path.includes('cordis.yml')) continue
    const configPath = fileURLToPath(new URL(cfg.path))
    return configPath.replace(/cordis\.yml$/u, 'cordis.patch.yml')
  }
  return defaultPatchPath()
}

/** 读取补丁文件：顶层停用块 / 强制块 / insert 行。 */
async function readPatchState(patchPath) {
  let text = ''
  try {
    text = await readFile(patchPath, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const disables = []
  const forced = []
  const inserts = []
  const lines = text.split(/\r?\n/u)
  let inInsert = false
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (/^- insert:\s*$/u.test(line)) { inInsert = true; continue }
    if (/^- /u.test(line)) inInsert = false
    if (inInsert) {
      const m = line.match(/^ {4}- id: ([A-Za-z0-9_.-]+)/u)
      if (m) inserts.push(m[1])
      continue
    }
    const d = line.match(/^- id: ([A-Za-z0-9_.-]+)\s*$/u)
    if (!d) continue
    const next = lines[i + 1] ?? ''
    if (/^ {2}disabled: true\s*$/u.test(next)) disables.push(d[1])
    else if (/^ {2}disabled: false\s*$/u.test(next)) forced.push(d[1])
  }
  return { disables, forced, inserts, text }
}

function includePrefix(ctx) {
  for (const entry of ctx.loader.entries()) {
    if (entry.options?.name === 'cordis:include') return `${entry.id}:`
  }
  return ''
}

function rowIdOf(ctx, entryId) {
  const prefix = includePrefix(ctx)
  if (prefix.length > 0 && entryId.startsWith(prefix)) return entryId.slice(prefix.length)
  return entryId
}

/** 串行化补丁写入，避免并发读改写竞争。 */
let writeQueue = Promise.resolve()
function queuedWrite(fn) {
  const run = writeQueue.then(fn, fn)
  writeQueue = run.then(() => undefined, () => undefined)
  return run
}

async function writeFileAtomic(path, content) {
  const tmp = `${path}.tmp-${Date.now()}`
  await writeFile(tmp, content, 'utf8')
  await rename(tmp, path)
}

/** 初始 patch 文件是注释 + `[]`；直接追加块会产生非法 YAML。
 * 若非注释内容恰为 `[]`，返回仅含注释的底稿，让追加块成为唯一数组。 */
function stripEmptyArray(text) {
  const lines = text.split(/\r?\n/u)
  const content = lines.filter((l) => l.trim() !== '' && !l.trim().startsWith('#'))
  if (content.length === 1 && content[0].trim() === '[]') {
    const comments = lines.filter((l) => l.trim().startsWith('#'))
    return comments.length > 0 ? `${comments.join('\n')}\n` : ''
  }
  return text
}

async function disableEntry(patchPath, id) {
  return queuedWrite(async () => {
    const { disables, text } = await readPatchState(patchPath)
    if (disables.includes(id)) return { changed: false }
    const base = stripEmptyArray(text)
    const next = base.length === 0 || base.endsWith('\n') ? base : `${base}\n`
    await writeFileAtomic(patchPath, `${next}- id: ${id}\n  disabled: true\n`)
    return { changed: true }
  })
}

function isLoopback(addr) {
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'
}

//#region M2 静态契约体检（L1 预检：装载前发现结构类故障）
const FIXTURE_NAMES = ['fault-load', 'fault-apply', 'fault-mismatch', 'fault-no-name']
const KNOWN_CLIENT_SERVICES = ['slots', 'locale', 'modules', 'loader', 'hmr', 'connection']

async function readTextOrNull(path) {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function clientEntryOf(pkg) {
  const exp = pkg.exports?.['./client']
  if (typeof exp === 'string') return exp.replace(/^\.\//u, '')
  if (pkg.dsh?.client == null) return null
  if (typeof pkg.dsh.client.entry === 'string') return pkg.dsh.client.entry.replace(/^\.\//u, '')
  return 'lib/client.js'
}

function hostEntryOf(pkg) {
  const exp = pkg.exports?.['.']
  if (typeof exp === 'string') return exp.replace(/^\.\//u, '')
  if (typeof pkg.main === 'string') return pkg.main.replace(/^\.\//u, '')
  return 'lib/index.js'
}

function quotedList(source, declRe) {
  const m = source.match(declRe)
  if (!m) return null
  return [...m[1].matchAll(/["']([^"']+)["']/gu)].map((x) => x[1])
}

async function inspectPackage(pkgDir, expectedName) {
  const checks = []
  const push = (id, label, status, detail) => checks.push({ id, label, status, detail })

  const pkgText = await readTextOrNull(join(pkgDir, 'package.json'))
  if (pkgText === null) {
    push('pkg', 'package.json', 'fail', '缺失——无法体检')
    return { checks }
  }
  let pkg
  try {
    pkg = JSON.parse(pkgText)
  } catch (error) {
    push('pkg', 'package.json', 'fail', `不是合法 JSON：${error instanceof Error ? error.message : String(error)}`)
    return { checks }
  }
  push('pkg', 'package.json', pkg.name === expectedName ? 'pass' : 'fail',
    pkg.name === expectedName ? `name = ${pkg.name}` : `name(${pkg.name ?? '缺失'}) ≠ 期望(${expectedName})`)

  // client 半边（未声明 client 的纯 host 插件属合法形态，跳过 client 检查）
  const clientRel = clientEntryOf(pkg)
  if (clientRel === null) {
    push('client-exists', 'client bundle 文件', 'pass', '无 client 半边（纯 host 插件）')
  } else {
  const clientSrc = await readTextOrNull(join(pkgDir, clientRel))
  if (clientSrc === null) {
    push('client-exists', 'client bundle 文件', 'fail', `${clientRel} 缺失——boot 拉取工厂必失败（load 档）`)
  } else {
    push('client-exists', 'client bundle 文件', 'pass', clientRel)
    const idm = clientSrc.match(/__ModuleLoader__\s*\.\s*load\s*\(\s*\{\s*id\s*:\s*["']([^"']+)["']/u)
    if (!idm) {
      push('client-id', 'bundle 注册 id', 'fail', '未找到 __ModuleLoader__.load({id:…}) 注册')
    } else if (idm[1] === pkg.name) {
      push('client-id', 'bundle 注册 id', 'pass', `id = ${idm[1]}`)
    } else {
      push('client-id', 'bundle 注册 id', 'fail', `注册 id(${idm[1]}) ≠ 包名(${pkg.name})——boot 按包名找不到工厂，装载必失败（mismatch 档）`)
    }
    const hasApply = /exports\.apply\s*=|export\s+(async\s+)?function\s+apply/u.test(clientSrc)
    push('client-apply', 'client exports.apply', hasApply ? 'pass' : 'fail',
      hasApply ? '存在' : '缺失——fiber 激活无入口，装载必失败（apply 档）')
    const nm = clientSrc.match(/(?:exports\.name\s*=\s*|export\s+const\s+name\s*=\s*)["']([^"']+)["']/u)
    if (!nm) {
      push('client-name', 'client exports.name', 'warn', '缺失——fiber 名继承内部祖先，崩溃归因失真（M1 实测 x6）')
    } else if (nm[1] === pkg.name) {
      push('client-name', 'client exports.name', 'pass', `= ${nm[1]}`)
    } else {
      push('client-name', 'client exports.name', 'warn', `(${nm[1]}) ≠ 包名(${pkg.name})——归因与包名对不上`)
    }
    const injectKeys = quotedList(clientSrc, /(?:exports\.inject\s*=\s*|export\s+const\s+inject\s*=\s*)\[([^\]]*)\]/u)
    if (injectKeys === null) {
      push('client-inject', 'client inject 声明', 'warn', '未解析到 inject 数组（手写 bundle 应有 exports.inject）')
    } else {
      const unknown = injectKeys.filter((k) => !KNOWN_CLIENT_SERVICES.includes(k))
      push('client-inject', 'client inject 声明', unknown.length === 0 ? 'pass' : 'warn',
        unknown.length === 0 ? `[${injectKeys.join(', ')}] 均为已知服务`
          : `未知服务键：${unknown.join(', ')}（拼错会导致 fiber 永久 PENDING）`)
    }
  }
  }

  // host 半边
  const hostRel = hostEntryOf(pkg)
  const hostSrc = await readTextOrNull(join(pkgDir, hostRel))
  if (hostSrc === null) {
    push('host-half', 'host 半边', 'fail', `${hostRel} 缺失——loader import 必失败`)
  } else {
    const hasApply = /exports\.apply\s*=|export\s+(async\s+)?function\s+apply/u.test(hostSrc)
    const hasName = /exports\.name\s*=|export\s+(const|let|var)\s+name\b/u.test(hostSrc)
    if (!hasApply) {
      push('host-half', 'host 半边', 'fail', `${hostRel} 无 apply 导出——宿主装载必失败`)
    } else {
      push('host-half', 'host 半边', hasName ? 'pass' : 'warn',
        hasName ? `${hostRel}（apply+name）` : `${hostRel} 有 apply 但无 name 导出——建议补齐`)
    }
  }

  // 自带补丁清单（name 守卫）
  const patchRel = typeof pkg.dsh?.bundle?.patch === 'string' ? pkg.dsh.bundle.patch.replace(/^\.\//u, '') : 'cordis.patch.yml'
  const patchSrc = await readTextOrNull(join(pkgDir, patchRel))
  if (patchSrc === null) {
    push('patch-guard', '自带 cordis.patch.yml', 'warn', `${patchRel} 缺失——需宿主 bundle 层登记才会被装载`)
  } else {
    const strip = patchSrc.split(/\r?\n/u).filter((l) => l.trim() !== '' && !l.trim().startsWith('#'))
    if (strip.length === 0 || strip[0].trim() !== '- insert:') {
      push('patch-guard', '自带 cordis.patch.yml', 'fail', '不是合法的 insert 列表（应为顶层数组 `- insert:` 起）')
    } else {
      const names = [...patchSrc.matchAll(/name:\s*['"]([^'"]+)['"]/gu)].map((m) => m[1])
      const bad = names.filter((n) => n !== pkg.name)
      push('patch-guard', '自带 cordis.patch.yml', bad.length === 0 ? 'pass' : 'fail',
        bad.length === 0 ? `insert name 守卫 = ${pkg.name}`
          : `insert name(${bad.join(', ')}) ≠ 包名(${pkg.name})——防误伤守卫失效`)
    }
  }

  const summary = {
    pass: checks.filter((c) => c.status === 'pass').length,
    warn: checks.filter((c) => c.status === 'warn').length,
    fail: checks.filter((c) => c.status === 'fail').length,
  }
  return { checks, summary }
}

async function resolveInspectTarget(ctx, search) {
  const fixture = search.get('fixture')
  if (fixture !== null) {
    if (!FIXTURE_NAMES.includes(fixture)) return { error: `未知夹具（可用：${FIXTURE_NAMES.join(', ')}）` }
    const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', fixture)
    return { dir, expectedName: fixture, kind: 'fixture' }
  }
  const moduleName = search.get('module')
  if (moduleName !== null) {
    // M4：?profile=<名> 时直接对目标 profile 的 node_modules 做静态体检（不要求本会话装载）
    const profile = search.get('profile')
    if (profile !== null) {
      if (!PROFILE_NAME_RE.test(profile)) return { error: 'profile 无效' }
      const dir = await realpath(join(profileDirOf(profile), 'node_modules', moduleName)).catch(() => null)
      if (dir === null) return { error: `profile ${profile} 的 node_modules 里找不到 ${moduleName}` }
      return { dir, expectedName: moduleName, kind: `module@${profile}` }
    }
    const entry = ctx.loader.entries().find((c) => c.options?.name === moduleName)
    if (!entry) return { error: `没有名为 ${moduleName} 的插件条目` }
    const profileDir = dirname(findPatchPath(ctx))
    const linkPath = join(profileDir, 'node_modules', moduleName)
    const dir = await realpath(linkPath).catch(() => null)
    if (dir === null) return { error: `node_modules 里找不到 ${moduleName}` }
    return { dir, expectedName: moduleName, kind: 'module' }
  }
  return { error: '需要 ?module=包名 或 ?fixture=夹具名' }
}
//#endregion

//#region M3 黑匣子（L3 观测：崩溃遥测 JSONL，字段版本化供项目池 #3 可视化复用）
const CRASH_SCHEMA_VERSION = 1
const CRASH_LOG_KEEP = 500

function crashLogPath() {
  return join(dshHome(), 'ballute', 'crash-log.jsonl')
}

async function readCrashLog(path) {
  const text = await readTextOrNull(path)
  if (text === null || text.trim() === '') return []
  const rows = []
  for (const line of text.split('\n')) {
    const s = line.trim()
    if (s === '') continue
    try { rows.push(JSON.parse(s)) } catch { /* 跳过残行 */ }
  }
  return rows
}

/** 读改写追加（risk-list 模式），顺带在超限时压实到最近 CRASH_LOG_KEEP 条。 */
async function appendCrashRecord(path, record) {
  return queuedWrite(async () => {
    await mkdir(dirname(path), { recursive: true })
    const rows = await readCrashLog(path)
    rows.push(record)
    const kept = rows.length > CRASH_LOG_KEEP + 100 ? rows.slice(rows.length - CRASH_LOG_KEEP) : rows
    await writeFileAtomic(path, `${kept.map((r) => JSON.stringify(r)).join('\n')}\n`)
  })
}

function normalizeCrashReport(body) {
  const str = (v, max) => (typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null)
  const rec = {
    schemaVersion: CRASH_SCHEMA_VERSION,
    at: typeof body.at === 'number' && body.at > 0 ? Math.floor(body.at) : Date.now(),
    receivedAt: Date.now(),
    registrant: str(body.registrant, 200),
    slotKey: str(body.slotKey, 200),
    entryId: str(body.entryId, 200),
    message: str(body.message, 500) ?? '',
    stack: str(body.stack, 20000) ?? '',
    abdicated: body.abdicated === true,
    count: Number.isFinite(body.count) && body.count >= 1 ? Math.floor(body.count) : 1,
    rev: str(body.rev, 64),
  }
  return rec
}
//#endregion

//#region M4 安全模式（L5 兜底：独立 safe profile + 跨 profile 静态恢复）
const SAFE_PROFILE_NAME = 'safe'
const RECOVER_TARGET_DEFAULT = 'web'
const MODULE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/u
const PROFILE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,40}$/u

/** 从 patch 路径反推 profile 名（…/profiles/<name>/cordis.patch.yml）。 */
function profileNameOf(patchPath) {
  const m = patchPath.match(/profiles[/\\]([^/\\]+)[/\\]cordis\.patch\.yml$/u)
  return m ? m[1] : null
}

function profileDirOf(profileName) {
  return join(dshHome(), 'profiles', profileName)
}

/** 正则解析插件自带补丁的 insert 行（id ↔ name 配对），风格与 readPatchState 一致。 */
function staticInsertRows(text) {
  const rows = []
  let inInsert = false
  let cur = null
  for (const line of text.split(/\r?\n/u)) {
    if (/^- insert:\s*$/u.test(line)) { inInsert = true; continue }
    if (/^- /u.test(line)) inInsert = false
    if (!inInsert) continue
    const idm = line.match(/^ {4}- id: ([A-Za-z0-9_.-]+)/u)
    if (idm) { cur = { id: idm[1], name: null }; rows.push(cur); continue }
    const nm = line.match(/^ {6}name: ['"]?([^'"\n]+?)['"]?\s*$/u)
    if (nm && cur && cur.name === null) cur.name = nm[1]
  }
  return rows.filter((r) => r.id)
}

/** 静态提取目标 profile 中某第三方包的 insert row id。 */
async function staticRowIdOf(pkgDir, pkgName) {
  const text = await readTextOrNull(join(pkgDir, 'cordis.patch.yml'))
  if (text === null) return null
  const hit = staticInsertRows(text).find((r) => r.name === pkgName || r.name === null)
  return hit ? hit.id : null
}

/** 扫描目标 profile 的第三方模块清单（安全模式恢复的数据源，纯静态不依赖运行时）。 */
async function listRecoverables(profileName) {
  const dir = profileDirOf(profileName)
  const nmDir = join(dir, 'node_modules')
  const out = []
  let dirents = []
  try {
    dirents = await readdir(nmDir, { withFileTypes: true })
  } catch {
    return out
  }
  const patch = await readPatchState(join(dir, 'cordis.patch.yml'))
  const disabledIds = new Set(patch.disables)
  for (const d of dirents) {
    if (d.name.startsWith('.') || d.name.startsWith('@') || d.name === 'node_modules') continue
    if (!d.isDirectory() && !d.isSymbolicLink()) continue
    const pkgDir = join(nmDir, d.name)
    const pkgText = await readTextOrNull(join(pkgDir, 'package.json'))
    if (pkgText === null) continue
    let pkg
    try { pkg = JSON.parse(pkgText) } catch { continue }
    if (typeof pkg.name !== 'string') continue
    const rowId = await staticRowIdOf(pkgDir, pkg.name)
    out.push({
      name: pkg.name,
      version: typeof pkg.version === 'string' ? pkg.version : null,
      rowId,
      disabled: rowId !== null && disabledIds.has(rowId),
    })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}
//#endregion

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 64 * 1024) { reject(new Error('请求体过大')); req.destroy(); }
    })
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}) } catch { reject(new Error('请求体不是合法 JSON')) }
    })
    req.on('error', reject)
  })
}

export function apply(ctx) {
  ctx.effect(() => {
    const route = {
      kind: 'prefix',
      path: ROUTE_PREFIX,
      handler: async (req, res) => {
        const remote = req.socket?.remoteAddress ?? ''
        const site = req.headers['sec-fetch-site']
        const origin = req.headers.origin
        const originOk = !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/u.test(origin)
        if (!isLoopback(remote) || (site !== undefined && site !== 'same-origin') || !originOk) {
          sendJson(res, 403, { ok: false, error: '仅允许本机同源访问' })
          return
        }
        try {
          await handle(ctx, req, res)
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
        }
      },
    }
    return ctx.webServer.register(route)
  }, 'ballute: routes')
}

async function handle(ctx, req, res) {
  const url = new URL(req.url ?? '/', 'http://x')
  const pathname = url.pathname
  const method = req.method ?? 'GET'

  if (method === 'GET' && pathname === `${ROUTE_PREFIX}/v1/state`) {
    const patchPath = findPatchPath(ctx)
    const patch = await readPatchState(patchPath)
    const modules = []
    for (const entry of ctx.loader.entries()) {
      if (entry.options.group) continue
      const name = entry.options.name
      if (typeof name !== 'string') continue
      if (name.startsWith('@deepseek-ai/') || name.startsWith('cordis:')) continue
      modules.push({
        name,
        rowId: rowIdOf(ctx, entry.id),
        enabled: !entry.disabled,
      })
    }
    modules.sort((a, b) => a.name.localeCompare(b.name))
    const currentProfile = profileNameOf(patchPath)
    const safeMode = currentProfile === SAFE_PROFILE_NAME || process.env.DSH_SAFE_BOOT === '1'
    let recover = null
    if (safeMode) {
      const target = url.searchParams.get('recover') ?? RECOVER_TARGET_DEFAULT
      if (PROFILE_NAME_RE.test(target) && target !== currentProfile) {
        recover = { target, modules: await listRecoverables(target) }
      }
    }
    sendJson(res, 200, {
      ok: true,
      plugin: 'dsh-ballute',
      version: '0.1.0',
      patchPath,
      profile: currentProfile,
      safeMode,
      recover,
      userDisables: patch.disables,
      modules,
    })
    return
  }

  if (method === 'GET' && pathname === `${ROUTE_PREFIX}/v1/inspect`) {
    const target = await resolveInspectTarget(ctx, url.searchParams)
    if (target.error) {
      sendJson(res, 400, { ok: false, error: target.error })
      return
    }
    const result = await inspectPackage(target.dir, target.expectedName)
    sendJson(res, 200, {
      ok: true,
      target: { kind: target.kind, name: target.expectedName, dir: target.dir },
      ...result,
    })
    return
  }

  if (method === 'POST' && pathname === `${ROUTE_PREFIX}/v1/crash`) {
    const body = await readBody(req)
    const rec = normalizeCrashReport(body)
    if (rec.registrant === null && rec.slotKey === null) {
      sendJson(res, 400, { ok: false, error: 'crash 上报缺 registrant/slotKey' })
      return
    }
    await appendCrashRecord(crashLogPath(), rec)
    sendJson(res, 200, { ok: true, stored: true, schemaVersion: rec.schemaVersion })
    return
  }

  if (method === 'GET' && pathname === `${ROUTE_PREFIX}/v1/crashes`) {
    const limitRaw = Number(url.searchParams.get('limit') ?? 20)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 200) : 20
    const plugin = url.searchParams.get('plugin')
    let rows = await readCrashLog(crashLogPath())
    if (plugin !== null && plugin !== '') rows = rows.filter((r) => r.registrant === plugin)
    const entries = rows.slice(-limit).reverse()
    sendJson(res, 200, {
      ok: true,
      total: rows.length,
      count: entries.length,
      entries,
      path: crashLogPath(),
      schemaVersion: CRASH_SCHEMA_VERSION,
    })
    return
  }

  if (method === 'POST' && pathname === `${ROUTE_PREFIX}/v1/disable`) {
    const body = await readBody(req)
    const { module } = body
    if (typeof module !== 'string' || !MODULE_NAME_RE.test(module)) {
      sendJson(res, 400, { ok: false, error: 'module 无效' })
      return
    }
    if (module === SELF_NAME) {
      sendJson(res, 403, { ok: false, error: '不能停用 ballute 自身' })
      return
    }
    if (isProtectedModule(module)) {
      sendJson(res, 403, { ok: false, error: '基础设施行禁止关闭（停用会破坏运行链）' })
      return
    }

    // M4 跨 profile 静态停用：安全模式实例写目标 profile 的用户补丁层，下次启动生效
    const targetProfile = typeof body.profile === 'string' ? body.profile : null
    if (targetProfile !== null) {
      if (!PROFILE_NAME_RE.test(targetProfile)) {
        sendJson(res, 400, { ok: false, error: 'profile 无效' })
        return
      }
      const pkgDir = join(profileDirOf(targetProfile), 'node_modules', module)
      const pkgText = await readTextOrNull(join(pkgDir, 'package.json'))
      if (pkgText === null) {
        sendJson(res, 404, { ok: false, error: `profile ${targetProfile} 中没有 ${module}` })
        return
      }
      const rowId = await staticRowIdOf(pkgDir, module)
      if (rowId === null) {
        sendJson(res, 404, { ok: false, error: `${module} 的 cordis.patch.yml 未声明 insert 行，无法补丁层停用` })
        return
      }
      const result = await disableEntry(join(profileDirOf(targetProfile), 'cordis.patch.yml'), rowId)
      sendJson(res, 200, { ok: true, rowId, ...result, runtimeEffect: 'next-boot', note: `已写入 profile ${targetProfile} 的补丁层，重启后生效` })
      return
    }

    const entry = ctx.loader.entries().find((c) => c.options?.name === module)
    if (!entry) {
      sendJson(res, 404, { ok: false, error: `没有名为 ${module} 的插件条目（会话内动态插件暂不支持补丁层关闭）` })
      return
    }
    const rowId = rowIdOf(ctx, entry.id)
    if (rowId === SELF_ROW) {
      sendJson(res, 403, { ok: false, error: '不能停用 ballute 自身' })
      return
    }
    if (module.startsWith('cordis:')) {
      sendJson(res, 403, { ok: false, error: '基础设施行禁止关闭（停用会破坏运行链）' })
      return
    }
    const patchPath = findPatchPath(ctx)
    const result = await disableEntry(patchPath, rowId)
    sendJson(res, 200, { ok: true, rowId, ...result, runtimeEffect: 'recomposing', note: '已写入补丁层，HMR 约 1-3 秒自动重组' })
    return
  }

  sendJson(res, 404, { ok: false, error: '未知路由' })
}
