---
title: STM32 GPIO 点灯实战
createTime: 2026/05/14 11:34:37
permalink: /tutorials/stm32/02-gpio/
---
# STM32 GPIO 点灯实战

> **系列**：外设基础系列  
> **难度等级**：⭐⭐☆☆☆  
> **适用芯片**：STM32F103xx（其他系列差异见文末说明）  
> **开发环境**：STM32CubeIDE 1.x + HAL 库  
> **前置知识**：C 语言 `if/while` 基础、STM32CubeMX 基本建工程流程、数字电平高低与上拉/下拉概念

---

## 一、前言

GPIO 本质上是单片机和外部世界“握手”的手指。你可以把它类比成办公室门口的门禁按钮：按键输入像“有人按门铃”这个事件，LED 输出像“门禁灯亮起”这个反馈动作，GPIO 就是负责感知按下和执行亮灭的那组硬件通道。

如果不用 GPIO 的硬件模式，而是随意用软件变量模拟，实际项目会很快出问题。第一是 CPU 占用会被无意义轮询拖高，第二是输入状态容易受抖动和噪声影响导致误判，第三是后期维护时你很难快速定位“是硬件电平问题还是逻辑问题”。

本文会带你完成一个可直接上板验证的小实验：把 **PC13** 配置为推挽输出控制板载 LED，把 **PA0** 配置为上拉输入读取按键，按下按键后 LED 翻转一次。你将通过 LED 亮灭现象和串口打印两种方式验证逻辑是否正确。

---

## 二、原理讲解

### 2.1 工作原理

**一句话核心**：GPIO 输入负责“读电平”，GPIO 输出负责“写电平”，程序根据输入结果决定输出状态。

```text
按键PA0电平
    │
    ▼
[GPIO输入缓冲]        ← 将外部电压转换为 MCU 可读的 0/1
    │
    ▼
[主循环判定逻辑]      ← 检测按键边沿并做消抖，决定是否翻转LED
    │
    ▼
[GPIO输出寄存器]      ← 把目标电平写到 PC13 对应位
    │
    ▼
LED亮/灭
```

> 💡 **关键理解**：`HAL_GPIO_ReadPin()` 读到的是“当前引脚电平”，不是“按键事件”；不做边沿检测会在一次按下期间触发多次翻转。

### 2.3 关键寄存器 / HAL 结构体

| 寄存器（HAL成员） | 作用 | 典型值/选项 |
|---|---|---|
| `GPIO_InitTypeDef.Pin` | 选择要配置的引脚 | `GPIO_PIN_13`、`GPIO_PIN_0` |
| `GPIO_InitTypeDef.Mode` | 设置引脚模式 | `GPIO_MODE_OUTPUT_PP`、`GPIO_MODE_INPUT` |
| `GPIO_InitTypeDef.Pull` | 输入上下拉配置 | `GPIO_NOPULL`、`GPIO_PULLUP` |
| `GPIO_InitTypeDef.Speed` | 输出翻转速度能力 | `GPIO_SPEED_FREQ_LOW` |
| `GPIOx_ODR` | 输出数据寄存器（写输出电平） | 对应位 `0/1` |
| `GPIOx_IDR` | 输入数据寄存器（读输入电平） | 对应位 `0/1` |

> 💡 业务逻辑简单时用 HAL 足够；只有在要做极限性能优化、排查异常电平、或需要位级时序控制时再直接查寄存器。

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
   设置 `SYSCLK = 72 MHz`，`AHB = 72 MHz`，`APB1 = 36 MHz`，`APB2 = 72 MHz`。  
3. 第三步：确认该外设所在总线的时钟频率（写明总线名称和数值）  
   GPIO 挂在 `APB2`，确认 `PCLK2 = 72 MHz`。

### 4.2 外设配置

**步骤一**：在 `Pinout & Configuration -> System Core -> GPIO`，将 `PC13` 设为 `GPIO_Output`，将 `PA0` 设为 `GPIO_Input`。  

**步骤二**：Parameter Settings 参数表格

| 参数项 | 填写值 | 说明 |
|---|---|---|
| PC13 Mode | `Output Push Pull` | 板载 LED 需要稳定灌/拉电流，推挽输出电平更明确 |
| PC13 Pull-up/Pull-down | `No pull-up and no pull-down` | 输出脚由输出级主动驱动，不依赖内部上下拉 |
| PC13 Maximum output speed | `Low` | LED 翻转不需要高速，低速可减小边沿噪声 |
| PA0 Mode | `Input mode` | 按键是外部输入信号，只读不驱动 |
| PA0 Pull-up/Pull-down | `Pull-up` | 默认高电平，按下接地变低，逻辑清晰且抗漂浮 |
| User Label（可选） | `LED_Pin`、`KEY_Pin` | 后期维护更快定位用途 |

