---
title: STM32 ADC 模数转换：电位器电压读取与串口打印
createTime: 2026/05/14 11:34:38
permalink: /tutorials/stm32/07-adc-polling/
---
【文章头部】
# STM32 ADC 模数转换：电位器电压读取与串口打印
> **系列**：外设基础系列  
> **难度等级**：⭐⭐⭐☆☆  
> **适用芯片**：STM32F103xx  
> **开发环境**：STM32CubeIDE 1.x + HAL 库  
> **前置知识**：GPIO 模拟输入模式、串口 `printf` 重定向、ADC 基本采样与量化概念

【一、前言】

ADC 的作用可以类比成“把水银温度计读数抄到 Excel 表格”。温度计里的连续高度变化，等价于模拟电压连续变化；抄到表格时变成一个个数字，等价于 ADC 输出离散数字值。也就是说，ADC 负责把“连续的电压”翻译成“可计算的整数”。

如果不用 ADC，想靠数字输入脚直接判断电位器电压，结果只能得到高低电平，丢失中间变化细节。实际开发会遇到两个直接问题：第一，控制精度不够，无法做平滑调速/调光；第二，后期维护困难，业务逻辑里需要额外做大量阈值判断，代码可读性变差。

本文目标很明确：配置 **ADC1 CH0（PA0）** 单次转换，读取电位器中间抽头电压，换算为 **0~3.3V** 实际值，并每 **200ms** 通过串口打印原始 ADC 值和换算电压。你可以一边转电位器，一边看串口数值变化，再用万用表对比验证换算是否准确。

【二、原理讲解】

### 2.1 工作原理

- **一句话核心**：ADC 先对输入电压采样并保持，再通过逐次逼近比较得到 12 位数字结果。

```text
模拟输入电压（PA0）
    │
    ▼
[采样保持电路]        ← 在采样窗口内“抓住”瞬时电压，减少转换时电压抖动影响
    │
    ▼
[逐次逼近比较器]      ← 按位比较电压大小，从高位到低位确定12位结果
    │
    ▼
[ADC数据寄存器]       ← 输出0~4095的数字值，供CPU读取和换算
```

> 💡 **关键理解**：12位分辨率表示量化等级是 \(2^{12}=4096\) 级，所以最小分辨电压约为 `VREF/4096`；电压再细的小变化会被量化误差吞掉，这是正常现象。

### 2.2 电压换算公式

$$
V = ADC\_Value \times \frac{VREF}{4096}
$$

| 符号 | 含义 | 单位 |
|---|---|---|
| \(V\) | 换算后的输入电压 | V |
| \(ADC\_Value\) | ADC 原始转换结果（12位） | 无 |
| \(VREF\) | ADC 参考电压（通常接近 3.3V） | V |
| 4096 | 12位 ADC 量化等级总数 | 无 |

```text
目标：已知 ADC 读值 2048、VREF=3.3V，求输入电压

已知：ADC_Value = 2048，VREF = 3.3V

推导过程：
  步骤1：代入公式 V = ADC_Value × VREF / 4096
  步骤2：V = 2048 × 3.3 / 4096 = 1.65V

验证：2048 是满量程 4096 的一半，所以电压应约为 3.3V 的一半，即 1.65V  ✓
```

### 2.3 关键寄存器 / HAL 结构体

| 寄存器（HAL成员） | 作用 | 典型值/选项 |
|---|---|---|
| `hadc1.Init.ScanConvMode` | 是否扫描多通道 | `ADC_SCAN_DISABLE` |
| `hadc1.Init.ContinuousConvMode` | 连续/单次转换 | `DISABLE`（本文单次） |
| `sConfig.Channel` | 选择 ADC 通道 | `ADC_CHANNEL_0` |
| `sConfig.SamplingTime` | 采样时间配置 | `ADC_SAMPLETIME_55CYCLES_5` |
| `ADC1->DR` | 转换结果寄存器 | 0~4095 |
| `ADC1->CR2` | 启动转换/校准相关控制 | `ADON/SWSTART/CAL` 位 |

