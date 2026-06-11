import { viteBundler } from '@vuepress/bundler-vite'
import { defineUserConfig } from 'vuepress'
import { plumeTheme } from 'vuepress-theme-plume'
import plumeThemeConfig from './plume.config.js'

const base = process.env.VUEPRESS_BASE ?? '/'

export default defineUserConfig({
  lang: 'zh-CN',
  // 默认按根路径部署，适合 Cloudflare Pages / 自定义域名。
  // 如果部署到子路径，例如 GitHub Pages 仓库页，再用 VUEPRESS_BASE 覆盖。
  base,
  title: '凌云工坊',
  description: '嵌入式教程体系、技术笔记、资料库与案例实战分享',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: `${base}images/logo/skyforge-logo-icon.png` }],
    ['meta', { name: 'author', content: 'SkyForge' }],
    ['script', {
      defer: true,
      src: 'https://um.zerseager.com/script.js',
      'data-website-id': '674f388e-4d9f-4d68-8e83-70f6bd1d6222',
    }],
  ],
  bundler: viteBundler(),
  theme: plumeTheme(plumeThemeConfig),
})
