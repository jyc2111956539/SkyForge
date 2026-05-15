---
title: STM32 外部中断 EXTI：按键触发中断与优先级分组
createTime: 2026/05/14 11:34:38
permalink: /tutorials/stm32/06-exti-key-interrupt/
---
# STM32 外部中断 EXTI：按键触发中断与优先级分组

> **系列**：外设基础系列  
> **难度等级**：⭐⭐⭐☆☆  
> **适用芯片**：STM32F103xx（其他系列差异见文末说明）  
> **开发环境**：STM32CubeIDE 1.x + HAL 库  
> **前置知识**：NVIC 中断基本概念、GPIO 输入输出配置、串口 `printf` 重定向基础

---

## 一、前言

EXTI 可以把它理解成“门铃触发器”。平时 CPU 不用一直盯着按键看，只要按键电平发生指定变化，就像门铃被按下那一刻，硬件会主动通知 CPU 处理事件。这里“门铃响”对应 EXTI 中断触发，“去开门”对应你的中断回调函数执行。

如果不用 EXTI，而是主循环一直轮询按键，项目一复杂就会暴露问题。第一，CPU 会被无意义扫描占用，任务一多响应会抖；第二，轮询周期不合适时容易漏按或误判；第三，维护时你很难统一管理多个输入事件，代码会越来越散。

本文会实现一个明确实验：把 **PA0** 配成下降沿外部中断，按键按下时在回调中翻转 **PC13 LED**，并通过串口打印中断触发次数。同时演示 NVIC 优先级分组和中断优先级设置，最后用现象和计数验证配置正确。

---

## 二、原理讲解

### 2.1 工作原理

**一句话核心**：GPIO 引脚先映射到 EXTI 线，再由 EXTI 检测边沿并向 NVIC 发起中断请求，CPU进入对应中断服务流程。

```text
PA0输入电平变化
    │
    ▼
[AFIO_EXTICR映射]     ← 把“PA0”连接到“EXTI0线”
    │
    ▼
[EXTI边沿检测器]      ← 监测下降沿并置位挂起标志
    │
    ▼
[NVIC中断控制器]      ← 根据优先级决定是否立即响应
    │
    ▼
[HAL_GPIO_EXTI_Callback] ← 执行用户回调逻辑（翻转LED/计数）
```

> 💡 **关键理解**：EXTI 是“线”的概念，不是“端口+引脚”直接一一独占；`EXTI0` 可以映射到 `PA0/PB0/PC0...` 其中之一，同一时刻只能选一个源。

### 2.3 关键寄存器 / HAL 结构体

| 寄存器（HAL成员） | 作用 | 典型值/选项 |
|---|---|---|
| `GPIO_InitTypeDef.Pin` | 选择中断输入脚 | `GPIO_PIN_0` |
| `GPIO_InitTypeDef.Mode` | 配置中断触发方式 | `GPIO_MODE_IT_FALLING` |
| `GPIO_InitTypeDef.Pull` | 输入上拉/下拉 | `GPIO_PULLUP` |
| `AFIO->EXTICR[0]` | EXTI0 源端口映射 | `PA0 -> EXTI0` |
| `EXTI->FTSR` | 下降沿触发使能 | `TR0=1` |
| `NVIC`（`EXTI0_IRQn`） | 中断使能与优先级 | 例如抢占优先级 `2` |

> 💡 日常开发优先用 HAL 配置；只有“中断不进”或“进错线”时再重点查 `EXTICR/FTSR/PR` 这些寄存器位。

### 2.4 子功能说明

本文使用 **下降沿触发中断模式**（`GPIO_MODE_IT_FALLING`）；EXTI 还支持上升沿和双边沿，区别是一种只响应“按下瞬间”，一种响应“松开瞬间”，双边沿则两次都响应。

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
   设定 `SYSCLK=72MHz`，`AHB=72MHz`，`APB1=36MHz`，`APB2=72MHz`。  
3. 第三步：确认该外设所在总线的时钟频率（写明总线名称和数值）  
   GPIO/AFIO 在 `APB2`，确认 `PCLK2=72MHz`，确保 EXTI 线映射与 GPIO 输入工作正常。

### 4.2 外设配置

**步骤一**：进入 `Pinout & Configuration -> System Core -> GPIO`，将 `PA0` 设置为 `GPIO_EXTI0`，触发方式选择 `External Interrupt Mode with Falling edge trigger detection`。  

