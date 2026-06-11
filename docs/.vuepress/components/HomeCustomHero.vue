<template>
  <section class="home-custom-hero" :style="heroStyle">
    <div class="hero-bg" :style="bgStyle" />
    <div class="hero-mask" :style="maskStyle" />

    <div class="hero-content" :style="contentStyle">
      <h1 class="hero-title" :style="titleStyle">{{ title }}</h1>
      <p class="hero-subtitle" :style="subtitleStyle">{{ subtitle }}</p>
      <p class="hero-desc" :style="descStyle">{{ description }}</p>

      <VPCardGrid :cols="{ sm: 1, md: 2, lg: 4 }" class="hero-grid" :style="gridStyle">
        <a class="hero-card-link" :href="withBase('/tutorials/')">
          <VPCard title="教程体系">
            <template #title>
              <header class="hero-card-title">
                <span class="hero-card-emoji">📖</span>
                <span class="hero-card-title-text">教程体系</span>
              </header>
            </template>
            <p class="hero-card-desc">覆盖 STM32、ESP32、Arduino 与 ARM 等主流方向，提供从环境搭建、基础外设到综合项目实战的连续学习路径。</p>
          </VPCard>
        </a>
        <a class="hero-card-link" :href="withBase('/blog/')">
          <VPCard title="技术笔记">
            <template #title>
              <header class="hero-card-title">
                <span class="hero-card-emoji">📝</span>
                <span class="hero-card-title-text">技术笔记</span>
              </header>
            </template>
            <p class="hero-card-desc">记录开发过程中的问题排查、方案取舍与实践心得，内容偏工程实战，适合快速获取可落地经验。</p>
          </VPCard>
        </a>
        <a class="hero-card-link" :href="withBase('/resources/')">
          <VPCard title="资料库">
            <template #title>
              <header class="hero-card-title">
                <span class="hero-card-emoji">📚</span>
                <span class="hero-card-title-text">资料库</span>
              </header>
            </template>
            <p class="hero-card-desc">集中整理 PDF、DOCX、ZIP 等可下载资料，按模块归类并配合标签检索，便于查阅、复用与二次开发。</p>
          </VPCard>
        </a>
        <a class="hero-card-link" :href="withBase('/cases/')">
          <VPCard title="案例实战">
            <template #title>
              <header class="hero-card-title">
                <span class="hero-card-emoji">🔧</span>
                <span class="hero-card-title-text">案例实战</span>
              </header>
            </template>
            <p class="hero-card-desc">展示电子与软件项目案例，包含方案简介、设计思路与关键资料入口，支持预览浏览和深入查看。</p>
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
  image: '/images/home/SkyForgeHomePage1.jpg',
  maskOpacity: 0.22,
  maskColor: '#0b1220',
  contentX: '50%',
  contentY: '35%',
  title: '凌云工坊',
  subtitle: 'SkyForge',
  description: '嵌入式教程体系 · 技术笔记 · 资料库 · 案例实战',
  titleSize: '76px',
  subtitleSize: '54px',
  descSize: '24px',
  contentAlign: 'center',
  cardOffsetY: '40px',
})

const heroStyle = computed(() => ({
  minHeight: '100vh',
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
  min-height: 100vh;
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
  background: rgba(15, 23, 42, 0.38);
  border: 1px solid rgba(255, 255, 255, 0.36);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.hero-card-link :deep(.vp-card-wrapper .title) {
  justify-content: flex-start;
  text-align: left;
}

.hero-card-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #e2e8f0;
}

.hero-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hero-card-emoji {
  font-size: 18px;
  line-height: 1;
}

.hero-card-title-text {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
  color: #fff;
}

.hero-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 14px;
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
  .home-custom-hero {
    min-height: auto;
    overflow: visible;
    padding-top: calc(var(--vp-nav-height) + 24px);
    padding-bottom: 76px;
  }

  .hero-bg,
  .hero-mask {
    position: fixed;
  }

  .hero-content {
    position: relative;
    left: auto !important;
    top: auto !important;
    transform: none !important;
    margin: 0 auto;
    width: min(96vw, 96vw);
    max-width: min(96vw, 96vw);
  }

  .hero-grid {
    width: 100%;
  }

  .hero-card-title-text {
    font-size: 22px;
  }

  .hero-footer {
    position: relative;
    bottom: auto;
    margin-top: 20px;
    font-size: 12px;
  }
}
</style>
