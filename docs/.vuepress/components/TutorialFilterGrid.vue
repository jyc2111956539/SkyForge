<template>
  <div class="tf-wrap">
    <div class="hub-search-inline">
      <input v-model.trim="keyword" class="hub-search-input" type="text" placeholder="输入关键词搜索" />
    </div>

    <div class="tf-row">
      <span class="tf-label">内容类型</span>
      <button v-for="item in typeOptions" :key="item.value" class="tf-btn" :class="{ active: contentType === item.value }" @click="contentType = item.value">
        {{ item.label }}
      </button>
    </div>

    <div class="tf-summary">共 {{ filteredItems.length }} 条内容</div>

    <div class="tutorial-list">
      <a v-for="item in filteredItems" :key="item.link" class="tutorial-item" :href="item.link">
        <div class="tutorial-item-main">
          <div class="tutorial-head">
            <span class="chip chip-type">{{ item.contentType }}</span>
            <span class="chip chip-track">{{ item.track }}</span>
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </div>
        <div class="tutorial-item-side"><span class="tutorial-arrow">查看</span></div>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Item = {
  contentType: '教程文章' | '技术文档'
  track: '嵌入式开发' | '电路设计'
  title: string
  desc: string
  link: string
}

const contentType = ref<'all' | Item['contentType']>('all')
const keyword = ref('')

const typeOptions = [
  { label: '全部', value: 'all' },
  { label: '教程文章', value: '教程文章' },
  { label: '技术文档', value: '技术文档' },
] as const

const items: Item[] = [
  { contentType: '教程文章', track: '嵌入式开发', title: 'STM32 入门：开发环境与最小工程', desc: '搭建环境并完成最小可运行工程。', link: '/tutorials/stm32/01-intro.html' },
  { contentType: '教程文章', track: '嵌入式开发', title: 'STM32 GPIO 点灯实战', desc: '从工程到外设配置的完整入门。', link: '/tutorials/stm32/02-gpio.html' },
  { contentType: '教程文章', track: '嵌入式开发', title: 'STM32 UART 串口通信', desc: '串口收发、调试与日志输出实践。', link: '/tutorials/stm32/03-uart.html' },
  { contentType: '教程文章', track: '嵌入式开发', title: 'ESP32 入门：环境搭建与串口输出', desc: '完成 ESP32 工程初始化与调试输出。', link: '/tutorials/esp32/01-intro.html' },
  { contentType: '教程文章', track: '嵌入式开发', title: 'ESP32 Wi-Fi 连接与状态监测', desc: '联网流程、重连策略与状态采集。', link: '/tutorials/esp32/02-wifi.html' },
  { contentType: '教程文章', track: '嵌入式开发', title: 'ESP32 MQTT 上云实践', desc: 'WiFi 连接、MQTT 发布订阅与重连策略。', link: '/tutorials/esp32/03-mqtt.html' },
  { contentType: '教程文章', track: '嵌入式开发', title: 'Arduino 入门：第一个传感器项目', desc: '从采集到显示的完整最小项目。', link: '/tutorials/arduino/01-intro.html' },
  { contentType: '教程文章', track: '嵌入式开发', title: 'Arduino 传感器采集与串口可视化', desc: '串口可视化与传感器数据观察。', link: '/tutorials/arduino/02-sensor.html' },
  { contentType: '教程文章', track: '嵌入式开发', title: 'Arduino OLED 显示实战', desc: 'I2C 屏驱动与页面刷新实践。', link: '/tutorials/arduino/03-oled.html' },
  { contentType: '教程文章', track: '嵌入式开发', title: 'ARM 开发入门：工具链与启动流程', desc: '从编译链到启动代码的核心路径。', link: '/tutorials/arm/01-intro.html' },
  { contentType: '教程文章', track: '嵌入式开发', title: 'ARM 裸机启动与中断向量表', desc: '向量表、异常入口与启动阶段解析。', link: '/tutorials/arm/02-startup-vector.html' },
  { contentType: '技术文档', track: '电路设计', title: '技术资料编写规范（v1.0）', desc: '统一资料结构、命名和交付标准。', link: '/tutorials/circuit/00-tech-doc-standard.html' },
  { contentType: '技术文档', track: '电路设计', title: '示例资料资料', desc: '规范示例，演示资料页面组织方式。', link: '/tutorials/circuit/02-example-material.html' },
  { contentType: '技术文档', track: '电路设计', title: '放大电路设计资料', desc: '增益、偏置与稳定性设计要点。', link: '/tutorials/circuit/01-amplifier-design.html' },
  { contentType: '技术文档', track: '电路设计', title: '滤波器设计资料', desc: '滤波拓扑、参数选型和验证流程。', link: '/tutorials/stm32/04-filter-design.html' },
  { contentType: '技术文档', track: '电路设计', title: '开关电源设计资料', desc: '电源拓扑、参数计算与调试要点。', link: '/tutorials/stm32/05-smps-design.html' },
  { contentType: '技术文档', track: '电路设计', title: '0.96/1.3寸OLED模块设计详解（I2C/SPI四版本）', desc: '四个版本 OLED 模块的设计与实测记录。', link: '/tutorials/circuit/03-oled-module-design.html' },
]

const scopedItems = computed(() => items.filter((i) => contentType.value === 'all' || i.contentType === contentType.value))

const filteredItems = computed(() => {
  const key = keyword.value.toLowerCase()
  if (!key) return scopedItems.value
  return scopedItems.value.filter((i) => `${i.title} ${i.desc}`.toLowerCase().includes(key))
})
</script>
