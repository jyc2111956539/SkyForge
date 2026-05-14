import { defineThemeConfig } from 'vuepress-theme-plume'

export default defineThemeConfig({
  logo: '/logo.png',

  navbar: [
    { text: '首页', link: '/' },
    { text: '技术教程', link: '/tutorials/' },
    { text: '技术文章', link: '/blog/' },
    { text: '技术资料库', link: '/resources/' },
    { text: '案例实战', link: '/designs/' },
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
      type: 'post',
      dir: 'blog',
      title: '技术文章',
      link: '/blog/',
    },
    {
      type: 'doc',
      dir: 'designs',
      title: '案例实战',
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
          // Keep index IDs intact; only index page-level titles for searchable content.
          if (fieldName === 'id') return String(document.id ?? '')
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
    provider: 'Giscus',
    comment: true,
    repo: 'jyc2111956539/SkyForge',
    repoId: 'R_kgDOSbNuCA',
    category: 'General',
    categoryId: 'DIC_kwDOSbNuCM4C83S7',
    mapping: 'pathname',
    strict: false,
    reactionsEnabled: true,
    inputPosition: 'bottom',
    lang: 'zh-CN',
    lazyLoading: true,
  },

  plugins: {
    photoSwipe: true,
    seo: true,
    sitemap: true,
  },
})
