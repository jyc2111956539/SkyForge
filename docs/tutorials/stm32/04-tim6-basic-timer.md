---
title: STM32 基本定时器 TIM6：定时中断与 PSC/ARR 计算
createTime: 2026/05/14 11:34:37
permalink: /tutorials/stm32/04-tim6-basic-timer/
---
# STM32 基本定时器 TIM6：定时中断与 PSC/ARR 计算

> **系列**：外设基础系列  
> **难度等级**：⭐⭐☆☆☆  
> **适用芯片**：STM32F103xx（其他系列差异见文末说明）  
> **开发环境**：STM32CubeIDE 1.x + HAL 库  
> **前置知识**：中断基础概念（抢占与响应）、STM32 时钟树与 APB1 频率、GPIO 点灯与串口 `printf` 基础

---

## 一、前言

TIM6 可以把它当成“厨房里的机械定时器旋钮”。你先设定“每隔多久响一次”，它就会按固定节奏触发事件；这个“响一次”对应到单片机里，就是 TIM6 的更新中断到来一次。

如果不用定时器，而是靠 `HAL_Delay()` 或空循环凑时间，项目里很容易踩坑。第一个问题是 CPU 会被阻塞，其他任务响应会变慢；第二个问题是延时精度受代码路径和中断影响，时间久了会漂移；第三个问题是后期维护困难，功能一多就很难保证节拍一致。

本文会让你完成一个明确实验：配置 **TIM6 每 500ms 触发一次更新中断**，在回调里翻转 **PC13 LED**，并通过串口每秒打印已运行秒数。你可以用 LED 闪烁频率和串口秒计数两种现象同时验证功能是否正确。

---

## 二、原理讲解

### 2.1 工作原理

**一句话核心**：TIM6 通过时钟分频（PSC）和自动重装（ARR）累计计数，计满后产生更新事件并触发中断。

```text
APB1定时器时钟
    │
    ▼
[PSC预分频器]        ← 先把高频时钟降到可控计数频率
    │
    ▼
[CNT计数器]         ← 按分频后的节拍递增计数
    │
    ▼
[ARR自动重装值]      ← CNT计到ARR后产生更新事件UEV
    │
    ▼
[TIM6中断请求]       ← 进入中断服务，再调用HAL回调
```

> 💡 **关键理解**：定时时间不是只看 ARR，必须和 PSC 一起算；两者任意一个改了，周期都会变。

### 2.2 关键参数计算

基本定时器更新周期公式：

$$
T_{update}=\frac{(PSC+1)\times(ARR+1)}{f_{TIM}}
$$

若目标中断频率为 \(f_{int}\)：

$$
f_{int}=\frac{f_{TIM}}{(PSC+1)\times(ARR+1)}
$$

| 符号 | 含义 | 单位 |
|---|---|---|
| \(f_{TIM}\) | TIM6 输入时钟频率 | Hz |
| \(PSC\) | 预分频寄存器值 | 无 |
| \(ARR\) | 自动重装寄存器值 | 无 |
| \(T_{update}\) | 更新中断周期 | s |
| \(f_{int}\) | 更新中断频率 | Hz |

```text
目标：TIM6 每 500ms 触发一次中断（即 2Hz）

已知：fTIM = 72MHz（F103 常见配置下，APB1分频不为1时定时器时钟翻倍到72MHz）

推导过程：
  步骤1：先设定计数频率为10kHz，取 PSC = 7200-1 = 7199
  步骤2：需要 0.5s 周期，则计数次数 = 0.5 × 10000 = 5000
         ARR = 5000-1 = 4999

验证：Tupdate = (7199+1)×(4999+1)/72,000,000 = 0.5s  ✓
```

### 2.3 关键寄存器 / HAL 结构体

| 寄存器（HAL成员） | 作用 | 典型值/选项 |
|---|---|---|
| `htim6.Init.Prescaler` | 预分频设置 | `7199` |
| `htim6.Init.Period` | 自动重装值 ARR | `4999` |
| `htim6.Init.CounterMode` | 计数方向 | `TIM_COUNTERMODE_UP` |
| `TIM6->DIER` | 更新中断使能位 | `UIE=1` |
| `TIM6->SR` | 更新中断标志位 | `UIF` |
| `TIM6_DAC_IRQn` | TIM6/TIM7 共用中断入口 | NVIC 使能 |

> 💡 功能开发优先用 HAL 结构体配置；只有中断不进、频率异常这类问题，再去看 `DIER/SR` 等寄存器位。

### 2.4 子功能说明

本文使用的是 **TIM6 基本定时器更新中断模式**；TIM6 不带输入捕获/PWM 这些高级通道功能，这类需求要用通用定时器（如 TIM2/TIM3）后续再讲。

---

## 三、硬件说明

