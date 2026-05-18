<template>
  <div class="rl-wrap">
    <div class="hub-search-inline">
      <input v-model.trim="keyword" class="hub-search-input" type="text" placeholder="输入关键词搜索" />
    </div>

    <div class="rl-row">
      <span class="rl-label">主模块</span>
      <button v-for="item in moduleOptions" :key="item.value" class="rl-btn" :class="{ active: moduleFilter === item.value }" @click="moduleFilter = item.value">
        {{ item.label }}
      </button>
    </div>

    <div v-if="tagFacets.length > 0" class="rl-row">
      <span class="rl-label">标签</span>
      <button v-for="facet in tagFacets" :key="facet.tag" class="rl-btn" :class="{ active: selectedTags.includes(facet.tag) }" @click="toggleTag(facet.tag)">
        {{ facet.tag }} ({{ facet.count }})
      </button>
    </div>

    <div class="rl-summary">共 {{ filteredItems.length }} 份资料 · 第 {{ currentPage }} / {{ totalPages }} 页</div>

    <div class="rl-list">
      <div v-for="item in pagedItems" :key="item.id" class="rl-item">
        <div class="rl-main">
          <div class="rl-head">
            <span class="chip">{{ item.format }}</span>
            <span class="chip chip-track">{{ item.module }}</span>
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </div>
        <div class="rl-side">
          <div class="rl-meta">{{ item.updatedAt }}</div>
          <a class="rl-download" :href="item.url" download>下载</a>
        </div>
      </div>
    </div>

    <div class="rl-pagination">
      <button class="rl-btn" :disabled="currentPage <= 1" @click="currentPage = currentPage - 1">上一页</button>
      <span class="rl-page-indicator">{{ currentPage }} / {{ totalPages }}</span>
      <button class="rl-btn" :disabled="currentPage >= totalPages" @click="currentPage = currentPage + 1">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type Item = {
  id: string
  title: string
  desc: string
  format: string
  module: string
  tags: string[]
  updatedAt: string
  url: string
}

const moduleFilter = ref<'all' | string>('all')
const selectedTags = ref<string[]>([])
const keyword = ref('')
const currentPage = ref(1)
const pageSize = 9

const preferredModuleOrder = [
  '单片机与嵌入式',
  '网络通信',
  'USB开发',
  '模拟电子',
  '电源设计',
  '工具链与工程化',
]

const mdModules = import.meta.glob('../../resources/items/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const stripQuotes = (value: string) => value.replace(/^["']|["']$/g, '').trim()

const parseTags = (raw: string, lines: string[], startIndex: number): { tags: string[]; nextIndex: number } => {
  const inlineMatch = raw.match(/^tags:\s*\[(.*)\]\s*$/)
  if (inlineMatch) {
    const tags = inlineMatch[1]
      .split(',')
      .map((item) => stripQuotes(item))
      .filter(Boolean)
    return { tags, nextIndex: startIndex }
  }

  if (/^tags:\s*$/.test(raw)) {
    const tags: string[] = []
    let idx = startIndex + 1
    while (idx < lines.length) {
      const line = lines[idx]
      if (!/^\s*-\s+/.test(line)) break
      tags.push(stripQuotes(line.replace(/^\s*-\s+/, '')))
      idx += 1
    }
    return { tags, nextIndex: idx - 1 }
  }

  return { tags: [], nextIndex: startIndex }
}

const parseFrontmatter = (source: string): Record<string, string | string[]> => {
  const matched = source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/)
  if (!matched) return {}

  const lines = matched[1].split(/\r?\n/)
  const data: Record<string, string | string[]> = {}

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (!line || line.startsWith('#')) continue

    if (line.startsWith('tags:')) {
      const { tags, nextIndex } = parseTags(line, lines, i)
      data.tags = tags
      i = nextIndex
      continue
    }

    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.+)$/)
    if (!kv) continue

    const key = kv[1]
    const value = stripQuotes(kv[2])
    data[key] = value
  }

  return data
}

const items: Item[] = Object.entries(mdModules)
  .filter(([path]) => {
    const fileName = path.split('/').pop() ?? ''
    return !fileName.startsWith('_')
  })
  .map(([path, raw]) => {
    const fm = parseFrontmatter(raw)
    const fileName = path.split('/').pop()?.replace(/\.md$/, '') ?? `item-${Math.random().toString(36).slice(2, 8)}`
    return {
      id: String(fm.id ?? fileName),
      title: String(fm.title ?? fileName),
      desc: String(fm.desc ?? ''),
      format: String(fm.format ?? 'ZIP').toUpperCase(),
      module: String(fm.module ?? '未分类'),
      tags: Array.isArray(fm.tags) ? fm.tags.map((t) => String(t)).filter(Boolean) : [],
      updatedAt: String(fm.updatedAt ?? ''),
      url: String(fm.url ?? '#'),
    }
  })
  .filter((item) => item.url !== '#')
  .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

const moduleOptions = computed(() => {
  const available = [...new Set(items.map((item) => item.module))]
  const ordered = [
    ...preferredModuleOrder.filter((name) => available.includes(name)),
    ...available.filter((name) => !preferredModuleOrder.includes(name)).sort((a, b) => a.localeCompare(b)),
  ]
  return [{ label: '全部', value: 'all' }, ...ordered.map((name) => ({ label: name, value: name }))]
})

const baseItems = computed(() =>
  items.filter((item) => {
    const moduleOk = moduleFilter.value === 'all' || item.module === moduleFilter.value
    return moduleOk
  }),
)

const searchedItems = computed(() => {
  const key = keyword.value.toLowerCase()
  if (!key) return baseItems.value
  return baseItems.value.filter((item) => `${item.title} ${item.desc} ${item.tags.join(' ')}`.toLowerCase().includes(key))
})

const tagFacets = computed(() => {
  const m = new Map<string, number>()
  searchedItems.value.forEach((i) => i.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)))
  return [...m.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)
})

const toggleTag = (tag: string) => {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter((t) => t !== tag)
    : [...selectedTags.value, tag]
}

const filteredItems = computed(() => searchedItems.value.filter((i) => selectedTags.value.every((t) => i.tags.includes(t))))
const totalPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / pageSize)))
const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredItems.value.slice(start, start + pageSize)
})

watch([moduleFilter, selectedTags, keyword], () => {
  currentPage.value = 1
})

watch(filteredItems, () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
})
</script>
