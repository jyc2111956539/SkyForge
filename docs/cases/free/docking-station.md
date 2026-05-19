---
title: 0.96/1.3寸OLED模块
createTime: 2025/01/24 00:00:00
cover: https://file.seecpp.top/seecpp/2026/05/ba82d5f4e5a178d921c3a56516f9e0ba.png
tags:
  - OLED
  - 显示模块
  - 开源硬件
excerpt: 四版本OLED显示模块（0.96/1.3寸、I2C/SPI），统一3.3V供电，适配嵌入式状态显示与人机交互
permalink: /cases/99jitvj6/
comments: true
---

# 0.96/1.3寸OLED模块

## 项目简介
这是一个统一接口思路的 OLED 小模块系列，共 4 个版本：

1. 0.96寸 I2C 版本
2. 0.96寸 SPI 版本
3. 1.3寸 I2C 版本
4. 1.3寸 SPI 版本

模块统一使用 `SC662K-3.3V` 作为稳压，方便在 5V 输入场景下稳定驱动 3.3V OLED 与逻辑电平。
当前硬件版本已测试 `SSD1306` 与 `SH1106` 两种控制器均可正常使用。

## 适用场景
- 便携仪表数据显示
- 电源与电池状态监控
- 开发板调试信息展示
- 小尺寸人机交互界面扩展

## 关键特性

- 双尺寸覆盖：0.96寸 + 1.3寸
- 双通信覆盖：I2C + SPI
- 已测试兼容：`SSD1306`、`SH1106`
- 统一供电策略：`SC662K-3.3V`
- 便于复用：接口与布局风格保持一致，降低多型号切换成本

## 接口说明（建议）

1. I2C 版：`VCC / GND / SCL / SDA`
2. SPI 版：`VCC / GND / SCK / MOSI / CS / DC / RST`

> 具体引脚定义以你上传的原理图和 PCB 丝印为准。

## 注意事项
- I2C版本的地址选择电阻根据实际需求焊接其中一个，不可两个同时焊接

## 开源资料

- OLED 数据手册（ZIP）：[下载](https://file.seecpp.top/seecpp/2026/05/8c582257c83a29331e23e41df15d9f0d.zip)
- 四套电路工程源文件（ZIP）：[下载](https://file.seecpp.top/seecpp/2026/05/6270a6dc056e78997958ff2935422039.zip)
- 原理图：已包含在工程源文件中
- PCB：已包含在工程源文件中
- BOM：可从工程中导出

## 详细技术文档

完整设计说明见：
[0.96/1.3寸OLED模块设计详解（I2C/SPI四版本）](/tutorials/circuit/03-oled-module-design.html)

## 接口版本实物图

### I2C 版本

<img src="https://file.seecpp.top/seecpp/2026/05/5e9b8932969b4fa28d138c29702cd2ab.png" alt="I2C版本实物图" width="520" />

### SPI 版本

<img src="https://file.seecpp.top/seecpp/2026/05/550f0ccd5100522faa7ee20552b16be4.png" alt="SPI版本实物图" width="520" />
