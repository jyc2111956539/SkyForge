<template>
  <VPCard>
    <VPCardGrid :cols="{ sm: 1, md: 2, lg: 4 }" class="case-showcase-grid">
      <a v-for="item in items" :key="item.href" class="case-showcase-card" :href="item.href">
        <img class="case-showcase-cover" :src="item.image || '/images/designs/placeholder.svg'" :alt="`${item.title}封面`" />
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
}

const items: CaseItem[] = [
  { title: '智能台灯控制器', description: '基于 STM32 的智能台灯控制方案。', href: '/designs/free/smart-lamp.html', image: '/images/designs/smart-lamp.svg' },
  { title: '频闪检测仪', description: '用于对光源或屏幕的频闪检测的便携工具。', href: '/designs/free/flicker-detector.html', image: 'https://file.seecpp.top/seecpp/2026/05/5fcccc4e4c426a8a8d3561a34bf5645e.jpg' },
  { title: '便携电源', description: '适合调试场景的便携供电模块。', href: '/designs/free/portable-power.html' },
  { title: '桌面AI助手', description: '开发中。', href: '/designs/free/desktop-ai-assistant.html' },
  { title: 'USB转串口模块', description: '开发调试常用串口转换模块。', href: '/designs/free/usb-uart.html' },
  { title: '多功能彩屏台历', description: '开发中。', href: '/designs/free/color-calendar.html', image: 'https://file.seecpp.top/seecpp/2026/05/d4ad98bc92f7b9ede4c76f0e5a560010.png' },
  { title: 'RTL8733模块', description: '基于 RTL8733 模组的 USB 蓝牙 Wi-Fi 二合一模块。', href: '/designs/free/rtl8733-module.html', image: 'https://file.seecpp.top/seecpp/2026/05/1760cfacc5e5544e7a6da3d0e71b3678.png' },
  { title: '轻量级个人使用电子ERP系统', description: '主要面向个人爱好者使用的电子 ERP，功能较为简单。', href: '/designs/free/personal-electronics-erp.html' },
  { title: '0.96/1.3寸OLED模块', description: 'I2C/SPI 四版本 OLED 模块。', href: '/designs/free/docking-station.html' },
  { title: 'Mini示波器（预览）', description: '掌上示波器项目预览页，完整资料通过付费交付。', href: '/designs/paid/mini-oscilloscope.html', image: '/images/designs/mini-oscilloscope.svg' },
]
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
