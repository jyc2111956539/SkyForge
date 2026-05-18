import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const repoRoot = process.cwd()
const repoUrl = process.env.RESOURCE_REPO_URL ?? 'https://gitee.com/ching_an/sky-forge-work-file.git'
const sourceDirName = process.env.RESOURCE_SOURCE_DIR ?? '技术资料'
const repoRef = process.env.RESOURCE_REPO_REF ?? 'master'
const syncMode = (process.env.RESOURCE_SYNC_MODE ?? 'remote').toLowerCase() // remote | clone
const strictMode = (process.env.RESOURCE_SYNC_STRICT ?? '1') !== '0'
const indexFile = process.env.RESOURCE_INDEX_FILE ?? 'resources.index.json'
const itemsDir = path.resolve(repoRoot, process.env.RESOURCE_ITEMS_DIR ?? 'docs/resources/items')
const tempDir = path.resolve(repoRoot, '.tmp_resource_sync')
const today = new Date().toISOString().slice(0, 10)

const formatMap = new Map([
  ['.pdf', 'PDF'],
  ['.zip', 'ZIP'],
  ['.rar', 'RAR'],
  ['.7z', '7Z'],
  ['.doc', 'DOC'],
  ['.docx', 'DOCX'],
  ['.xls', 'XLS'],
  ['.xlsx', 'XLSX'],
  ['.ppt', 'PPT'],
  ['.pptx', 'PPTX'],
])

const toPosix = (p) => p.split(path.sep).join('/')
const encodePath = (p) => toPosix(p).split('/').map(encodeURIComponent).join('/')

function fail(message) {
  throw new Error(`[resource-sync] ${message}`)
}

function assertOrWarn(condition, message) {
  if (condition) return
  if (strictMode) fail(message)
  console.warn(`[resource-sync][warn] ${message}`)
}

function parseRepoInfo(url) {
  const cleaned = url.replace(/\.git$/i, '')
  const m = cleaned.match(/^https?:\/\/[^/]+\/([^/]+)\/([^/]+)$/i)
  if (!m) fail(`Unsupported repo url format: ${url}`)
  return { owner: m[1], repo: m[2], repoHttpBase: cleaned }
}

function clearOldItems() {
  const files = fs.readdirSync(itemsDir)
  for (const file of files) {
    if (!file.endsWith('.md')) continue
    if (file === '_template.md') continue
    fs.unlinkSync(path.join(itemsDir, file))
  }
}

function safeName(input) {
  const v = input.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return v || 'item'
}

function unquote(s) {
  return s.replace(/^['"]|['"]$/g, '')
}

function parseSimpleYaml(raw) {
  const result = {}
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/)
  let inTags = false
  const tags = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    if (inTags) {
      const m = line.match(/^\s*-\s*(.+)\s*$/)
      if (m) {
        tags.push(unquote(m[1].trim()))
        continue
      }
      inTags = false
    }

    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/)
    if (!kv) continue
    const key = kv[1]
    const value = kv[2]

    if (key === 'tags' && value === '') {
      inTags = true
      continue
    }
    if (key === 'tags' && value.startsWith('[') && value.endsWith(']')) {
      const arr = value
        .slice(1, -1)
        .split(',')
        .map((v) => unquote(v.trim()))
        .filter(Boolean)
      result.tags = arr
      continue
    }
    result[key] = unquote(value.trim())
  }

  if (tags.length > 0) result.tags = tags
  return result
}

function getFormatFromExt(ext) {
  return formatMap.get(ext.toLowerCase()) ?? (ext.replace(/^\./, '').toUpperCase() || 'FILE')
}

function writeDocItem(item, index) {
  const id = item.id || `r${String(index).padStart(4, '0')}`
  const filename = `${id}-${safeName(item.title)}.md`
  const tags = [...new Set((item.tags ?? []).filter(Boolean))]
  const content = [
    '---',
    `id: ${id}`,
    `title: "${item.title}"`,
    `desc: "${item.desc}"`,
    `format: ${item.format}`,
    `module: "${item.module}"`,
    `tags: [${tags.map((t) => `'${t}'`).join(', ')}]`,
    `updatedAt: ${item.updatedAt || today}`,
    `url: "${item.url}"`,
    '---',
    '',
  ].join('\n')
  fs.writeFileSync(path.join(itemsDir, filename), content, 'utf8')
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) fail(`HTTP ${res.status} for ${url}`)
  return res.json()
}