> 💡 正常应用用 HAL 成员足够；出现读值异常、通道不对、转换不启动时再回头看寄存器位。

### 2.4 ADC 转换模式说明

单次转换是“你按一次扳机，采一枪数据”；连续转换是“开连发，持续不断采样”；扫描模式是“按设定顺序轮流采多个通道”。本文选 **单次转换**，因为实验重点是“读一次、算一次、打印一次”的可控流程，最容易对照万用表做准确验证。

【三、硬件说明】

| STM32引脚 | 复用功能 | 连接至 | 注意事项 |
|---|---|---|---|
| PA0 | ADC1_IN0（模拟输入） | 电位器中间抽头 | 必须配置为模拟输入，且输入电压不能超过 3.3V |
| 3.3V | 电源 | 电位器一端 | 作为分压上端，保证参考范围稳定 |
| GND | 地 | 电位器另一端 | 必须与开发板共地，否则读值漂移明显 |

> 电压提示：PA0 为 ADC 模拟输入脚，输入范围应限制在 `0~VREF`（通常 0~3.3V），严禁直接接入超过 3.3V 电压。

【四、CubeMX 配置步骤】

### 4.1 时钟配置

1. 第一步：RCC 配置（选外部晶振）  
2. 第二步：Clock Configuration 页面的具体设置（写明目标频率数值）  
   设置 `SYSCLK=72MHz`，`AHB=72MHz`，`APB1=36MHz`，`APB2=72MHz`。  
3. 第三步：确认该外设所在总线的时钟频率（写明总线名称和数值）  
   ADC1 挂在 `APB2`，ADC 时钟来自 `PCLK2` 分频，建议 ADC 时钟配置在 `12MHz`（例如 PCLK2/6）。

### 4.2 外设配置

**步骤一**：在 `Pinout & Configuration -> Analog -> ADC1` 启用 ADC1，并将通道选择到 `IN0 (PA0)`。  

**步骤二**：Parameter Settings 参数表格

| 参数项 | 填写值 | 说明 |
|---|---|---|
| Resolution | `12-bit` | F103 常用精度，输出 0~4095 |
| Scan Conversion Mode | `Disable` | 本文只采单通道，不需要扫描 |
| Continuous Conversion Mode | `Disable` | 本文采用单次转换，每次手动启动 |
| Data Alignment | `Right` | 右对齐方便直接按 0~4095 换算 |
| External Trigger Conversion Source | `Software Start` | 用代码手动触发转换，流程清晰 |
| Channel & Rank | `Channel 0 / Rank 1` | 明确 PA0 为唯一采样通道 |
| Sampling Time | `55.5 Cycles` | 兼顾速度和稳定性，源阻抗较高时更稳 |

**步骤三**：NVIC 中断配置（写明勾选路径和优先级建议值）  
本文使用轮询读取，不启用 ADC 中断。路径 `Pinout & Configuration -> System Core -> NVIC`，`ADC1_2 global interrupt` 不勾选；若后续改中断模式，建议抢占优先级 `2`。  

**步骤四**：代码生成设置（写明需要勾选哪个选项及其路径）  
在 `Project Manager -> Code Generator` 勾选 `Generate peripheral initialization as a pair of '.c/.h' files per peripheral`，便于后续把 ADC 驱动和业务代码分离。

【五、代码实现】

### 5.1 设计思路

- 采样与换算封装成独立函数，因为后续切换到中断或 DMA 时只需替换采样入口。  
- 每次读取都走“启动-等待-取值”完整流程，因为单次模式下这样最稳，问题也最容易定位。  
- 先做 ADC 校准再读取，因为 F1 系列不校准时零点和比例误差会更明显。  
- 打印周期固定 200ms，既能观察变化又不会让串口日志刷得太快。

### 5.2 初始化代码