**步骤二**：Parameter Settings 参数表格

| 参数项 | 填写值 | 说明 |
|---|---|---|
| PA0 Mode | `External Interrupt Mode with Falling edge` | 按键常见上拉输入，按下为低，下降沿最符合“按下触发” |
| PA0 Pull-up/Pull-down | `Pull-up` | 默认高电平，避免输入悬空导致误触发 |
| PC13 Mode | `Output Push Pull` | 用于中断触发后翻转 LED 观察现象 |
| PC13 Speed | `Low` | LED 翻转不需要高速，降低边沿噪声 |
| User Label（可选） | `KEY_EXTI_Pin` / `LED_Pin` | 后续维护时能快速识别用途 |

**步骤三**：NVIC 中断配置（写明勾选路径和优先级建议值）  
在 `Pinout & Configuration -> System Core -> NVIC` 勾选 `EXTI line0 interrupt`，建议 `Preemption Priority=2`、`Sub Priority=0`。如果你还会用到更高实时性的定时器中断，可给它更高优先级（数值更小）。  

**步骤四**：代码生成设置（写明需要勾选哪个选项及其路径）  
在 `Project Manager -> Code Generator` 勾选 `Generate peripheral initialization as a pair of '.c/.h' files per peripheral`，便于把 GPIO/EXTI 初始化与业务逻辑分离。

---

## 五、代码实现

### 5.1 设计思路

- 中断回调只做“轻量动作”，因为中断上下文要短小，避免阻塞导致系统响应下降。  
- 消抖采用“时间窗过滤”，因为机械按键抖动会导致一次按下触发多次中断。  
- 打印放到主循环通过标志位触发，因为串口阻塞发送放在中断里风险高，容易卡住其他中断。  
- 明确判断 `GPIO_Pin == GPIO_PIN_0`，因为工程里可能有多个 EXTI 源，必须分清来源。

### 5.2 初始化代码

```c
/* USER CODE BEGIN 2 */
HAL_GPIO_WritePin(GPIOC, GPIO_PIN_13, GPIO_PIN_SET);                    // 设定LED初始状态，避免上电状态不确定影响观察
g_exti_count = 0U;                                                       // 清零中断计数，确保启动后计数从0开始
g_last_tick = HAL_GetTick();                                             // 初始化消抖基准时间，避免刚启动误判为有效按下
g_print_flag = 0U;                                                       // 清零打印标志，防止主循环误打印旧状态
printf("EXTI0 demo start\r\n");                                          // 启动信息用于确认串口链路和程序已运行
/* USER CODE END 2 */
```

> 💡 `g_last_tick` 是消抖核心参数，没有它你很难稳定过滤机械按键抖动。

### 5.3 核心功能代码

**代码块1：中断回调函数**

```c
/**
  * @brief  GPIO EXTI 中断回调函数
  * @param  GPIO_Pin: 触发中断的GPIO引脚号
  * @retval None
  * @note   回调中仅做轻量处理，避免阻塞式调用影响系统实时性
  */
void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin)
{
    uint32_t now = HAL_GetTick();                                        // 读取当前系统节拍，用于软件消抖时间判断

    if (GPIO_Pin == GPIO_PIN_0)                                          // 分支1：仅处理PA0对应的EXTI0事件
    {
        if ((now - g_last_tick) >= 20U)                                  // 分支2：超过20ms消抖窗口才认定为有效按下
        {
            HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);                      // 有效按下时翻转LED，提供直观硬件反馈
            g_exti_count++;                                              // 有效按下计数+1，用于串口验证触发次数
            g_last_tick = now;                                           // 更新上次有效触发时间，为下一次消抖判断提供基准
            g_print_flag = 1U;                                           // 置位打印标志，通知主循环异步输出日志
        }
        else                                                             // 分支3：落在抖动窗口内的重复触发
        {
            /* bounce ignored */                                         // 抖动事件直接忽略，避免一次按下多次响应
        }
    }
    else                                                                 // 分支4：非PA0来源事件
    {
        /* ignore other EXTI lines */                                   // 明确忽略其他中断线，防止逻辑串线
    }
}
```

**代码块2：主循环 `while(1)` 部分**

