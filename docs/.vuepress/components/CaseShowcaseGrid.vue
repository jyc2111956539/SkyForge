<template>
  <VPCard>
    <VPCardGrid :cols="{ sm: 1, md: 2, lg: 4 }" class="case-showcase-grid">
      <a v-for="item in items" :key="item.href" class="case-showcase-card" :href="item.href">
        <img class="case-showcase-cover" :src="item.image || '/images/cases/placeholder.svg'" :alt="`${item.title}封面`" />
        <div class="case-showcase-body">
          <h3 class="case-showcase-title">{{ item.title }}</h3>
          <p class="case-showcase-desc">{{ item.description }}</p>
        </div>
      </a>
    </VPCardGrid>
  </VPCard>
</template>

<script setup lang="ts">
type CaseItem = {
  title: string
  description: string
  href: string
  image?: string
  createTime?: string
  premium?: boolean
}

const caseModules = import.meta.glob('../../cases/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const stripQuotes = (value: string) => value.replace(/^["']|["']$/g, '').trim()

const parseFrontmatter = (source: string): Record<string, string> => {
  const matched = source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/)
  if (!matched) return {}

  const lines = matched[1].split(/\r?\n/)
  const data: Record<string, string> = {}

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.+)$/)
    if (!kv) continue
    data[kv[1]] = stripQuotes(kv[2])
  }
  return data
}

const toHref = (permalink: string, path: string) => {
  if (permalink && permalink !== '#') return permalink
  const seg = path.split('/').pop()?.replace(/\.md$/, '') ?? ''
  return seg ? `/cases/${seg}.html` : '/cases/'
}

const normalizeText = (value: string, fallback: string) => {
  const text = (value || '').trim()
  return text.length > 0 ? text : fallback
}

const items: CaseItem[] = Object.entries(caseModules)
  .filter(([path]) => !path.endsWith('/README.md'))
  .map(([path, raw]) => {
    const fm = parseFrontmatter(raw)
    const fallbackTitle = path.split('/').pop()?.replace(/\.md$/, '') ?? '未命名案例'
    const title = normalizeText(fm.title, fallbackTitle)
    const description = normalizeText(fm.excerpt, '暂无简介')
    const href = toHref(fm.permalink || '', path)
    const image = (fm.cover || '').trim() || undefined
    const createTime = fm.createTime || ''
    const premium = path.includes('/paid/')
    return { title, description, href, image, createTime, premium }
  })
  .sort((a, b) => {
    if (a.premium !== b.premium) return a.premium ? 1 : -1
    return (b.createTime || '').localeCompare(a.createTime || '')
  })
</script>

<style scoped>
.case-showcase-grid {
  margin-top: 4px !important;
}

.case-showcase-card {
  display: block;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  color: inherit;
  transition: border-color var(--vp-t-color), background-color var(--vp-t-color), box-shadow var(--vp-t-color);
}

.case-showcase-card:hover {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-bg);
  box-shadow: var(--vp-shadow-2);
}

.case-showcase-cover {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  object-position: center;
  display: block;
  background: #e5e7eb;
}

.case-showcase-body {
  padding: 6px 14px 12px;
}

.case-showcase-title {
  margin: 0 0 4px;
  font-size: 18px;
  line-height: 1.4;
  color: var(--vp-c-text-1);
}

.case-showcase-desc {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