```c
/* USER CODE BEGIN 2 */
HAL_ADCEx_Calibration_Start(&hadc1);                                     // 启动ADC校准，先修正内部偏差再采样可减少系统误差
printf("ADC1 CH0 single-conversion demo start\r\n");                     // 打印启动信息，确认串口与程序运行正常
HAL_Delay(20);                                                           // 给模拟前端和串口一点稳定时间，避免上电瞬间读值抖动过大
/* USER CODE END 2 */
```

> 💡 校准的目的不是“让数值更好看”，而是降低 ADC 内部失调误差，否则你会看到同一电压反复测量有固定偏差。

### 5.3 核心功能代码

```c
/**
  * @brief  执行一次ADC采样并换算为电压值
  * @param  adc_raw: 输出原始ADC值指针（0~4095）
  * @param  voltage: 输出换算电压值指针（单位V）
  * @retval HAL_StatusTypeDef: HAL_OK表示本次读取成功
  * @note   采用单次转换流程：Start -> PollForConversion -> GetValue
  */
HAL_StatusTypeDef ADC_ReadVoltage(uint16_t *adc_raw, float *voltage)
{
    uint32_t raw = 0U;                                                   // 临时保存ADC原始值，避免直接操作指针带来中间态风险
    const float vref = 3.3f;                                             // 参考电压按3.3V换算，后续可改为实测VREF提高精度

    if ((adc_raw == NULL) || (voltage == NULL))                          // 分支1：参数非法时直接返回，避免空指针访问
    {
        return HAL_ERROR;                                                // 参数错误属于调用层问题，明确返回失败
    }

    if (HAL_ADC_Start(&hadc1) != HAL_OK)                                 // 分支2：软件触发启动一次转换
    {
        return HAL_ERROR;                                                // 启动失败通常是状态机异常或外设未初始化
    }

    if (HAL_ADC_PollForConversion(&hadc1, 10) != HAL_OK)                 // 分支3：等待转换完成，超时10ms防止死等
    {
        HAL_ADC_Stop(&hadc1);                                            // 超时时主动停止，防止ADC状态残留影响下一次读取
        return HAL_TIMEOUT;                                               // 返回超时状态，便于上层做异常统计
    }

    raw = HAL_ADC_GetValue(&hadc1);                                      // 分支4：转换完成后读取12位结果
    HAL_ADC_Stop(&hadc1);                                                // 单次模式读完即停，保持流程闭环和状态可控

    *adc_raw = (uint16_t)raw;                                            // 输出原始值给上层用于调试和范围判断
    *voltage = ((float)raw) * vref / 4096.0f;                            // 按12位公式换算电压，得到直观物理量

    return HAL_OK;                                                       // 本次采样与换算成功
}
```

```c
/* USER CODE BEGIN 3 */
while (1)
{
    uint16_t adc_value = 0U;                                             // 每轮初始化原始值，避免打印上次残留数据
    float voltage = 0.0f;                                                // 每轮初始化电压值，确保异常分支下输出可预测
    HAL_StatusTypeDef ret = ADC_ReadVoltage(&adc_value, &voltage);       // 调用封装函数执行一次完整采样与换算

    if (ret == HAL_OK)                                                   // 条件1：读取成功时打印原始值和换算电压
    {
        printf("ADC=%u, V=%.3fV\r\n", adc_value, voltage);               // 保留3位小数便于和万用表读数做对比
    }
    else                                                                 // 条件2：读取失败时打印错误码便于定位问题
    {
        printf("ADC read failed, ret=%d\r\n", (int)ret);                 // 失败信息能快速区分超时/参数/启动异常
    }

    HAL_Delay(200);                                                      // 每200ms读取一次，平衡实时性与串口负载
}
/* USER CODE END 3 */
```

### 5.4 串口重定向

