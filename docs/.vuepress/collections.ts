import { defineCollection, defineCollections } from 'vuepress-theme-plume'

const blog = defineCollection({
  type: 'post',
  dir: 'blog',
  title: 'Blog',
  link: '/blog/',
})

const demoDoc = defineCollection({
  type: 'doc',
  dir: 'demo',
  linkPrefix: '/demo',
  title: 'Demo',
  sidebar: ['', 'foo', 'bar'],
})

export default defineCollections([
  blog,
  demoDoc,
])