**步骤三**：NVIC 中断配置（写明勾选路径和优先级建议值）  
本实验使用轮询，不启用 GPIO 外部中断。路径为 `Pinout & Configuration -> System Core -> NVIC`，保持 `EXTI line0 interrupt` 未勾选。若后续改中断方式，建议优先级 `Preemption Priority = 2`。  

**步骤四**：代码生成设置（写明需要勾选哪个选项及其路径）  
在 `Project Manager -> Code Generator` 勾选 `Generate peripheral initialization as a pair of '.c/.h' files per peripheral`，便于把 GPIO 初始化与业务代码解耦，减少后续改动冲突。

---

## 五、代码实现

### 5.1 设计思路

- 把按键处理写成独立函数，而不是塞进 `while(1)`，因为后期加第二个按键或改中断时改动面最小。  
- 使用“边沿触发 + 简单消抖”，因为我们要的是“按一次翻一次”，不是“按住持续翻转”。  
- LED 状态用 `HAL_GPIO_TogglePin()` 而不是手动读写状态变量，能减少“变量状态与引脚实际状态不一致”的风险。  
- 主循环只保留调度，保持短小，方便以后插入串口、任务调度或低功耗逻辑。

### 5.2 初始化代码

```c
/* USER CODE BEGIN 2 */
HAL_GPIO_WritePin(GPIOC, GPIO_PIN_13, GPIO_PIN_SET);          // 先给LED一个确定初始状态（常见板卡PC13低电平点亮）
uint8_t key_prev = GPIO_PIN_SET;                              // 记录上一次按键电平，初值设为未按下（上拉输入默认高）
uint32_t key_tick = HAL_GetTick();                            // 记录上次有效采样时间，用于消抖窗口
printf("GPIO demo start: PC13=LED, PA0=KEY\r\n");            // 启动打印，方便确认程序已运行
/* USER CODE END 2 */
```

> 💡 关键参数是 `key_prev`：它让我们从“电平判断”升级到“边沿判断”，避免一次按下触发多次翻转。

### 5.3 核心功能代码

**代码块1：核心处理函数**

```c
/**
  * @brief  处理按键输入并在按下沿翻转LED
  * @param  key_prev: 上一次按键电平指针
  * @param  key_tick: 上一次通过消抖检查的时间戳指针
  * @retval None
  * @note   采用20ms消抖窗口，仅在“高->低”边沿触发LED翻转
  */
static void Key_Process(uint8_t *key_prev, uint32_t *key_tick)
{
    uint8_t key_now = HAL_GPIO_ReadPin(GPIOA, GPIO_PIN_0);            // 读取当前按键电平（上拉输入：按下为低）
    uint32_t now = HAL_GetTick();                                      // 获取当前系统节拍，用于毫秒级消抖

    if ((now - *key_tick) < 20U)                                       // 条件1：距离上次采样不足20ms，视为抖动窗口
    {
        return;                                                        // 在消抖窗口内直接退出，避免抖动误触发
    }

    if ((*key_prev == GPIO_PIN_SET) && (key_now == GPIO_PIN_RESET))    // 条件2：检测到“未按下->按下”的下降沿
    {
        HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);                        // 仅在有效按下沿翻转LED，保证一次按下一次动作
        printf("Key pressed, LED toggled\r\n");                        // 串口打印事件，便于和现象对应
    }
    else                                                                // 条件3：非按下沿（例如保持按住或松开）
    {
        /* no action */                                                // 非目标边沿不做处理，避免重复翻转
    }

    *key_prev = key_now;                                                // 更新上次电平，为下一轮边沿判断提供基准
    *key_tick = now;                                                    // 更新时间戳，启动下一次消抖窗口
}
```

**代码块2：主循环 `while(1)` 部分**

```c
/* USER CODE BEGIN 3 */
while (1)
{
    Key_Process(&key_prev, &key_tick);                                 // 轮询按键处理，保持主循环职责单一
    HAL_Delay(1);                                                      // 1ms节拍可降低空转占用，同时不影响人手按键响应
}
/* USER CODE END 3 */
```

### 5.4 串口重定向

