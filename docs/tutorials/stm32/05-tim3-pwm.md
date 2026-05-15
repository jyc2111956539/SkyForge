---
title: STM32 通用定时器 PWM 输出：TIM3 控制 LED 呼吸灯
createTime: 2026/05/14 11:34:38
permalink: /tutorials/stm32/05-tim3-pwm/
---
# STM32 通用定时器 PWM 输出：TIM3 控制 LED 呼吸灯

> **系列**：外设基础系列  
> **难度等级**：⭐⭐⭐☆☆  
> **适用芯片**：STM32F103xx（其他系列差异见文末说明）  
> **开发环境**：STM32CubeIDE 1.x + HAL 库  
> **前置知识**：定时器基础计数原理、GPIO 复用功能配置、占空比与频率基本概念

---

## 一、前言

PWM 可以理解成“快速开关的电源旋钮”。就像你用手快速开关台灯，开得越久看起来越亮，开得越短看起来越暗；PWM 就是用固定频率快速开关引脚，通过“每个周期里亮的时间比例”控制平均亮度。这里“亮的时间比例”就是占空比，对应定时器里的 `CCR/ARR` 比值。

如果不用硬件 PWM，而是软件延时去翻转 GPIO，项目里会遇到明显问题。第一是 CPU 占用高，主循环很容易被“造波形”拖住；第二是波形抖动大，频率和占空比会受中断与代码路径影响；第三是可维护性差，后续加任务后亮度变化会不稳定。

本文会带你实现：用 **TIM3 CH1（PA6）** 输出 **1kHz PWM**，在主循环里动态修改 `CCR1`，让 LED 从 0% 亮度逐步变到最亮，再逐步变暗循环。你可以通过肉眼观察呼吸效果，以及用示波器/逻辑分析仪看 PA6 占空比变化来验证。

---

## 二、原理讲解

### 2.1 工作原理

**一句话核心**：TIM3 以固定周期计数，`CNT < CCR1` 时输出高电平，`CNT >= CCR1` 时输出低电平，从而形成可调占空比 PWM。

```text
定时器输入时钟
    │
    ▼
[PSC预分频器]        ← 把高频时钟降到目标计数频率
    │
    ▼
[ARR周期寄存器]      ← 定义一个PWM周期包含多少计数
    │
    ▼
[CCR1比较寄存器]     ← 定义周期内高电平持续的计数长度
    │
    ▼
[PA6输出PWM]         ← 输出固定频率、可变占空比波形
```

> 💡 **关键理解**：频率主要由 `PSC` 和 `ARR` 决定，占空比主要由 `CCR1` 决定，改 `CCR1` 不该改变频率。

### 2.2 关键参数计算

PWM 频率公式：

$$
f_{PWM}=\frac{f_{TIM}}{(PSC+1)\times(ARR+1)}
$$

占空比公式（PWM 模式 1，高电平有效）：

$$
D=\frac{CCR1}{ARR+1}\times100\%
$$

| 符号 | 含义 | 单位 |
|---|---|---|
| \(f_{TIM}\) | TIM3 输入时钟频率 | Hz |
| \(PSC\) | 预分频寄存器值 | 无 |
| \(ARR\) | 自动重装值 | 无 |
| \(CCR1\) | 比较值（高电平计数长度） | 无 |
| \(f_{PWM}\) | PWM 输出频率 | Hz |
| \(D\) | PWM 占空比 | % |

```text
目标：输出 1kHz PWM，并给出 25% 占空比对应的 CCR1

已知：fTIM=72MHz，取 PSC=71，ARR=999

推导过程：
  步骤1：fPWM = 72,000,000 / ((71+1)×(999+1)) = 1,000Hz
  步骤2：25%占空比时，CCR1 = 25% × (ARR+1) = 0.25×1000 = 250

验证：D = 250/1000 = 25%  ✓
```

### 2.3 关键寄存器 / HAL 结构体

| 寄存器（HAL成员） | 作用 | 典型值/选项 |
|---|---|---|
| `htim3.Init.Prescaler` | 预分频设置 | `71` |
| `htim3.Init.Period` | PWM 周期 ARR | `999` |
| `sConfigOC.OCMode` | PWM 输出模式 | `TIM_OCMODE_PWM1` |
| `sConfigOC.Pulse` | 初始占空比 CCR1 | `0`~`999` |
| `TIM3->CCR1` | CH1 实时占空比寄存器 | `0`~`ARR` |
| `GPIOA PA6` 复用配置 | 把比较输出送到引脚 | `AF Push-Pull` |