```c
#include "stdio.h"                                                       // 引入标准IO接口声明，提供fputc原型

int fputc(int ch, FILE *f)                                               // 将printf输出重定向到USART1发送通道
{
    HAL_UART_Transmit(&huart1, (uint8_t *)&ch, 1, 0xFFFF);              // 阻塞发送单字节，优先保证调试日志完整可靠
    return ch;                                                           // 返回已发送字符，满足标准库接口行为
}
```

Keil 需勾选 MicroLIB，CubeIDE 需添加 `syscalls.c`。

【六、实验现象与验证】

### 6.1 预期效果

- ✅ 串口每 `200ms` 打印一次，ADC 原始值在电位器旋转时应覆盖约 `0~4095` 范围。  
- ✅ 换算电压值应随旋钮变化在约 `0.000V~3.300V` 范围内连续变化。  

### 6.2 快速验证方法

方法1：旋钮全行程验证  
1. 把电位器从最小转到最大。  
2. 观察串口 `ADC` 从接近 `0` 逐步上升到接近 `4095`。  
3. 同时观察 `V` 从接近 `0V` 升到接近 `3.3V`。

方法2：万用表对比验证（必须做）  
1. 万用表直流档测量电位器中间抽头对 GND 的电压。  
2. 记录此时串口打印电压值。  
3. 两者偏差建议控制在 `±0.05V~±0.1V`；若超过 `0.1V`，优先检查 VREF 与校准状态。

【七、常见问题排查】

### ❓ 现象：ADC 读值始终为 0 或 4095

**可能原因**：
1. PA0 没配置为模拟输入，数字输入缓冲影响了模拟采样路径。  
2. 电位器接线错误（中间抽头未接 PA0 或两端未接 3.3V/GND）。

**排查步骤**：

先确认 CubeMX 中 PA0 是 `Analog` 模式，再打印连续采样值观察是否随旋钮变化。

```c
/* 连续打印原始值，期望转动电位器时数值明显变化 */
for (int i = 0; i < 20; i++)                                            // 连续采样20次用于观察趋势是否变化
{
    HAL_ADC_Start(&hadc1);                                              // 启动单次转换，触发当前电压采样
    HAL_ADC_PollForConversion(&hadc1, 10);                              // 等待转换完成，避免读取到旧数据
    uint32_t raw = HAL_ADC_GetValue(&hadc1);                            // 读取当前ADC值判断是否卡死在边界
    HAL_ADC_Stop(&hadc1);                                               // 读完停止，保持每次流程一致便于对比
    printf("raw=%lu\r\n", raw);                                         // 期望不是一直0或一直4095
    HAL_Delay(100);                                                     // 给你手动转动电位器留出观察时间
}
```

### ❓ 现象：换算电压与万用表偏差超过 0.1V

**可能原因**：
1. 参考电压 VREF 按 3.3V 固定值计算，但实际板上电压并非精确 3.300V。  
2. ADC 未做校准或校准时机不对，导致零点/增益误差偏大。

**排查步骤**：

先实测开发板 3.3V 电压并替换换算公式中的 VREF，再确保上电后先校准再采样。

```c
/* 使用实测VREF换算，期望和万用表偏差明显缩小 */
const float vref_real = 3.28f;                                          // 这里填万用表实测的3.3V电源值
HAL_ADCEx_Calibration_Start(&hadc1);                                    // 先执行校准，减少内部失调导致的系统偏差
HAL_ADC_Start(&hadc1);                                                  // 启动一次转换，获取当前电位器电压对应原始值
HAL_ADC_PollForConversion(&hadc1, 10);                                  // 等待转换结束，保证数据是本次最新结果
uint32_t raw = HAL_ADC_GetValue(&hadc1);                                // 读取ADC原始值用于新VREF换算
HAL_ADC_Stop(&hadc1);                                                   // 单次流程收尾，避免状态机残留
float v = (float)raw * vref_real / 4096.0f;                             // 用实测VREF换算更接近真实电压
printf("raw=%lu, v_real=%.3fV\r\n", raw, v);                            // 对比万用表，看偏差是否回到可接受范围
```