```c
#include "stdio.h"                                                      // 提供printf/fputc声明

int fputc(int ch, FILE *f)                                              // 将printf输出重定向到USART1
{
    HAL_UART_Transmit(&huart1, (uint8_t *)&ch, 1, 0xFFFF);             // 阻塞发送1字节，确保调试输出完整
    return ch;                                                          // 返回发送字符，兼容标准库行为
}
```

Keil 需勾选 `MicroLIB`，CubeIDE 需添加 `syscalls.c`。

---

## 六、实验现象与验证

### 6.1 预期效果

- ✅ PA0 每次检测到一次有效按下（消抖窗口 `20 ms`）时，PC13 LED 状态翻转一次。  
- ✅ 串口以 `115200` 波特率输出 `Key pressed, LED toggled`，且一次完整按下只打印 `1` 行。  

### 6.2 快速验证方法

方法1：串口事件计数验证（可直接加到代码中）

```c
static uint32_t press_cnt = 0;                                          // 统计有效按下次数

if ((*key_prev == GPIO_PIN_SET) && (key_now == GPIO_PIN_RESET))         // 仅统计按下沿
{
    HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);                             // 翻转LED
    press_cnt++;                                                         // 计数+1
    printf("cnt=%lu\r\n", press_cnt);                                   // 观察是否一按一增
}
```

方法2：故意缩短消抖时间做对照实验（操作步骤）
1. 把消抖阈值从 `20U` 改为 `1U`。  
2. 连续轻按按键，观察串口是否出现一次按下多次打印。  
3. 再改回 `20U`，确认多次触发明显减少，证明消抖参数有效。

---

## 七、常见问题排查

### ❓ 现象：按键没按时 LED 自己偶尔乱跳

**可能原因**：
1. PA0 配成了浮空输入，输入端悬空会被环境噪声干扰，读值随机抖动。  
2. 外部按键接线没有形成稳定默认电平，导致空闲态不确定。

**排查步骤**：

先确认 CubeMX 里 PA0 是 `GPIO_Input + Pull-up`，再用串口连续打印原始读值，看空闲态是否稳定为 `1`。

```c
/* 连续打印PA0读值，空闲时期望长期为1，按下时短暂为0 */
for (int i = 0; i < 50; i++)                                            // 连续采样50次用于观察稳定性
{
    uint8_t v = HAL_GPIO_ReadPin(GPIOA, GPIO_PIN_0);                    // 读取按键电平
    printf("PA0=%d\r\n", v);                                            // 期望：未按下多数为1，按下变0
    HAL_Delay(10);                                                      // 10ms间隔，便于串口观察
}
```

### ❓ 现象：按下按键后 LED 完全不响应

**可能原因**：
1. 没做消抖或逻辑写反，导致按下沿判断条件永远不成立。  
2. 板载 LED 是低电平点亮，你按“高亮低灭”逻辑写了反向控制。

**排查步骤**：

先跳过按键逻辑，直接让 LED 周期翻转，确认硬件引脚和极性没问题；再恢复按键判断。

```c
/* 先验证LED通道是否正常，期望每500ms翻转一次 */
while (1)
{
    HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);                             // 翻转PC13输出
    printf("LED toggled test\r\n");                                     // 串口同步打印
    HAL_Delay(500);                                                     // 500ms周期
}
```

### ❓ 现象：GPIO 配成开漏输出后，LED 变暗或几乎不亮（GPIO 特有）

**可能原因**：
1. 开漏输出只能“下拉”，不能主动输出高电平，若无上拉路径，高电平状态会悬空。  
2. 板载 LED 回路依赖推挽驱动能力，开漏模式电流路径不完整导致亮度异常。

**排查步骤**：

对同一引脚分别测试推挽和开漏两种模式的亮灭效果，确认是否是模式选错导致。

```c
/* 对比测试：推挽模式应稳定亮灭，开漏模式可能出现高电平无效 */
GPIO_InitTypeDef GPIO_InitStruct = {0};                                 // GPIO结构体

__HAL_RCC_GPIOC_CLK_ENABLE();                                           // 使能GPIOC时钟

GPIO_InitStruct.Pin = GPIO_PIN_13;                                      // 选择PC13
GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;                             // 先设推挽输出
GPIO_InitStruct.Pull = GPIO_NOPULL;                                     // 输出脚无需上下拉
GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;                            // 低速足够
HAL_GPIO_Init(GPIOC, &GPIO_InitStruct);                                 // 应用推挽配置

HAL_GPIO_WritePin(GPIOC, GPIO_PIN_13, GPIO_PIN_RESET);                  // 观察LED是否正常点亮
HAL_Delay(1000);                                                        // 保持1秒便于观察

GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_OD;                             // 切换为开漏输出
HAL_GPIO_Init(GPIOC, &GPIO_InitStruct);                                 // 应用开漏配置

HAL_GPIO_WritePin(GPIOC, GPIO_PIN_13, GPIO_PIN_SET);                    // 开漏高电平可能无法稳定熄灭/拉高
HAL_Delay(1000);                                                        // 保持1秒观察差异
```