> 本实验无需外接任何模块，仅使用开发板板载资源。  
> 板载 LED 引脚因板型而异，常见为 PC13（最小系统板）或 PA8，请查阅你的原理图确认后修改代码中的宏定义。  
> 如需串口打印调试，通过板载 USB 转串口（通常为 PA9/PA10）连接电脑即可。

---

## 四、CubeMX 配置步骤

### 4.1 时钟配置

1. 第一步：RCC 配置（选外部晶振）  
2. 第二步：Clock Configuration 页面的具体设置（写明目标频率数值）  
   设置 `SYSCLK=72MHz`，`AHB=72MHz`，`APB1=36MHz`，`APB2=72MHz`。  
3. 第三步：确认该外设所在总线的时钟频率（写明总线名称和数值）  
   TIM6 挂在 `APB1`，当 `APB1 Prescaler != 1` 时定时器时钟翻倍，确认 `TIM6CLK=72MHz`。

### 4.2 外设配置

**步骤一**：在 `Pinout & Configuration -> Timers -> TIM6` 中选择 `Activated`，模式选 `Internal Clock`。  

**步骤二**：Parameter Settings 参数表格

| 参数项 | 填写值 | 说明 |
|---|---|---|
| Prescaler (PSC) | `7199` | 把 72MHz 分频到 10kHz，方便按毫秒级换算 |
| Counter Period (ARR) | `4999` | 10kHz 下计 5000 次即 500ms |
| Counter Mode | `Up` | 递增计数最直观，便于初学排查 |
| AutoReload Preload | `Disable` | 本实验周期固定，不需要运行中平滑换周期 |
| Trigger Event Selection | `Reset` | 不用主从触发链，保持最小配置 |

**步骤三**：NVIC 中断配置（写明勾选路径和优先级建议值）  
在 `Pinout & Configuration -> System Core -> NVIC` 勾选 `TIM6 global interrupt`（实际向量名为 `TIM6_DAC_IRQn`），建议优先级 `Preemption Priority=2`、`Sub Priority=0`。  

**步骤四**：代码生成设置（写明需要勾选哪个选项及其路径）  
在 `Project Manager -> Code Generator` 勾选 `Generate peripheral initialization as a pair of '.c/.h' files per peripheral`，减少后续手改与再生成冲突。

---

## 五、代码实现

### 5.1 设计思路

- 把“500ms 中断事件”与“1秒打印事件”分开计数，因为 LED 翻转和串口打印节拍不同，分开后逻辑更清楚。  
- 在中断回调里只做轻量操作（计数+翻转+置标志），避免耗时打印直接拖慢中断响应。  
- 串口打印放在主循环根据标志位执行，因为这样能保证中断短小、系统可扩展性更好。  
- 使用 `HAL_TIM_Base_Start_IT()` 启动而不是手写寄存器启动，初学阶段更不容易漏开中断位。

### 5.2 初始化代码

```c
/* USER CODE BEGIN 2 */
HAL_TIM_Base_Start_IT(&htim6);                                          // 启动TIM6并使能更新中断，让500ms节拍开始工作
HAL_GPIO_WritePin(GPIOC, GPIO_PIN_13, GPIO_PIN_SET);                    // 先给LED确定初始状态，避免上电后状态不明
printf("TIM6 start: 500ms interrupt\r\n");                              // 打印启动信息，确认串口链路和定时器已启动
/* USER CODE END 2 */
```

> 💡 最关键的是 `HAL_TIM_Base_Start_IT(&htim6)`，只 `Start` 不 `Start_IT` 的话中断不会进回调。

### 5.3 核心功能代码

**代码块1：中断回调函数**

```c
/**
  * @brief  定时器周期到达后的HAL回调
  * @param  htim: 触发回调的定时器句柄
  * @retval None
  * @note   仅做轻量操作，耗时打印放到主循环执行
  */
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
    static uint8_t half_sec_tick = 0;                                   // 记录500ms节拍次数，用于拼出1秒事件

    if (htim->Instance == TIM6)                                          // 分支1：仅处理TIM6来源，避免误处理其他定时器
    {
        HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);                          // 每500ms翻转一次LED，形成1Hz闪烁现象
        half_sec_tick++;                                                 // 500ms计数+1，累计两次就是1秒

        if (half_sec_tick >= 2U)                                         // 分支2：累计到1秒时触发“秒计数”逻辑
        {
            half_sec_tick = 0U;                                          // 清零半秒计数，开始下一秒累计
            g_run_seconds++;                                             // 全局秒计数+1，主循环据此打印
            g_sec_flag = 1U;                                             // 置位打印标志，通知主循环执行串口输出
        }
        else                                                             // 分支3：未到1秒时不触发打印
        {
            /* keep waiting for next 500ms tick */                       // 保持等待，避免中断里做无意义操作
        }
    }
    else                                                                 // 分支4：非TIM6中断来源
    {
        /* ignore other timer callbacks */                               // 明确忽略，防止多定时器工程里逻辑串线
    }
}
```