> 💡 正常调光用 HAL 接口改 `CCR1` 就够；只有占空比不生效或波形异常时再查 `CCR1/CCER/CR1` 等寄存器。

### 2.4 子功能说明

本文只用 **PWM 输出模式（TIM3 CH1）**；TIM3 的输入捕获、输出比较、编码器接口模式留到后续文章，区别是一类“造波形”，一类“测时间/测边沿”。

---

## 三、硬件说明

| STM32引脚 | 复用功能 | 连接至 | 注意事项 |
|---|---|---|---|
| PA6 | TIM3_CH1 | LED 阳极（串联限流电阻） | 需配置为复用推挽输出，不是普通 GPIO 输出 |
| GND | 电源地 | LED 阴极 | 必须共地，否则电平参考不一致 |
| 3.3V（可选） | 电源 | 供电参考 | LED 串联电阻建议 220Ω~1kΩ，避免过流 |

> 电压提示：STM32F103 GPIO 为 3.3V 逻辑电平，外接 LED/模块必须满足 3.3V 驱动条件。

---

## 四、CubeMX 配置步骤

### 4.1 时钟配置

1. 第一步：RCC 配置（选外部晶振）  
2. 第二步：Clock Configuration 页面的具体设置（写明目标频率数值）  
   设置 `SYSCLK=72MHz`，`AHB=72MHz`，`APB1=36MHz`，`APB2=72MHz`。  
3. 第三步：确认该外设所在总线的时钟频率（写明总线名称和数值）  
   TIM3 在 `APB1`，当 APB1 分频不为 1 时定时器时钟翻倍，确认 `TIM3CLK=72MHz`。

### 4.2 外设配置

**步骤一**：在 `Pinout & Configuration -> Timers -> TIM3` 里启用 `PWM Generation CH1`，确认 PA6 变为 `TIM3_CH1`。  

**步骤二**：Parameter Settings 参数表格

| 参数项 | 填写值 | 说明 |
|---|---|---|
| Prescaler | `71` | 72MHz 分频到 1MHz，后续按 1us 计数更直观 |
| Counter Period (ARR) | `999` | 1MHz 下计 1000 个数得到 1kHz |
| Counter Mode | `Up` | 递增计数便于理解和排查 |
| Pulse (CCR1) | `0` | 上电先灭灯，避免突亮 |
| OC Mode | `PWM mode 1` | `CNT<CCR1` 时输出有效高电平 |
| Channel Polarity | `High` | 占空比与“亮度增大”方向一致，避免逻辑反向 |

**步骤三**：NVIC 中断配置（写明勾选路径和优先级建议值）  
本实验 PWM 输出不依赖 TIM3 中断，路径 `Pinout & Configuration -> System Core -> NVIC` 中可不勾选 `TIM3 global interrupt`。若后续要用更新中断做节拍，建议优先级 `Preemption Priority=2`。  

**步骤四**：代码生成设置（写明需要勾选哪个选项及其路径）  
在 `Project Manager -> Code Generator` 勾选 `Generate peripheral initialization as a pair of '.c/.h' files per peripheral`，便于把 TIM3 配置与业务代码分离。

---

## 五、代码实现

### 5.1 设计思路

- 频率固定、占空比可变分开处理，因为呼吸灯核心是“亮度变化”，不是“频率变化”。  
- 占空比变化用步进方式（每次加减固定值），因为逻辑简单、可控，初学者最容易调参。  
- 主循环里只改 `CCR1`，不重启定时器，因为重启会引入闪烁和跳变。  
- 限制 `CCR1 <= ARR`，因为超范围会导致占空比异常，看起来像“改值没反应”。

### 5.2 初始化代码

```c
/* USER CODE BEGIN 2 */
HAL_TIM_PWM_Start(&htim3, TIM_CHANNEL_1);                               // 启动TIM3 CH1 PWM输出，否则PA6不会出波形
__HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 0);                        // 上电先把占空比设为0，避免LED突然全亮
uint16_t duty = 0;                                                       // 当前CCR步进值，后续用它控制亮度变化
int8_t step = 10;                                                        // 每次变化步长，值越大呼吸越快且亮度台阶更明显
/* USER CODE END 2 */
```

