# sky-forge

The site is built with [VuePress](https://vuepress.vuejs.org/) and [vuepress-theme-plume](https://github.com/pengzhanbo/vuepress-theme-plume).

## Install

```sh
npm i
```

## Usage

```sh
# sync resource items generated from .resource.yml
npm run resources:sync

# start dev server
npm run docs:dev

# build for production
npm run docs:build

# preview production build locally
npm run docs:preview

# update vuepress and theme
npm run vp-update
```

## Sync + Start

```sh
# 1) sync resource library items
npm run resources:sync

# 2) start local dev server
npm run docs:dev
```

## Resource Sync Mode

`resources:sync` uses **remote API mode** by default, which does **not** clone the full resource repository.

```sh
# default (recommended): remote API mode, no git clone
npm run resources:sync

# optional fallback: clone mode
RESOURCE_SYNC_MODE=clone npm run resources:sync
```

## Encoding Guard

```sh
# install pre-commit hook once
npm run hooks:install

# run manual encoding check
npm run check:encoding
```

## Documents

- [VuePress](https://vuepress.vuejs.org/)
- [vuepress-theme-plume](https://theme-plume.vuejs.press/)