async function fetchMaybeJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (res.status === 404) return null
  if (!res.ok) fail(`HTTP ${res.status} for ${url}`)
  return res.json()
}

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) fail(`HTTP ${res.status} for ${url}`)
  return res.text()
}

async function mapLimit(list, limit, worker) {
  const out = new Array(list.length)
  let cursor = 0

  async function run() {
    while (true) {
      const idx = cursor++
      if (idx >= list.length) return
      out[idx] = await worker(list[idx], idx)
    }
  }

  const runners = Array.from({ length: Math.max(1, Math.min(limit, list.length)) }, () => run())
  await Promise.all(runners)
  return out
}

async function listRemoteTree(owner, repo, rootPath, ref) {
  const files = []
  const dirs = [rootPath]

  while (dirs.length > 0) {
    const current = dirs.pop()
    const apiUrl = `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${encodePath(current)}?ref=${encodeURIComponent(ref)}`
    const data = await fetchJson(apiUrl)
    const entries = Array.isArray(data) ? data : [data]

    for (const item of entries) {
      if (!item || !item.path || !item.type) continue
      const itemPath = String(item.path)
      const name = String(item.name || path.basename(itemPath))
      if (name === '.git' || name === '.keep') continue

      if (item.type === 'dir') {
        dirs.push(itemPath)
      } else if (item.type === 'file') {
        files.push({
          path: itemPath.replace(/\\/g, '/'),
          name,
          downloadUrl: item.download_url || '',
        })
      }
    }
  }

  return files.sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))
}

function findBundleDownloadTargetRemote(allFiles, bundleRelPath) {
  const prefix = `${bundleRelPath.replace(/\/+$/, '')}/`
  const files = allFiles.filter((f) => f.path.startsWith(prefix) && !f.path.endsWith('.resource.yml') && !f.path.endsWith('.resource.yaml'))
  if (files.length === 0) return null
  const zipLike = files.find((f) => ['.zip', '.rar', '.7z'].includes(path.extname(f.path).toLowerCase()))
  return zipLike ?? files[0]
}