---

## 八、设计选型参考

| 方案 | 优点 | 缺点 | 适用场景 |
|---|---|---|---|
| 推挽输出（本文 LED） | 高低电平均可主动驱动，电平干净 | 不能直接做线与 | 普通 LED/继电器使能/数字控制脚 |
| 开漏输出 | 可做多器件线与、可外接不同电压上拉 | 需要外部上拉，高电平上升慢 | I2C、总线共享告警线 |
| 上拉输入（本文按键） | 默认状态稳定，抗悬空干扰 | 按键通常低有效，逻辑要注意反向 | 按键、拨码开关、低有效输入 |
| 浮空输入 | 配置简单、无额外电流 | 极易受噪声影响，状态不可靠 | 仅在外部已有明确驱动时使用 |

> 💡 **选型原则**：先看“默认电平是否稳定”和“是否需要主动拉高”，需要稳定默认态选上拉/下拉，需要强驱动输出选推挽。

---

## 九、进阶方向

- **EXTI 按键中断化**：把轮询改成外部中断触发，能实现按下即响应，并避免主循环高频扫描。  
- **软件状态机消抖**：用定时采样状态机替代固定延时，能实现短按/长按/连击识别，避免阻塞式等待。  
- **多按键矩阵扫描**：扩展为 3x4 或 4x4 键盘输入，能实现更多人机交互并减少 GPIO 占用。  
- **低功耗唤醒输入**：配合 STOP 模式与唤醒引脚，能实现按键唤醒系统，避免空闲时持续耗电。  

---

## 十、总结

**本文完成了**：用 GPIO 实现了 PC13 控制 LED 与 PA0 读取按键，并在按下按键时可靠翻转 LED 且可通过串口验证触发次数。  

**核心知识点回顾**：  
1. GPIO 输入读到的是瞬时电平而不是事件，按键业务必须做边沿检测和消抖才能避免一次按下多次触发。  
2. 推挽输出适合直接驱动 LED 等普通负载，开漏输出若没有上拉路径会出现高电平无效或亮度异常。  
3. 上拉输入能给按键提供稳定默认高电平，按下接地变低的低有效逻辑在 STM32 工程里最常见也最稳妥。  

---

### 参考资料

- STM32F103 参考手册（固定）：[RM0008](https://www.st.com/resource/en/reference_manual/cd00171190.pdf)  
- HAL 库用户手册（固定）：[STM32F1 HAL/LL User Manual (UM1850)](https://www.st.com/resource/en/user_manual/dm00154093.pdf)  
- CubeMX 用户手册（固定）：[STM32CubeMX User Manual (UM1718)](https://www.st.com/resource/en/user_manual/dm00104712.pdf)  
- 补充资料1（主题相关）：[AN4899 - STM32 GPIO configuration for hardware settings and low-power consumption](https://www.st.com/resource/en/application_note/dm00315319.pdf)  
- 补充资料2（主题相关）：[STM32F1xx HAL GPIO Driver API](https://www.st.com/en/embedded-software/stm32cubef1.html)  

```
*如有错误或建议，欢迎在评论区留言。转载请注明原文出处。*
```

### 芯片差异说明（如有差异则必须包含，否则删除）

| 对比项 | STM32F103 (F1) | STM32F4 | STM32H7 |
|---|---|---|---|
| GPIO 模式寄存器 | `CRL/CRH`（每4位配置1脚） | `MODER/OTYPER/OSPEEDR/PUPDR` 分离 | 与 F4 类似但驱动能力和速度档位更高 |
| 上下拉配置 | 在输入模式中通过配置位实现 | `PUPDR` 独立配置更直观 | `PUPDR` 独立，且部分管脚默认复用差异更明显 |
| 输出速度含义 | 2/10/50MHz 档位 | Low/Medium/High/Very High（边沿能力） | 档位更高，EMI 与信号完整性影响更敏感 |
| 电平容限与高速特性 | 适合常规低速 IO | 中高速 IO 更常见 | 高速外设多，GPIO 误配置更容易引入串扰与过冲 |
