<template>
  <div>
    <div class="hub-search-inline">
      <input v-model.trim="keyword" class="hub-search-input" type="text" placeholder="输入关键词搜索" />
    </div>

    <div class="tf-summary">共 {{ filteredItems.length }} 个设计项目</div>

    <div class="design-grid compact-grid">
      <a v-for="item in filteredItems" :key="item.link" class="design-card compact-card" :href="item.link">
        <img v-if="item.cover" class="design-cover compact-cover" :src="item.cover" :alt="`${item.title}封面`" />
        <div v-else class="design-cover design-cover-empty compact-cover">封面待补充</div>
        <div class="design-body compact-body">
          <h3 :title="item.title">{{ item.title }}</h3>
          <p class="compact-desc">{{ item.desc }}</p>
          <div class="design-tags compact-tags"><span v-for="tag in item.tags" :key="`${item.link}-${tag}`">{{ tag }}</span></div>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type DesignItem = {
  title: string
  desc: string
  tags: string[]
  link: string
  cover?: string
}

const keyword = ref('')

const items: DesignItem[] = [
  { title: '智能台灯控制器', desc: '基于 STM32 的智能台灯控制方案。', tags: ['STM32', '开源'], link: '/designs/free/smart-lamp.html', cover: '/images/designs/smart-lamp.svg' },
  { title: '频闪检测仪', desc: '用于照明频闪测试的便携工具。', tags: ['检测仪', '工具'], link: '/designs/free/flicker-detector.html' },
  { title: '便携电源', desc: '适合调试场景的便携供电模块。', tags: ['电源'], link: '/designs/free/portable-power.html' },
  { title: 'USB转串口模块', desc: '开发调试常用串口转换模块。', tags: ['USB', '串口'], link: '/designs/free/usb-uart.html' },
  { title: '电池内阻仪', desc: '用于电池筛选与健康评估。', tags: ['电池测试'], link: '/designs/free/battery-ir-meter.html' },
  { title: '0.96/1.3寸OLED模块', desc: 'I2C/SPI 四版本 OLED 模块。', tags: ['OLED', '显示'], link: '/designs/free/docking-station.html' },
  { title: 'Mini示波器（预览）', desc: '掌上示波器项目预览页，完整资料通过付费交付。', tags: ['付费', '预览', '便携'], link: '/designs/paid/mini-oscilloscope.html', cover: '/images/designs/mini-oscilloscope.svg' },
]

const filteredItems = computed(() => {
  const key = keyword.value.toLowerCase()
  if (!key) return items
  return items.filter((item) => `${item.title} ${item.desc} ${item.tags.join(' ')}`.toLowerCase().includes(key))
})
</script>
