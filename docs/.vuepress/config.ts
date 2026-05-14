import { viteBundler } from '@vuepress/bundler-vite'
import { defineUserConfig } from 'vuepress'
import { plumeTheme } from 'vuepress-theme-plume'
import plumeThemeConfig from './plume.config.js'

const isProd = process.env.NODE_ENV === 'production'

export default defineUserConfig({
  lang: 'zh-CN',
  // 本地开发用 '/'，GitHub Pages 仓库页构建时用 '/skyforge/'
  base: isProd ? '/skyforge/' : '/',
  title: '凌云工坊',
  description: '嵌入式技术教程与案例实战分享',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'author', content: 'SkyForge' }],
  ],
  bundler: viteBundler(),
  theme: plumeTheme(plumeThemeConfig),
})