**代码块2：主循环 `while(1)` 部分**

```c
/* USER CODE BEGIN 3 */
while (1)
{
    if (g_sec_flag == 1U)                                                // 条件1：收到“满1秒”标志时才打印
    {
        g_sec_flag = 0U;                                                 // 先清标志，避免重复打印同一秒
        printf("run time: %lu s\r\n", g_run_seconds);                    // 打印运行秒数，验证定时节拍稳定性
    }
    else                                                                 // 条件2：未到打印时机
    {
        /* no blocking task here */                                      // 主循环保持轻量，给系统其他任务留响应空间
    }
}
/* USER CODE END 3 */
```

### 5.4 串口重定向（如本实验用到 printf 则必须包含，否则删除此节）

```c
#include "stdio.h"                                                       // 引入标准IO声明，提供fputc接口原型

int fputc(int ch, FILE *f)                                               // 把printf单字节输出重定向到USART1发送
{
    HAL_UART_Transmit(&huart1, (uint8_t *)&ch, 1, 0xFFFF);              // 阻塞发送1字节，优先保证调试输出完整
    return ch;                                                           // 返回已发送字符，满足标准库约定
}
```

Keil 需勾选 MicroLIB、CubeIDE 需添加 `syscalls.c`。

---

## 六、实验现象与验证

### 6.1 预期效果

- ✅ LED 每 **500ms 翻转一次**，完整亮灭周期约 **1s（1Hz）**。  
- ✅ 串口以 **115200bps** 每 **1s** 打印一行 `run time: N s`，`N` 连续递增且不跳号。  

### 6.2 快速验证方法

方法1：串口时间戳验证（操作步骤）  
1. 打开串口助手，设置 `115200, 8N1`。  
2. 观察 10 秒，理论应收到约 10 行秒计数。  
3. 若明显快慢不一致，优先回查 APB1 与 TIM6 时钟是否按 72MHz 参与计算。

方法2：在线读取计数器值（代码片段）

```c
uint32_t cnt_now = __HAL_TIM_GET_COUNTER(&htim6);                       // 读取当前CNT值，确认计数器在持续递增
uint32_t arr_now = __HAL_TIM_GET_AUTORELOAD(&htim6);                    // 读取ARR值，确认是否为4999
printf("CNT=%lu, ARR=%lu\r\n", cnt_now, arr_now);                       // 期望ARR=4999，CNT在0~4999循环变化
```

---

## 七、常见问题排查

### ❓ 现象：LED 不闪烁，串口也没有秒计数输出

**可能原因**：
1. 只初始化了 TIM6 但没有调用 `HAL_TIM_Base_Start_IT`，导致中断根本没启动。  
2. NVIC 没勾选 `TIM6 global interrupt`，更新事件产生了但 CPU 不会响应该中断。

**排查步骤**：

先看启动代码里是否调用 `HAL_TIM_Base_Start_IT`，再读中断使能位判断 UIE 是否打开。

```c
/* 检查TIM6中断使能状态，期望UIE=1 */
uint32_t dier = TIM6->DIER;                                             // 读取DMA/中断使能寄存器
printf("TIM6->DIER=0x%08lX\r\n", dier);                                 // 观察UIE位是否置1
if ((dier & TIM_DIER_UIE) == 0U)                                        // 如果UIE未使能说明中断启动流程有缺失
{
    printf("UIE disabled, call HAL_TIM_Base_Start_IT\r\n");             // 给出直接修复方向
}
```

### ❓ 现象：中断进了，但系统明显卡顿，串口偶尔堵住

**可能原因**：
1. 在 `HAL_TIM_PeriodElapsedCallback` 里直接做了长字符串打印，阻塞发送拖长中断执行时间。  
2. 回调里做了耗时计算或延时函数，导致中断占用过久影响主循环和其他中断。

**排查步骤**：

在回调入口和出口打 GPIO 脉冲或计时，若中断执行时间过长，先把耗时逻辑移到主循环。

```c
/* 测量回调耗时，期望远小于500ms，最好在毫秒级以内 */
uint32_t t0 = HAL_GetTick();                                            // 记录回调开始时间
/* heavy work should NOT be here */                                     // 提醒不要在回调中放耗时任务
uint32_t t1 = HAL_GetTick();                                            // 记录回调结束时间
printf("ISR cost=%lu ms\r\n", t1 - t0);                                 // 若耗时偏大，应迁移逻辑到主循环
```

### ❓ 现象：同时启用 TIM6 和 TIM7 后，回调里逻辑串线（TIM6 特有易混点）