> 💡 `HAL_TIM_PWM_Start()` 是最容易漏掉的一步，不调用它就算参数全对也没有 PWM 输出。

### 5.3 核心功能代码

**代码块1：核心处理函数**

```c
/**
  * @brief  更新呼吸灯占空比并写入TIM3 CCR1
  * @param  duty: 当前占空比计数值指针
  * @param  step: 占空比变化方向与步长指针
  * @retval None
  * @note   duty范围必须限制在0~ARR，避免CCR越界导致现象异常
  */
static void BreathLed_Update(uint16_t *duty, int8_t *step)
{
    uint16_t arr = __HAL_TIM_GET_AUTORELOAD(&htim3);                    // 读取当前ARR作为占空比上限，防止硬编码出错

    if ((*step > 0) && (*duty >= arr))                                   // 分支1：正在增亮且已到上限
    {
        *step = -(*step);                                                // 到顶后反向，开始渐暗
    }
    else if ((*step < 0) && (*duty == 0U))                               // 分支2：正在变暗且已到底
    {
        *step = -(*step);                                                // 到底后反向，开始渐亮
    }
    else                                                                 // 分支3：处于正常变化区间
    {
        /* keep current direction */                                     // 保持当前方向，形成平滑呼吸节奏
    }

    *duty = (uint16_t)((int32_t)(*duty) + (int32_t)(*step));            // 按步长更新占空比值，控制亮度变化速度
    __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, *duty);                // 把新占空比写入CCR1，立即更新PWM高电平宽度
}
```

**代码块2：主循环 `while(1)` 部分**

```c
/* USER CODE BEGIN 3 */
while (1)
{
    BreathLed_Update(&duty, &step);                                      // 周期更新一次占空比，驱动呼吸亮度曲线
    HAL_Delay(10);                                                       // 10ms刷新节拍在人眼上更平滑，同时CPU负担较低
}
/* USER CODE END 3 */
```

---

## 六、实验现象与验证

### 6.1 预期效果

- ✅ PA6 输出 PWM 频率约 **1kHz**，示波器测得周期约 **1.000ms**。  
- ✅ LED 亮度按约 **2 秒~4 秒** 一个呼吸周期（取决于步长与延时）平滑明暗循环。  

### 6.2 快速验证方法

方法1：示波器/逻辑分析仪验证（操作步骤）  
1. 探头接 PA6 与 GND，时基先设 200us/div。  
2. 测频率应接近 1kHz。  
3. 观察占空比应从接近 0% 逐步变化到接近 100% 再返回。

方法2：运行时占空比边界自检（代码片段）

```c
uint16_t arr = __HAL_TIM_GET_AUTORELOAD(&htim3);                        // 读取ARR确认占空比上限
uint16_t ccr = __HAL_TIM_GET_COMPARE(&htim3, TIM_CHANNEL_1);            // 读取当前CCR1用于边界检查
if (ccr > arr)                                                           // 检查是否发生CCR越界写入
{
    __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, arr);                  // 越界时强制钳位，避免波形异常
}
```

---

## 七、常见问题排查

### ❓ 现象：PA6 没有任何 PWM 波形，LED 一直灭或一直亮

**可能原因**：
1. 忘记调用 `HAL_TIM_PWM_Start(&htim3, TIM_CHANNEL_1)`，通道未真正启动输出。  
2. PA6 没配成复用推挽，仍是普通 GPIO 模式，定时器输出信号无法送到引脚。

**排查步骤**：

先确认 `MX_TIM3_Init()` 后确实调用了 `HAL_TIM_PWM_Start`，再核对 GPIO 初始化是否为复用输出。

```c
/* 重新执行最小启动序列，期望PA6出现PWM波形 */
HAL_TIM_PWM_Stop(&htim3, TIM_CHANNEL_1);                                // 先停止通道，避免状态不一致
HAL_TIM_PWM_Start(&htim3, TIM_CHANNEL_1);                               // 重新启动PWM输出，验证启动链路是否完整
__HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 500);                      // 设50%占空比，示波器应看到高低各半
```

### ❓ 现象：LED 亮度不变化，始终固定一个亮度

**可能原因**：
1. 主循环没有持续更新 `CCR1`，占空比只在初始化时写了一次。  
2. `HAL_Delay` 太大或步长太小，变化太慢，看起来像没变化。

