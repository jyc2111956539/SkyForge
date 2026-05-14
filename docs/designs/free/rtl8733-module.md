---
title: RTL8733模块
createTime: 2026/05/13 00:00:00
tags:
  - RTL8733
  - WiFi
  - 蓝牙
  - USB
excerpt: 基于RTL8733模组的USB蓝牙WiFi二合一模块，适配RK3506等无多余SDIO接口的开发板
permalink: /designs/l47we44x/
---

# RTL8733模块

## 项目简介
基于 RTL8733 模组的 USB 蓝牙 WiFi 二合一模块，主要用于 RK3506 等无多余 SDIO 接口的开发板，
通过 USB 即可补齐无线连接能力。

## 功能特点
- WiFi + 蓝牙二合一，减少外围模块数量
- USB 接口接入，适合无额外 SDIO 资源的主控平台
- 适合做联网调试、蓝牙配网和无线外设扩展

## 适用场景
- RK3506 等开发板无线能力补充
- 工控/网关设备的快速联网改造
- 便携设备的蓝牙通信与WiFi接入

## 接口与使用说明（简要）
- 与主控连接：USB
- 供电：由 USB 侧提供（请按你实际硬件设计为准）
- 软件侧：加载对应驱动后可识别为无线网卡/蓝牙设备

## 预览图
![RTL8733模块预览图](https://file.seecpp.top/seecpp/2026/05/1760cfacc5e5544e7a6da3d0e71b3678.png)