**可能原因**：
1. F103 上 TIM6 与 TIM7 共用 `TIM6_DAC_IRQHandler` 向量，回调中没做 `htim->Instance` 区分会误处理。  
2. 只写了一个“默认定时器处理分支”，后续加 TIM7 时忘记补充来源判断。

**排查步骤**：

在回调里打印 `htim->Instance` 或分别计数，确认是否按来源分支处理。

```c
/* 区分TIM6/TIM7来源，期望TIM6任务只在TIM6分支运行 */
if (htim->Instance == TIM6)                                             // 明确TIM6来源分支
{
    tim6_isr_cnt++;                                                     // 仅TIM6事件计数
    printf("TIM6 cnt=%lu\r\n", tim6_isr_cnt);                           // 观察TIM6回调计数是否独立递增
}
else if (htim->Instance == TIM7)                                        // 明确TIM7来源分支
{
    tim7_isr_cnt++;                                                     // 仅TIM7事件计数
    printf("TIM7 cnt=%lu\r\n", tim7_isr_cnt);                           // 观察TIM7回调计数是否独立递增
}
else                                                                     // 其他来源保护分支
{
    printf("unknown timer source\r\n");                                 // 防止误判来源导致逻辑串线
}
```

---

## 八、设计选型参考

| 方案 | 优点 | 缺点 | 适用场景 |
|---|---|---|---|
| `HAL_Delay` | 上手最快，代码直观 | 阻塞 CPU，扩展性差 | 单一小实验、临时延时 |
| SysTick | 系统自带，1ms 基准方便 | 常被 RTOS/系统节拍占用 | 基础周期调度、软件定时 |
| TIM6（本文） | 纯硬件定时，节拍稳定 | 功能单一，无输入捕获/PWM | 周期中断、心跳任务 |
| 通用定时器（TIM2/3等） | 功能丰富，可做捕获/PWM | 配置项更多，学习成本更高 | 电机控制、测频、复杂时序 |

> 💡 **选型原则**：只要需求是“稳定周期中断”且不需要 PWM/捕获，优先 TIM6；一旦涉及波形输出或输入测量，直接选通用定时器。

---

## 九、进阶方向

- **TIM6 + DMA 触发外设更新**：能实现固定节拍自动搬运数据，避免 CPU 每次中断手动喂数据。  
- **多定时器分层调度**：能实现 1ms/10ms/100ms 多节拍任务拆分，避免所有任务堆在同一回调里。  
- **动态改 PSC/ARR 实现可变周期**：能实现运行中平滑改定时参数，避免停机重启后才生效。  
- **与低功耗模式联动唤醒**：能实现周期唤醒采样，避免主循环常亮运行导致功耗偏高。  

---

## 十、总结

**本文完成了**：用 TIM6 实现了精确的 500ms 定时中断，在回调中翻转 LED 并通过串口输出运行秒计数。  

**核心知识点回顾**：  
1. TIM6 的定时周期由 `PSC` 和 `ARR` 共同决定，计算公式为 \(T=(PSC+1)\times(ARR+1)/f_{TIM}\)，两者写寄存器时都要减 1。  
2. 中断回调应保持短小，把打印和耗时任务放到主循环，可以显著降低系统卡顿风险。  
3. F103 上 TIM6 与 TIM7 共用中断向量，回调里必须按 `htim->Instance` 区分来源以避免逻辑串线。  

---

### 参考资料

- STM32F103 参考手册链接（固定）：https://www.st.com/resource/en/reference_manual/cd00171190.pdf  
- HAL 库用户手册链接（固定）：https://www.st.com/resource/en/user_manual/dm00154093.pdf  
- CubeMX 用户手册链接（固定）：https://www.st.com/resource/en/user_manual/dm00104712.pdf  
- 补充资料1（主题相关）：https://www.st.com/resource/en/application_note/an4013-introduction-to-timers-for-stm32-mcus-stmicroelectronics.pdf  
- 补充资料2（主题相关）：https://www.st.com/en/embedded-software/stm32cubef1.html  

```
*如有错误或建议，欢迎在评论区留言。转载请注明原文出处。*
```

### 芯片差异说明（如有差异则必须包含，否则删除）

| 对比项 | STM32F103 (F1) | STM32F4 | STM32H7 |
|---|---|---|---|
| TIM6/TIM7 中断向量 | 常见为共享向量（需区分来源） | 多数型号为独立中断向量 | 中断与时钟域更细分，配置项更多 |
| 计时器时钟关系 | APB 分频不为1时定时器时钟翻倍 | 同类规则但时钟树更复杂 | 时钟来源与门控更灵活，排查需更细 |
| HAL 配置复杂度 | 基础参数少，上手快 | 触发与主从链配置更常见 | 高性能场景下常配合DMA/缓存策略 |
| 典型应用重心 | 基础周期中断与心跳任务 | 中速控制与多外设协同 | 高频控制与复杂实时调度 |