```c
/* USER CODE BEGIN 3 */
while (1)
{
    if (g_print_flag == 1U)                                              // 条件1：检测到中断回调请求打印时执行日志输出
    {
        g_print_flag = 0U;                                               // 先清标志，避免同一次事件重复打印
        printf("EXTI0 count = %lu\r\n", g_exti_count);                   // 输出有效按键触发次数，用于功能验证
    }
    else                                                                 // 条件2：无待处理打印事件
    {
        /* main loop keeps non-blocking */                              // 主循环保持轻量，确保系统整体响应性
    }
}
/* USER CODE END 3 */
```

### 5.4 串口重定向（如本实验用到 printf 则必须包含，否则删除此节）

```c
#include "stdio.h"                                                       // 引入标准输入输出定义，提供fputc原型

int fputc(int ch, FILE *f)                                               // 将printf的字符输出重定向到USART发送通道
{
    HAL_UART_Transmit(&huart1, (uint8_t *)&ch, 1, 0xFFFF);              // 阻塞发送单字节，保证调试日志完整可读
    return ch;                                                           // 返回发送字符，满足标准库接口约定
}
```

Keil 需勾选 MicroLIB、CubeIDE 需添加 `syscalls.c`。

---

## 六、实验现象与验证

### 6.1 预期效果

- ✅ 每次按下 PA0 按键后，LED 状态翻转一次，按键抖动被 `20ms` 消抖窗口过滤。  
- ✅ 串口以 `115200bps` 输出 `EXTI0 count = N`，`N` 每次有效按下只增加 `1`。  

### 6.2 快速验证方法

方法1：人工按键验证（操作步骤）  
1. 打开串口助手，设置 `115200, 8N1`。  
2. 单次短按 PA0，观察 LED 翻转且计数加 1。  
3. 长按不放时计数不应持续快速增加（验证消抖有效）。

方法2：回调触发频次监控（代码片段）

```c
static uint32_t raw_irq_count = 0U;                                      // 统计原始中断进入次数，用于对比抖动与有效次数
raw_irq_count++;                                                         // 每次进入回调先+1，反映硬件实际触发频次
printf("raw=%lu, valid=%lu\r\n", raw_irq_count, g_exti_count);          // 期望raw>=valid，且消抖后valid增长更平稳
```

---

## 七、常见问题排查

### ❓ 现象：按一次按键，串口计数增加了 2~5 次

**可能原因**：
1. 机械按键抖动导致短时间内出现多个下降沿，硬件会多次触发 EXTI。  
2. 没有做软件消抖或消抖时间过短，无法过滤抖动脉冲。

**排查步骤**：

先加 20ms 时间窗消抖，再根据按键品质调整到 10~30ms 范围，观察计数是否稳定到“一按一次”。

```c
/* 20ms软件消抖模板：期望一次按下只记一次有效触发 */
uint32_t now = HAL_GetTick();                                            // 读取当前毫秒节拍用于时间窗判断
if ((now - g_last_tick) >= 20U)                                          // 间隔大于等于20ms才认为是有效触发
{
    g_last_tick = now;                                                   // 更新有效触发时间戳，防止连续抖动重复计数
    g_exti_count++;                                                      // 仅有效触发时增加计数
}
```

### ❓ 现象：程序偶发卡住或整体响应变慢，尤其按键触发后更明显

**可能原因**：
1. 在 EXTI 回调里调用了 `HAL_Delay` 这类阻塞函数，中断上下文被长时间占用。  
2. 在回调里做了大量串口打印或复杂计算，导致中断执行时间过长影响系统调度。

**排查步骤**：

把阻塞和耗时逻辑全部移出回调，改成“回调置标志，主循环处理”的结构。

```c
/* 中断里只置位，主循环里再做耗时工作，期望系统恢复流畅 */
volatile uint8_t g_task_flag = 0U;                                       // 定义事件标志用于跨上下文通信
g_task_flag = 1U;                                                        // 回调里只置位，不做延时和大块打印
if (g_task_flag == 1U)                                                   // 主循环检测到事件再执行耗时任务
{
    g_task_flag = 0U;                                                    // 先清标志，避免重复处理
    printf("handle key event in main loop\r\n");                         // 把打印放主循环，避免中断阻塞
}
```

### ❓ 现象：PA0 电平变化了，但 EXTI0 中断始终不触发（EXTI 特有映射问题）

**可能原因**：
1. EXTI0 线映射到了错误端口（例如 PB0），导致 PA0 变化不会触发 EXTI0。  
2. GPIO 模式不是 `GPIO_MODE_IT_FALLING`，只是普通输入，边沿检测器没有启用。

