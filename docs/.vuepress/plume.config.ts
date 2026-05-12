import { defineThemeConfig } from 'vuepress-theme-plume'

export default defineThemeConfig({
  logo: '/logo.png',

  navbar: [
    { text: '首页', link: '/' },
    { text: '技术教程', link: '/tutorials/' },
    { text: '技术资料库', link: '/resources/' },
    { text: '电子设计', link: '/designs/' },
    { text: '周边商城', link: '/store/' },
    { text: '关于我们', link: '/about/' },
  ],

  collections: [
    {
      type: 'doc',
      dir: 'tutorials',
      title: '技术教程',
      link: '/tutorials/',
    },
    {
      type: 'doc',
      dir: 'designs',
      title: '电子设计',
      link: '/designs/',
    },
  ],

  sidebar: {
    '/tutorials/stm32/': [{ text: 'STM32 系列教程', items: 'auto' }],
    '/tutorials/esp32/': [{ text: 'ESP32 系列教程', items: 'auto' }],
    '/tutorials/arduino/': [{ text: 'Arduino 系列教程', items: 'auto' }],
    '/tutorials/arm/': [{ text: 'ARM 系列教程', items: 'auto' }],
    '/tutorials/circuit/': [{ text: '电路设计资料', items: 'auto' }],
  },

  search: {
    provider: 'local',
    miniSearch: {
      options: {
        extractField: (document: Record<string, unknown>, fieldName: string) => {
          // Keep only page-level titles (no heading anchors), remove section-level indexing.
          if (fieldName !== 'title') return ''
          const id = String(document.id ?? '')
          if (id.includes('#')) return ''
          return String(document.title ?? '')
        },
      },
    },
  },

  footer: {
    message: '凌云工坊 SkyForge',
    copyright: 'Copyright © 2025-present SkyForge',
  },

  social: [
    { icon: 'github', link: 'https://github.com/your-username' },
  ],

  comment: {
    provider: 'Waline',
    serverURL: 'https://your-waline-server.vercel.app',
    lang: 'zh-CN',
    pageview: true,
    comment: true,
    reaction: false,
    dark: 'html[data-theme="dark"]',
  },

  plugins: {
    photoSwipe: true,
    seo: true,
    sitemap: true,
  },
})
