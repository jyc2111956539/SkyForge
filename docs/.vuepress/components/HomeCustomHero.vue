<template>
  <section class="home-custom-hero" :style="heroStyle">
    <div class="hero-bg" :style="bgStyle" />
    <div class="hero-mask" :style="maskStyle" />

    <div class="hero-content" :style="contentStyle">
      <h1 class="hero-title" :style="titleStyle">{{ title }}</h1>
      <p class="hero-subtitle" :style="subtitleStyle">{{ subtitle }}</p>
      <p class="hero-desc" :style="descStyle">{{ description }}</p>

      <VPCardGrid :cols="{ sm: 1, md: 2, lg: 4 }" class="hero-grid" :style="gridStyle">
        <a class="hero-card-link" href="/tutorials/">
          <VPCard icon="📖" title="技术教程">
            <p class="hero-card-desc">系列化学习路径，从入门到实战。</p>
          </VPCard>
        </a>
        <a class="hero-card-link" href="/blog/">
          <VPCard icon="📝" title="技术文章">
            <p class="hero-card-desc">经验总结与实践记录，持续更新。</p>
          </VPCard>
        </a>
        <a class="hero-card-link" href="/resources/">
          <VPCard icon="📚" title="技术资料库">
            <p class="hero-card-desc">文档与源文件下载，便于快速复用。</p>
          </VPCard>
        </a>
        <a class="hero-card-link" href="/designs/">
          <VPCard icon="🔧" title="案例实战">
            <p class="hero-card-desc">硬件与软件案例，支持预览与详情阅读。</p>
          </VPCard>
        </a>
      </VPCardGrid>
    </div>

    <footer class="hero-footer">
      <p>凌云工坊 SkyForge</p>
      <p>Copyright © 2025-present SkyForge</p>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vuepress/client'

interface Props {
  image?: string
  maskOpacity?: number
  maskColor?: string
  contentX?: string
  contentY?: string
  title?: string
  subtitle?: string
  description?: string
  titleSize?: string
  subtitleSize?: string
  descSize?: string
  contentAlign?: 'left' | 'center'
  cardOffsetY?: string
}

const props = withDefaults(defineProps<Props>(), {
  image: '/public/images/home/SkyForgeHomePage1.jpg',
  maskOpacity: 0.28,
  maskColor: '#0b1220',
  contentX: '50%',
  contentY: '35%',
  title: '凌云工坊',
  subtitle: 'SkyForge',
  description: '嵌入式技术教程 · 技术资料库 · 案例实战分享',
  titleSize: '72px',
  subtitleSize: '52px',
  descSize: '24px',
  contentAlign: 'center',
  cardOffsetY: '24px',
})

const heroStyle = computed(() => ({
  height: '100vh',
}))

const bgStyle = computed(() => ({
  backgroundImage: `url(${withBase(props.image)})`,
}))

const maskStyle = computed(() => ({
  backgroundColor: props.maskColor,
  opacity: String(props.maskOpacity),
}))

const contentStyle = computed(() => ({
  left: props.contentX,
  top: `calc(${props.contentY} + var(--vp-nav-height))`,
  textAlign: props.contentAlign,
  transform: props.contentAlign === 'center' ? 'translate(-50%, -50%)' : 'translateY(-50%)',
}))

const titleStyle = computed(() => ({ fontSize: props.titleSize }))
const subtitleStyle = computed(() => ({ fontSize: props.subtitleSize }))
const descStyle = computed(() => ({ fontSize: props.descSize }))
const gridStyle = computed(() => ({ marginTop: `calc(26px + ${props.cardOffsetY})` }))
</script>

<style scoped>
.home-custom-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.hero-bg,
.hero-mask {
  position: absolute;
  inset: 0;
}

.hero-bg {
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.hero-mask {
  z-index: 1;
}

.hero-content {
  position: absolute;
  z-index: 2;
  width: min(1320px, 92vw);
  max-width: min(1320px, 92vw);
}

.hero-title {
  margin: 0;
  line-height: 1.05;
  font-weight: 800;
  color: #0f172a;
  text-shadow: 0 6px 24px rgba(255, 255, 255, 0.35);
}

.hero-subtitle {
  margin: 8px 0 0;
  line-height: 1.08;
  font-weight: 700;
  color: #1e293b;
  text-shadow: 0 4px 18px rgba(255, 255, 255, 0.32);
}

.hero-desc {
  margin: 16px 0 0;
  line-height: 1.55;
  color: #334155;
  text-shadow: 0 3px 10px rgba(255, 255, 255, 0.28);
}

.hero-grid {
  width: 100%;
}

.hero-card-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.hero-card-link :deep(.vp-card-wrapper) {
  min-height: 170px;
  text-align: left;
  color: #f8fafc;
}

.hero-card-link :deep(.vp-card-wrapper .title) {
  justify-content: flex-start;
  text-align: left;
  color: #ffffff;
}

.hero-card-link :deep(.vp-card-wrapper .body) {
  text-align: left;
  color: #e2e8f0;
}

.hero-card-link :deep(.vp-card-wrapper .title .text) {
  color: #ffffff;
}

.hero-card-link :deep(.vp-card-wrapper .title .vp-icon),
.hero-card-link :deep(.vp-card-wrapper .title .vp-icon-img) {
  color: #ffffff;
}

.hero-card-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #e2e8f0;
}

.hero-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 18px;
  z-index: 2;
  text-align: center;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  font-size: 14px;
  line-height: 1.6;
}

.hero-footer p {
  margin: 0;
}

@media (max-width: 960px) {
  .hero-content {
    left: 50% !important;
    right: auto;
    top: calc(35% + var(--vp-nav-height)) !important;
    transform: translate(-50%, -50%) !important;
    max-width: min(96vw, 96vw);
  }

  .hero-grid {
    width: 100%;
  }

  .hero-footer {
    bottom: 10px;
    font-size: 12px;
  }
}
</style>
