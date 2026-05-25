# sky-forge

网站基于 [VuePress](https://vuepress.vuejs.org/) 和 [vuepress-theme-plume](https://github.com/pengzhanbo/vuepress-theme-plume) 构建。

## 安装

```sh
npm i
```

## 使用

```sh
# 同步由 .resource.yml 生成的资料条目
npm run resources:sync

# 启动开发服务器
npm run docs:dev

# 构建生产版本
npm run docs:build

# 本地预览生产构建
npm run docs:preview

# 更新 vuepress 与主题
npm run vp-update
```

## 同步 + 启动

```sh
# 1) 同步资料库条目
npm run resources:sync

# 2) 启动本地开发服务
npm run docs:dev
```

## 资料同步模式

`resources:sync` 默认使用 **远程 API 模式**，**不会**克隆整个资料仓库。

```sh
# 默认（推荐）：远程 API 模式，不克隆
npm run resources:sync

# 可选兜底：克隆模式
RESOURCE_SYNC_MODE=clone npm run resources:sync
```

## 编码检查

```sh
# 安装一次 pre-commit 钩子
npm run hooks:install

# 手动执行编码检查
npm run check:encoding
```

## 网站仓库提交

```sh
# 1) 本地提交
git add .
git commit -m "提交说明"

# 2) 推送到 Gitee
git push origin master

# 3) 推送到 GitHub
git push github master
```

## 文档

- [VuePress](https://vuepress.vuejs.org/)
- [vuepress-theme-plume](https://theme-plume.vuejs.press/)