function normalizeIndexItems(rows, repoHttpBase, ref) {
  return rows
    .map((row) => {
      const mode = String(row.mode || 'file').toLowerCase()
      const relPath = String(row.path || '').replace(/\\/g, '/')
      const title = String(row.title || '').trim()
      const moduleName = String(row.module || '').trim()
      const tags = Array.isArray(row.tags) ? row.tags.map((t) => String(t).trim()).filter(Boolean) : []
      const descRaw = String(row.desc || '').trim()
      const format = String(row.format || (mode === 'bundle' ? 'BUNDLE' : getFormatFromExt(path.extname(relPath))))
      const url = String(row.url || (relPath ? `${repoHttpBase}/raw/${ref}/${encodePath(relPath)}` : '')).trim()
      return {
        id: row.id ? String(row.id).trim() : undefined,
        title: title.replace(/"/g, '\\"'),
        desc: (descRaw || `来源：${relPath}`).replace(/\\/g, '/').replace(/"/g, '\\"'),
        format,
        module: moduleName.replace(/"/g, '\\"'),
        tags,
        updatedAt: row.updatedAt || today,
        url,
      }
    })
    .filter((r) => r.title && r.module && r.tags.length > 0 && r.url)
}

async function itemsFromMetadataRemote(owner, repo, ref, repoHttpBase) {
  const indexUrl = `${repoHttpBase}/raw/${ref}/${encodePath(indexFile)}`
  const indexJson = await fetchMaybeJson(indexUrl)
  if (indexJson) {
    const rows = Array.isArray(indexJson) ? indexJson : Array.isArray(indexJson.items) ? indexJson.items : []
    const normalized = normalizeIndexItems(rows.filter(Boolean), repoHttpBase, ref)
    if (normalized.length > 0) return normalized
  }

  const allFiles = await listRemoteTree(owner, repo, sourceDirName, ref)
  const metadataFiles = allFiles.filter((f) => f.path.endsWith('.resource.yml') || f.path.endsWith('.resource.yaml'))
  const idSet = new Set()
  const items = []

  const parsedMetas = await mapLimit(metadataFiles, 8, async (metaFile) => {
    const metaRaw = await fetchText(metaFile.downloadUrl || `${repoHttpBase}/raw/${ref}/${encodePath(metaFile.path)}`)
    const meta = parseSimpleYaml(metaRaw)
    return { metaFile, meta }
  })

  for (const entry of parsedMetas) {
    const metaFile = entry.metaFile
    const meta = entry.meta

    const mode = String(meta.mode || 'file').toLowerCase()
    const relPath = String(meta.path || '').replace(/\\/g, '/')
    const title = String(meta.title || '').trim()
    const descRaw = String(meta.desc || '').trim()
    const moduleName = String(meta.module || '').trim()
    const tags = Array.isArray(meta.tags) ? meta.tags.map((t) => String(t).trim()).filter(Boolean) : []
    const id = String(meta.id || '').trim()

    assertOrWarn(relPath.length > 0, `Missing required field "path" in ${metaFile.path}`)
    assertOrWarn(title.length > 0, `Missing required field "title" in ${metaFile.path}`)
    assertOrWarn(moduleName.length > 0, `Missing required field "module" in ${metaFile.path}`)
    assertOrWarn(tags.length > 0, `Missing or empty field "tags" in ${metaFile.path}`)
    assertOrWarn(mode === 'file' || mode === 'bundle', `Invalid mode "${mode}" in ${metaFile.path}, expected "file" or "bundle"`)
    assertOrWarn(!path.isAbsolute(relPath), `Field "path" must be repository-relative in ${metaFile.path}: ${relPath}`)
    if (!(relPath && title && moduleName && tags.length > 0 && (mode === 'file' || mode === 'bundle') && !path.isAbsolute(relPath))) continue

    if (id) {
      assertOrWarn(!idSet.has(id), `Duplicate id "${id}" found in ${metaFile.path}`)
      if (!idSet.has(id)) idSet.add(id)
    }

    let downloadPath = relPath
    let format = 'FILE'

    if (mode === 'bundle') {
      const picked = findBundleDownloadTargetRemote(allFiles, relPath)
      assertOrWarn(Boolean(picked), `No downloadable file found under bundle directory: ${relPath} (from ${metaFile.path})`)
      if (!picked) continue
      downloadPath = picked.path
      format = 'BUNDLE'
    } else {
      const exists = allFiles.some((f) => f.path === relPath)
      assertOrWarn(exists, `File path not found: ${relPath} (from ${metaFile.path})`)
      if (!exists) continue
      format = getFormatFromExt(path.extname(relPath))
    }

    const url = `${repoHttpBase}/raw/${ref}/${encodePath(downloadPath)}`
    const desc = (descRaw || `来源：${relPath}`).replace(/\\/g, '/').replace(/"/g, '\\"')

    items.push({
      id: id || undefined,
      title: title.replace(/"/g, '\\"'),
      desc,
      format,
      module: moduleName.replace(/"/g, '\\"'),
      tags,
      updatedAt: meta.updatedAt || today,
      url,
    })
  }

  return items
}

function ensureCleanTemp() {
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true })
}

function gitClone() {
  execFileSync('git', ['clone', '--depth', '1', '--branch', repoRef, repoUrl, tempDir], { stdio: 'inherit' })
}

function walkFilesLocal(dir) {
  const out = []
  const stack = [dir]
  while (stack.length > 0) {
    const current = stack.pop()
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === '.keep') continue
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (entry.isFile()) out.push(full)
    }
  }
  return out
}

function findBundleDownloadTargetLocal(absBundleDir) {
  const files = walkFilesLocal(absBundleDir)
    .filter((f) => !f.endsWith('.resource.yml') && !f.endsWith('.resource.yaml'))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
  if (files.length === 0) return null
  const zipLike = files.find((f) => ['.zip', '.rar', '.7z'].includes(path.extname(f).toLowerCase()))
  return zipLike ?? files[0]
}

function itemsFromMetadataClone(repoHttpBase) {
  const sourceRootAbs = path.join(tempDir, sourceDirName)
  const allFiles = walkFilesLocal(sourceRootAbs)
    .map((f) => toPosix(path.relative(tempDir, f)))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
  const metadataFiles = allFiles.filter((f) => f.endsWith('.resource.yml') || f.endsWith('.resource.yaml'))
  const idSet = new Set()
  const items = []

  for (const metaRel of metadataFiles) {
    const metaAbs = path.join(tempDir, metaRel)
    const meta = parseSimpleYaml(fs.readFileSync(metaAbs, 'utf8'))
    const mode = String(meta.mode || 'file').toLowerCase()
    const relPath = String(meta.path || '').replace(/\\/g, '/')
    const title = String(meta.title || '').trim()
    const descRaw = String(meta.desc || '').trim()
    const moduleName = String(meta.module || '').trim()
    const tags = Array.isArray(meta.tags) ? meta.tags.map((t) => String(t).trim()).filter(Boolean) : []
    const id = String(meta.id || '').trim()

    assertOrWarn(relPath.length > 0, `Missing required field "path" in ${metaRel}`)
    assertOrWarn(title.length > 0, `Missing required field "title" in ${metaRel}`)
    assertOrWarn(moduleName.length > 0, `Missing required field "module" in ${metaRel}`)
    assertOrWarn(tags.length > 0, `Missing or empty field "tags" in ${metaRel}`)
    assertOrWarn(mode === 'file' || mode === 'bundle', `Invalid mode "${mode}" in ${metaRel}, expected "file" or "bundle"`)
    if (!(relPath && title && moduleName && tags.length > 0 && (mode === 'file' || mode === 'bundle'))) continue

    if (id) {
      assertOrWarn(!idSet.has(id), `Duplicate id "${id}" found in ${metaRel}`)
      if (!idSet.has(id)) idSet.add(id)
    }

    let downloadRel = relPath
    let format = 'FILE'

    if (mode === 'bundle') {
      const absPath = path.join(tempDir, relPath)
      const picked = fs.existsSync(absPath) && fs.statSync(absPath).isDirectory() ? findBundleDownloadTargetLocal(absPath) : null
      assertOrWarn(Boolean(picked), `No downloadable file found under bundle directory: ${relPath} (from ${metaRel})`)
      if (!picked) continue
      downloadRel = toPosix(path.relative(tempDir, picked))
      format = 'BUNDLE'
    } else {
      const absPath = path.join(tempDir, relPath)
      assertOrWarn(fs.existsSync(absPath) && fs.statSync(absPath).isFile(), `File path not found: ${relPath} (from ${metaRel})`)
      if (!(fs.existsSync(absPath) && fs.statSync(absPath).isFile())) continue
      format = getFormatFromExt(path.extname(relPath))
    }

    const url = `${repoHttpBase}/raw/${repoRef}/${encodePath(downloadRel)}`
    const desc = (descRaw || `来源：${relPath}`).replace(/\\/g, '/').replace(/"/g, '\\"')
    items.push({
      id: id || undefined,
      title: title.replace(/"/g, '\\"'),
      desc,
      format,
      module: moduleName.replace(/"/g, '\\"'),
      tags,
      updatedAt: meta.updatedAt || today,
      url,
    })
  }

  return items
}

async function main() {
  if (!fs.existsSync(itemsDir)) fail(`items directory not found: ${itemsDir}`)

  const { owner, repo, repoHttpBase } = parseRepoInfo(repoUrl)
  clearOldItems()

  let items = []
  if (syncMode === 'remote') {
    items = await itemsFromMetadataRemote(owner, repo, repoRef, repoHttpBase)
  } else if (syncMode === 'clone') {
    ensureCleanTemp()
    try {
      gitClone()
      items = itemsFromMetadataClone(repoHttpBase)
    } finally {
      ensureCleanTemp()
    }
  } else {
    fail(`Unsupported RESOURCE_SYNC_MODE: ${syncMode}. Use "remote" or "clone".`)
  }

  if (items.length === 0) fail(`No valid resource items generated in ${syncMode} mode.`)

  items.forEach((item, idx) => writeDocItem(item, idx + 1))
  console.log(`Synced ${items.length} resource items from ${repoUrl} via ${syncMode} mode`)
}

main().catch((err) => {
  console.error(err?.message || err)
  process.exit(1)
})
