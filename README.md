# 凌云工坊 SkyForge

凌云工坊（SkyForge）是一个面向嵌入式开发者、电子设计爱好者和工程实践学习者的技术分享站点。

这个仓库既是网站源码，也是内容仓库。站点围绕“学得会、下得到、做得出”组织内容：用教程建立基础能力，用技术笔记沉淀问题经验，用资料库降低查找成本，用案例实战连接真实项目。

## 项目定位

SkyForge 不是单纯的博客，也不是只堆下载链接的资料站。它更接近一个长期维护的嵌入式工程知识库：

- 教程体系：覆盖 STM32、ESP32、Arduino、ARM、电路设计等方向，强调步骤可复现。
- 技术笔记：记录开发过程中的工具使用、烧录配置、库导入、问题排查和工程经验。
- 资料库：整理 PDF、DOCX、ZIP 等下载型资料，按模块和标签检索。
- 案例实战：展示硬件、固件、软件结合的项目案例，沉淀方案选择、接口约束和后续规划。
- 周边商城：预留给板卡、工具、套件和项目配套内容。

## 主要功能

| 模块 | 路径 | 说明 |
|---|---|---|
| 首页 | `docs/README.md` | 站点入口与品牌展示 |
| 教程体系 | `docs/tutorials/` | 按系列组织的嵌入式与电路教程 |
| 技术笔记 | `docs/blog/` | 按时间归档的技术文章 |
| 资料库 | `docs/resources/` | 可检索的下载型资料条目 |
| 案例实战 | `docs/cases/` | 软硬件项目案例展示 |
| 周边商城 | `docs/store/` | 商城入口与后续扩展 |
| 内部规范 | `standards/` | 内容写作、案例、资料库维护规范 |
| 自动化脚本 | `scripts/` | 资源同步、编码检查、Git hooks |

## 技术栈

- VuePress 2
- vuepress-theme-plume
- Vite bundler
- TypeScript / Vue 3
- Node.js 20.19+ 或 22+

## 快速开始

### 1. 安装依赖

```sh
npm install
```

### 2. 同步资料库条目

```sh
npm run resources:sync
```

### 3. 启动本地开发服务

```sh
npm run docs:dev
```

### 4. 构建生产版本

```sh
npm run docs:build
```

### 5. 本地预览构建结果

```sh
npm run docs:preview
```

如果在 Windows PowerShell 中遇到 `npm.ps1 cannot be loaded`，可以改用：

```sh
npm.cmd run docs:dev
npm.cmd run docs:build
```

## 常用脚本

| 命令 | 说明 |
|---|---|
| `npm run docs:dev` | 启动 VuePress 开发服务器 |
| `npm run docs:dev-clean` | 清理缓存后启动开发服务器 |
| `npm run docs:build` | 构建生产版本 |
| `npm run docs:preview` | 本地预览生产构建 |
| `npm run resources:sync` | 从资料仓库同步资料条目 |
| `npm run check:encoding` | 检查文本编码 |
| `npm run hooks:install` | 安装 Git pre-commit 钩子 |
| `npm run vp-update` | 更新 VuePress 与主题相关依赖 |

## 目录结构

```text
.
├─ docs/
│  ├─ .vuepress/              # VuePress 与主题配置
│  ├─ blog/                   # 技术笔记
│  ├─ cases/                  # 案例实战
│  ├─ public/                 # 静态资源
│  ├─ resources/              # 资料库页面与同步生成条目
│  ├─ store/                  # 周边商城页面
│  └─ tutorials/              # 教程体系
├─ scripts/                   # 自动化脚本
├─ standards/                 # 内容维护规范
├─ package.json
└─ README.md
```

## 内容维护约定

### 教程

教程放在 `docs/tutorials/<series>/` 下，适合系统性学习内容。教程应尽量包含目标、环境、步骤、验证方式和常见问题。

### 技术笔记

技术笔记放在 `docs/blog/` 下，适合记录某个具体问题、工具流程或经验结论。文章应包含 `title`、`createTime`、`permalink`、`tags` 等 frontmatter。

### 案例实战

案例放在 `docs/cases/` 下，适合展示完整项目。建议写清场景、约束、方案、硬件或软件组成、实施过程、结果和后续规划。

### 资料库

资料库条目位于 `docs/resources/items/`。推荐通过 `npm run resources:sync` 从资料仓库同步生成，避免手工维护下载链接和元数据。

## Frontmatter 约定

常用字段示例：

```yaml
---
title: 光源频闪检测仪
createTime: 2026/05/20 10:00:00
permalink: /cases/flicker-detector/
tags:
  - STM32
  - 频闪
  - 检测仪
excerpt: 基于 STM32 的光源频闪检测项目。
---
```

`permalink` 应保持稳定、唯一、语义清晰。案例建议使用 `/cases/<slug>/`，教程建议使用 `/tutorials/<series>/<slug>/`，技术笔记建议使用 `/blog/<category>/<slug>/`。

## 资料库同步

`resources:sync` 默认使用远程 API 模式，不会克隆完整资料仓库。

```sh
# 默认：远程 API 模式
npm run resources:sync

# 可选：克隆模式
RESOURCE_SYNC_MODE=clone npm run resources:sync
```

可用环境变量：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `RESOURCE_REPO_URL` | `https://gitee.com/ching_an/sky-forge-work-file.git` | 资料仓库地址 |
| `RESOURCE_SOURCE_DIR` | `技术资料` | 资料源目录 |
| `RESOURCE_REPO_REF` | `master` | 资料仓库分支 |
| `RESOURCE_SYNC_MODE` | `remote` | 同步模式：`remote` 或 `clone` |
| `RESOURCE_SYNC_STRICT` | `1` | 是否严格校验资料元数据 |
| `RESOURCE_ITEMS_DIR` | `docs/resources/items` | 生成条目目录 |

## 编码与提交检查

本仓库包含编码检查脚本，用于减少中文内容在 Windows 环境下出现乱码。

```sh
npm run check:encoding
npm run hooks:install
```

建议在提交前至少执行：

```sh
npm run check:encoding
npm run docs:build
```

## 部署说明

生产构建命令：

```sh
npm run docs:build
```

构建产物位于：

```text
docs/.vuepress/dist
```

当前配置在生产环境使用 `/skyforge/` 作为 base，适合部署到 GitHub Pages 仓库页。如果部署到根域名，需要调整 `docs/.vuepress/config.ts` 中的 `base` 配置。

## 贡献方式

欢迎提交以下类型的贡献：

- 修正文档错别字、失效链接或图片路径。
- 补充教程步骤、验证方法和常见问题。
- 增加案例实战的硬件信息、固件说明、测试结果和复盘。
- 完善资料库条目分类、标签和描述。
- 改进站点组件、搜索体验和页面展示。

贡献前建议先查看 `standards/` 下的内容规范，保持新增内容风格一致。

## 许可证

代码部分以 `package.json` 中声明的 MIT License 为准。

网站原创文章、图片、案例资料和第三方下载资料可能有各自的使用边界；涉及具体项目或第三方资料时，以对应页面说明为准。

## 相关文档

- [VuePress](https://vuepress.vuejs.org/)
- [vuepress-theme-plume](https://theme-plume.vuejs.press/)
- [Vite](https://vite.dev/)
