<template>
  <div class="bulletin-content-wrap">
    <p>欢迎扫码关注 “AISEE 工程实践” 公众号。</p>
    <ul>
      <li>获取最新的项目实践分享</li>
      <li>获取方法论总结</li>
      <li>获取 AI Engineering、OpenSpec、Compound Engineering 与 AISEE workflows 的相关更新</li>
    </ul>

    <div class="bulletin-qr-wrap">
      <div class="bulletin-qr-card">
        <img
          class="bulletin-qr-image"
          :src="withBase('/images/home/aisee-wechat-qr.jpg')"
          alt="AISEE 公众号二维码"
        >
      </div>
    </div>

    <p class="bulletin-qr-tip">长按识别二维码，及时获取最新更新</p>
  </div>
</template>

<script setup lang="ts">
import { withBase } from 'vuepress/client'
</script>
