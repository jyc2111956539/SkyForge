---
title: 把普通ATMEGA328P单片机烧写为Arduino开发板
createTime: 2026/05/19 21:00:00
permalink: /blog/arduino/burn-atmega328p-arduino/
tags:
  - Arduino
  - ATMEGA328P
  - 烧录
  - USBasp
---

# 把普通ATMEGA328P单片机烧写为Arduino开发板

## 一、简介

在 Arduino 开发中，我们经常会遇到以下场景：

1. 使用的是全新 ATMEGA328P 空片，没有 Bootloader。
2. 原有 Bootloader 异常，串口下载程序失败。
3. 需要重新配置熔丝位（Fuse）或更换引导文件。

这时就需要通过 ISP 方式对 ATMEGA328P 进行烧录。
通常 Arduino 安装目录中已经包含常见 AVR 板卡所需的引导文件，例如 UNO 对应的 `optiboot_atmega328.hex`。
如果说没有就需要自己找固件，比如STM32这样的就需要自己去网上找固件，例如：https://github.com/rogerclarkmelbourne/Arduino_STM32)

## 二、硬件准备与连接

### 2.1 准备清单

1. ATMEGA328P 单片机（或 Arduino UNO 板载 ATMEGA328P）
2. 烧录器（推荐 USBasp）
3. 杜邦线若干
4. 稳定的 5V 供电

### 2.2 常见烧录方式

1. 使用 USBtinyISP 编程器
2. 使用 USBasp 编程器
3. 使用 Arduino 作为 ISP 编程器

本文以 USBasp 为例进行说明。

### 2.3 接口定义与连线

USBasp 常见 10Pin ISP 口信号包括：

<img src="https://file.seecpp.top/seecpp/2026/05/27faf5786c3078b4032c7bd3a395a2ed.png" width="280" />

Arduino UNO 标准 6Pin ISP 口定义如下：

<img src="https://file.seecpp.top/seecpp/2026/05/9fc7d0c355da82e53e653bb68a5bb1e7.png" width="280" />

### 2.4 对应关系（USBasp -> ATMEGA328P/UNO）

| USBasp | 目标端 |
|---|---|
| MOSI | MOSI |
| MISO | MISO |
| SCK | SCK |
| RESET | RESET |
| VCC | 5V |
| GND | GND |

## 三、烧录前准备

### 3.1 确认 Bootloader 文件与熔丝位参数

如果是常用的单片机(Arduino软件内部支持)，以Arduino UNO为例，可在 Arduino 安装目录下查看：

- `hardware/arduino/avr/boards.txt`
- `hardware/arduino/avr/bootloaders/optiboot/optiboot_atmega328.hex`

常见 UNO 参数（请以你本机 `boards.txt` 为准）：

- `low_fuses=0xFF`
- `high_fuses=0xDE`
- `extended_fuses=0xFD`

![](https://file.seecpp.top/seecpp/2026/05/45342b6652faee5a5b042d8b9c4163f2.png)

### 3.2 准备烧录软件

可选工具：

1. avrfighter
2. progisp（常见可用版本：1.72）

本文使用 `progisp` 演示流程。

### 3.3 驱动说明

USBasp 在部分 Windows 系统上驱动兼容性一般。若识别异常：

1. 重新安装 USBasp 驱动
2. 更换 USB 口
3. 在设备管理器确认设备已正常识别

## 四、烧录步骤（以 progisp 为例）

1. 连接 USBasp 与目标 ATMEGA328P，确认供电正常。
2. 打开 `progisp`，选择芯片型号：`ATmega328P`。
3. 先读取一次当前熔丝位并记录（建议备份）。
4. 按 `boards.txt` 填入低/高/扩展熔丝位。
5. 写入熔丝位后，再读取核对是否一致。
6. 选择 Flash 文件：`optiboot_atmega328.hex`。
7. 确认烧录选项（避免误勾选错误项）。
8. 执行烧录，等待完成提示。

![](https://file.seecpp.top/seecpp/2026/05/0a3ddf42eace3976868ee1373c1c7ae3.png)

## 五、烧录后验证

1. 断电重启目标板。
2. 打开 Arduino IDE，选择 `Arduino Uno` 板型与对应串口。
3. 上传 `Blink` 示例验证。
4. 若可正常下载并运行，说明烧录成功。

## 六、常见问题排查

### 6.1 识别不到芯片

- 检查 MOSI/MISO/SCK/RESET 是否接反
- 检查 VCC/GND 是否可靠
- 检查 USBasp 驱动状态

### 6.2 熔丝位写入后无法继续通信

- 大概率为熔丝位配置错误（尤其时钟相关位）
- 需按正确时钟条件恢复，严重时需高压编程方式救援

### 6.3 Bootloader 烧录成功但串口上传失败

- 检查串口芯片驱动（如 CH340/FT232）
- 检查板型、端口选择是否正确
- 检查自动复位电路

## 七、总结

ATMEGA328P 烧录的核心是三点：

1. 接线正确
2. 熔丝位正确
3. 引导文件正确

建议将成功参数和流程保存为模板，后续批量烧录会更稳定高效。