**排查步骤**：

核对 CubeMX 引脚模式和 EXTI 线映射，确认 `PA0 -> EXTI0`，并检查 NVIC 的 `EXTI0_IRQn` 已使能。

```c
/* 快速自检：确认PA0电平在变化且中断计数同步变化 */
uint8_t pa0_level = HAL_GPIO_ReadPin(GPIOA, GPIO_PIN_0);                // 读取PA0当前电平，确认按键硬件确实有变化
printf("PA0=%d, EXTI0_count=%lu\r\n", pa0_level, g_exti_count);         // 期望按下时PA0变化且count随有效触发增加
HAL_NVIC_EnableIRQ(EXTI0_IRQn);                                          // 再次确保EXTI0中断已使能，排除未开启中断因素
```

---

## 八、设计选型参考

| 方案 | 优点 | 缺点 | 适用场景 |
|---|---|---|---|
| 轮询按键 | 实现简单，时序可控 | CPU 占用高，易漏按或抖动误判 | 低频、单按键、快速原型 |
| 外部中断（本文） | 响应快，CPU 空闲时间多 | 需处理抖动和中断上下文约束 | 事件驱动输入、人机交互 |
| 定时器消抖（周期采样） | 抖动处理稳定，可扩展多键 | 响应延迟受采样周期影响 | 多按键统一管理、状态机输入 |
| 外部中断+定时器联合 | 响应快且抗抖稳定 | 实现复杂度更高 | 中高可靠性按键系统 |

> 💡 **选型原则**：单键且要即时响应先选 EXTI，再用时间窗或定时器做消抖；多键复杂场景优先“定时采样+状态机”。

---

## 九、进阶方向

- **EXTI + 定时器状态机消抖**：能实现短按/长按/双击识别，避免单纯边沿触发误判复杂手势。  
- **多中断源优先级规划**：能实现按键、串口、定时器协同运行，避免高频中断抢占导致关键任务抖动。  
- **低功耗唤醒输入设计**：能实现待机模式按键唤醒系统，避免主循环常开造成不必要功耗。  
- **事件队列化处理**：能实现中断只采集事件、主任务统一消费，避免中断逻辑膨胀导致维护困难。  

---

## 十、总结

**本文完成了**：用 EXTI0 实现了 PA0 下降沿按键中断触发，回调中翻转 LED 并通过串口输出触发计数，同时完成了中断优先级配置演示。  

**核心知识点回顾**：  
1. EXTI 是“中断线”机制，GPIO 引脚必须先正确映射到对应 EXTI 线，触发边沿与 NVIC 使能缺一不可。  
2. 按键中断必须配合软件消抖，否则机械抖动会导致一次按下触发多次回调。  
3. 中断回调应避免 `HAL_Delay` 和大块阻塞操作，正确做法是回调置标志、主循环处理耗时任务。  

---

### 参考资料

- STM32F103 参考手册链接（固定）：https://www.st.com/resource/en/reference_manual/cd00171190.pdf  
- HAL 库用户手册链接（固定）：https://www.st.com/resource/en/user_manual/dm00154093.pdf  
- CubeMX 用户手册链接（固定）：https://www.st.com/resource/en/user_manual/dm00104712.pdf  
- 补充资料1（主题相关）：https://www.st.com/resource/en/application_note/cd00233952.pdf  
- 补充资料2（主题相关）：https://www.st.com/en/embedded-software/stm32cubef1.html  

```
*如有错误或建议，欢迎在评论区留言。转载请注明原文出处。*
```

### 芯片差异说明（如有差异则必须包含，否则删除）

| 对比项 | STM32F103 (F1) | STM32F4 | STM32H7 |
|---|---|---|---|
| EXTI 映射单元 | 通过 AFIO EXTICR 选择端口源 | 通过 SYSCFG EXTICR 选择端口源 | 同样经 SYSCFG/EXTI，但中断线资源更细 |
| 中断线组织 | 0~4 独立，5~9 共用，10~15 共用 | 组织方式类似 | 线与域更复杂，需关注安全域/电源域 |
| 触发能力 | 上升/下降/双边沿基础功能完整 | 类似并扩展更多系统特性 | 复杂系统下常配合低功耗与多域唤醒 |
| 配置注意点 | 易错在 AFIO 映射与 NVIC 使能 | 易错在 SYSCFG 时钟与映射 | 易错在域配置与中断路由策略 |
