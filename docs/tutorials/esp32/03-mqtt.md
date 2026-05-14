---
title: ESP32 MQTT 通信
createTime: 2025/01/03 00:00:00
permalink: /tutorials/esp32/03-mqtt/
---

# ESP32 MQTT 通信

## 目标
- 连接 MQTT Broker
- 发布与订阅消息
- 处理掉线重连

## 准备
- 已联网的 ESP32
- MQTT 服务地址与主题

## 步骤
1. 初始化客户端并连接 Broker。
2. 发布测试消息验证上行。
3. 订阅主题验证下行并回调处理。
