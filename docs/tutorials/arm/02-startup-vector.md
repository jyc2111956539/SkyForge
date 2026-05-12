---
title: ARM 裸机启动与中断向量表
createTime: 2026/05/11 23:40:20
permalink: /tutorials/arm/02-startup-vector.html
---

# ARM 裸机启动与中断向量表

本资料聚焦裸机项目最关键的启动阶段：

1. 启动汇编的职责划分
2. 向量表布局与重定位思路
3. 异常与中断入口函数组织方式
4. 初始化顺序与常见坑位

适合用来建立可复用的 ARM 裸机工程模板。