**排查步骤**：

先把步长增大、延时减小，快速验证占空比是否在变；确认后再回调到柔和参数。

```c
/* 临时加快变化速度，期望肉眼马上看到亮度变化 */
step = 50;                                                               // 放大步长，快速放大占空比变化幅度
HAL_Delay(2);                                                            // 缩短刷新周期，提高亮度变化速度
BreathLed_Update(&duty, &step);                                          // 立即执行一次更新，快速验证逻辑是否生效
```

### ❓ 现象：占空比修改无效或突然跳变（TIM PWM 特有）

**可能原因**：
1. 写入的 `CCR1` 超过 `ARR`，有效占空比被截断或表现异常。  
2. 修改了错误通道（比如改了 `CCR2`，但实际输出在 CH1）。

**排查步骤**：

每次写 `CCR1` 前先读取 `ARR` 做边界钳位，并确认使用的是 `TIM_CHANNEL_1`。

```c
/* 写CCR前做边界保护，期望CCR始终处于0~ARR */
uint16_t arr = __HAL_TIM_GET_AUTORELOAD(&htim3);                        // 读取ARR作为当前合法上限
uint16_t next_ccr = duty;                                                // 准备写入的新占空比值
if (next_ccr > arr)                                                      // 检查是否超出ARR
{
    next_ccr = arr;                                                      // 超限时钳位到最大值，避免无效或异常占空比
}
__HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, next_ccr);                // 明确写CH1，避免改错通道
```

---

## 八、设计选型参考

| 方案 | 优点 | 缺点 | 适用场景 |
|---|---|---|---|
| 软件模拟 PWM（GPIO+延时） | 实现直观，不依赖定时器外设 | CPU 占用高，频率抖动明显 | 临时实验、极低要求控制 |
| 定时器硬件 PWM（本文） | 频率稳定、CPU 占用低、可多通道并行 | 初始配置步骤较多 | LED 调光、电机调速、蜂鸣器驱动 |
| DAC 模拟电压调光 | 输出平滑、无开关纹波 | 需 DAC 资源和外围条件 | 对纹波敏感的模拟控制 |
| 恒流驱动芯片（外部） | 电流控制精确、亮度一致性好 | 成本与硬件复杂度提升 | 多路高品质照明、量产产品 |

> 💡 **选型原则**：只要目标是数字口调光且要稳定、省 CPU，优先定时器硬件 PWM；软件模拟 PWM 只用于快速验证。

---

## 九、进阶方向

- **DMA 自动更新 CCR 波形表**：能实现更平滑的呼吸曲线，避免主循环频繁改寄存器。  
- **多通道 RGB PWM 混色**：能实现颜色渐变与场景灯效，避免单色呼吸灯表现单一。  
- **加入伽马校正表**：能实现“视觉上更线性”的亮度变化，避免中低亮区突变感明显。  
- **互补输出与死区控制（高级定时器）**：能实现半桥/全桥功率驱动，避免上下管直通风险。  

---

## 十、总结

**本文完成了**：用 TIM3 CH1 在 PA6 输出 1kHz PWM，并通过动态修改 CCR1 实现了 LED 由暗到亮再到暗的循环呼吸效果。  

**核心知识点回顾**：  
1. PWM 频率由 `PSC` 和 `ARR` 决定，公式为 \(f_{PWM}=f_{TIM}/((PSC+1)\times(ARR+1))\)，参数写入需按寄存器规则减 1。  
2. 占空比由 `CCR1/(ARR+1)` 决定，保持 `CCR1` 在 `0~ARR` 范围内是避免亮度异常的关键。  
3. 硬件 PWM 的稳定性和 CPU 占用都明显优于软件模拟 PWM，适合实际项目长期使用。  

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
| 定时器时钟来源 | APB 分频不为1时定时器时钟翻倍 | 规则类似，但时钟树更复杂 | 时钟域更多，内核时钟选择更灵活 |
| PWM 分辨率体验 | 常用 16 位计数器，基础调光够用 | 高频下分辨率与频率平衡更灵活 | 高频高分辨率场景余量更大 |
| GPIO 复用配置 | 复用推挽配置相对直接 | AF 配置项更细分 | AF 与高速驱动配置项更多 |
| 高级功能扩展 | 基础 PWM 场景为主 | 更多定时器联动与触发场景 | 复杂实时控制与多外设同步能力更强 |
