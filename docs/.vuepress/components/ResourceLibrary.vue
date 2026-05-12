<template>
  <div class="rl-wrap">
    <div class="hub-search-inline">
      <input v-model.trim="keyword" class="hub-search-input" type="text" placeholder="输入关键词搜索" />
    </div>

    <div class="rl-row">
      <span class="rl-label">文件类型</span>
      <button v-for="item in typeOptions" :key="item.value" class="rl-btn" :class="{ active: fileType === item.value }" @click="fileType = item.value">
        {{ item.label }}
      </button>
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

    <div class="rl-summary">共 {{ filteredItems.length }} 份资料</div>

    <div class="rl-list">
      <div v-for="item in filteredItems" :key="item.id" class="rl-item">
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Item = {
  id: string
  title: string
  desc: string
  format: 'PDF' | 'DOCX' | 'ZIP'
  module: string
  tags: string[]
  updatedAt: string
  url: string
}

const fileType = ref<'all' | Item['format']>('all')
const moduleFilter = ref<'all' | string>('all')
const selectedTags = ref<string[]>([])
const keyword = ref('')

const typeOptions = [
  { label: '全部', value: 'all' },
  { label: 'PDF', value: 'PDF' },
  { label: 'DOCX', value: 'DOCX' },
  { label: 'ZIP', value: 'ZIP' },
] as const

const moduleOptions = [
  { label: '全部', value: 'all' },
  { label: '单片机与嵌入式', value: '单片机与嵌入式' },
  { label: '网络通信', value: '网络通信' },
  { label: 'USB开发', value: 'USB开发' },
  { label: '模拟电子', value: '模拟电子' },
  { label: '电源设计', value: '电源设计' },
  { label: '工具链与工程化', value: '工具链与工程化' },
] as const

const items: Item[] = [
  { id: 'r1', title: 'STM32 MQTT 通信入门资料包', desc: '包含最小连接流程、配置说明与抓包示例。', format: 'ZIP', module: '网络通信', tags: ['STM32', 'MQTT', '源码'], updatedAt: '2026-05-12', url: '/downloads/toolchain-template.zip' },
  { id: 'r2', title: 'ARM 启动流程速查', desc: '覆盖向量表、启动文件和异常入口。', format: 'PDF', module: '单片机与嵌入式', tags: ['ARM', '启动'], updatedAt: '2026-05-12', url: '/downloads/arm-startup-notes.pdf' },
  { id: 'r3', title: 'USB 转串口调试清单', desc: '常见驱动、波特率与掉线问题定位。', format: 'DOCX', module: 'USB开发', tags: ['USB', '调试'], updatedAt: '2026-05-12', url: '/downloads/filter-checklist-v1.docx' },
  { id: 'r4', title: '滤波器选型与验算表', desc: '频段、纹波与相位裕量的设计模板。', format: 'DOCX', module: '模拟电子', tags: ['滤波器', '模拟电子'], updatedAt: '2026-05-12', url: '/downloads/filter-checklist-v1.docx' },
  { id: 'r5', title: '放大电路设计资料包', desc: '原理图、仿真工程与失真问题说明。', format: 'ZIP', module: '模拟电子', tags: ['放大电路', '原理图', 'PCB'], updatedAt: '2026-05-12', url: '/downloads/amplifier-design-pack.zip' },
  { id: 'r6', title: '开关电源设计指南', desc: 'Buck/Boost 设计流程与稳定性检查项。', format: 'PDF', module: '电源设计', tags: ['电源设计', '开关电源'], updatedAt: '2026-05-12', url: '/downloads/smps-guide-v1.pdf' },
  { id: 'r7', title: '嵌入式工具链模板工程', desc: '统一目录结构、编译脚本与调试配置。', format: 'ZIP', module: '工具链与工程化', tags: ['工具链', '工程化'], updatedAt: '2026-05-12', url: '/downloads/toolchain-template.zip' },
]

const baseItems = computed(() =>
  items.filter((item) => {
    const typeOk = fileType.value === 'all' || item.format === fileType.value
    const moduleOk = moduleFilter.value === 'all' || item.module === moduleFilter.value
    return typeOk && moduleOk
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
</script>