### ❓ 现象：快速连续读取时偶尔出现跳变尖峰（ADC 特有）

**可能原因**：
1. 采样时间过短，电位器源阻抗下采样电容来不及充电，导致读值不稳。  
2. 模拟地噪声或电源纹波耦合到输入，单次值出现抖动尖峰。

**排查步骤**：

把采样时间调长，并做多次平均过滤尖峰，再观察稳定性是否改善。

```c
/* 8次平均滤波，期望抑制偶发尖峰跳变 */
uint32_t sum = 0U;                                                      // 累加多次采样值，用于后续求平均降低随机噪声
for (int i = 0; i < 8; i++)                                             // 连续采8次，平衡响应速度与抗抖效果
{
    HAL_ADC_Start(&hadc1);                                              // 每次独立启动，保证样本时间分散
    HAL_ADC_PollForConversion(&hadc1, 10);                              // 等待转换完成，确保每个样本有效
    sum += HAL_ADC_GetValue(&hadc1);                                    // 累加原始值，为平均计算准备
    HAL_ADC_Stop(&hadc1);                                               // 每次收尾停止，避免状态叠加引入误差
}
uint32_t avg = sum / 8U;                                                // 求平均值，削弱瞬时尖峰对结果的影响
printf("adc_avg=%lu\r\n", avg);                                         // 观察平均后曲线应更平滑稳定
```

【八、设计选型参考】

| 方案 | 优点 | 缺点 | 适用场景 |
|---|---|---|---|
| 轮询读取（本文） | 流程直观、调试简单、容易定位问题 | CPU 等待转换期间有阻塞 | 低速采样、教学实验、单通道读取 |
| 中断读取 | CPU 可并行处理其他任务，响应更灵活 | 状态管理复杂，调试门槛更高 | 中速采样、事件驱动采集 |
| DMA 读取 | 高吞吐、低CPU占用，适合连续采样 | 初始化与缓冲管理复杂 | 多通道高速采样、波形采集 |
| 轮询+平均滤波 | 实现简单且读值更稳 | 响应速度略降 | 低速传感器、旋钮/电位器场景 |

> 💡 **选型原则**：采样频率低、先求稳就用轮询；频率中高且任务并行需求强优先中断或 DMA。

【九、进阶方向】

- **多通道扫描采样**：可同时读取电位器、光敏、电池分压，避免多个外设各自独立采集导致代码分散。  
- **DMA + 环形缓冲**：可实现连续高速采样并降低 CPU 占用，避免主循环被采样任务拖慢。  
- **数字滤波算法**：可实现均值/中值/IIR 平滑，避免噪声导致控制量抖动。  
- **内部参考与温度通道校准**：可提升电压测量一致性，避免供电波动带来的换算偏差。

【十、总结】

**本文完成了**：用 ADC1 CH0 单次转换读取了 PA0 电位器电压，并每 200ms 串口输出原始 ADC 值和换算后的实际电压。  

**核心知识点回顾**：  
1. 12位 ADC 的输出范围是 0~4095，电压换算公式为 \(V=ADC\_Value\times VREF/4096\)。  
2. PA0 必须配置为模拟输入并完成 ADC 校准，否则容易出现读值卡死或换算偏差过大。  
3. 单次轮询模式最适合入门验证流程，中断和 DMA 更适合后续中高速连续采样场景。  

【参考资料】

1. STM32F103 Reference Manual (RM0008): https://www.st.com/resource/en/reference_manual/cd00171190.pdf  
2. STM32F1 HAL/LL User Manual (UM1850): https://www.st.com/resource/en/user_manual/dm00154093.pdf  
3. STM32CubeMX User Manual (UM1718): https://www.st.com/resource/en/user_manual/dm00104712.pdf  
4. STM32 ADC application note (AN3116): https://www.st.com/resource/en/application_note/cd00258017.pdf  

【文末】*如有错误或建议，欢迎在评论区留言。转载请注明原文出处。*
