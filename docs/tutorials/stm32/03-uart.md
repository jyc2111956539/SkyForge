---
title: STM32 UART 串口通信
createTime: 2026/05/14 11:34:37
permalink: /tutorials/stm32/03-uart/
---
# STM32 UART 串口通信

> **系列**：外设基础系列  
> **难度等级**：⭐⭐☆☆☆  
> **适用芯片**：STM32F103xx（其他系列差异见文末说明）  
> **开发环境**：STM32CubeIDE 1.x + HAL 库  
> **前置知识**：GPIO 复用功能基础、波特率与比特时间概念、C 语言 `printf` 与函数重定向基础

---

## 一、前言

USART 可以理解成“单片机的快递窗口”。你把字符串放进发送寄存器，就像把包裹交给窗口，USART 会按约定速度（波特率）一位一位发出去；接收端按同样节奏收包裹，这就是串口通信的核心。

如果不用 USART，而是软件手搓延时打波形，实际开发会很痛苦。第一，CPU 占用高，主循环会被阻塞；第二，时序精度受编译优化和中断影响，容易乱码；第三，可维护性差，换时钟或换波特率后要整套重算和重测。

本文会让你完成一个可直接验证的实验：配置 **USART1（PA9 TX / PA10 RX）**，波特率 **115200bps**，完成 `printf` 重定向，并在串口助手中每 **500ms** 看到一行 `"Hello STM32"`。你将通过串口助手接收结果和计数打印两种方式确认功能正确。

---

## 二、原理讲解

### 2.1 工作原理

**一句话核心**：USART 把 CPU 写入的数据按设定波特率序列化到 TX 引脚，再由对端按同样时序还原成字节。

```text
printf字符串
    │
    ▼
[fputc重定向]        ← 把标准输出转交给USART发送函数
    │
    ▼
[USART1发送寄存器]    ← 装载待发送字节并触发移位发送
    │
    ▼
[PA9(TX)引脚]        ← 以115200bps输出串行电平
    │
    ▼
串口助手显示文本
```

> 💡 **关键理解**：波特率一致只是前提，若时钟源配错导致实际波特率偏差过大，双方“看起来都设了115200”也会乱码。

### 2.2 关键参数计算

串口异步模式下（16倍过采样），BRR 计算常用公式：

$$
USARTDIV=\frac{f_{PCLK}}{16 \times BaudRate}
$$

$$
BRR = \left(\lfloor USARTDIV \rfloor << 4\right) + \text{round}\left((USARTDIV-\lfloor USARTDIV \rfloor)\times16\right)
$$

| 符号 | 含义 | 单位 |
|---|---|---|
| \(f_{PCLK}\) | USART 所在总线时钟（USART1 在 APB2） | Hz |
| \(BaudRate\) | 目标波特率 | bps |
| \(USARTDIV\) | 波特率分频系数 | 无 |
| \(BRR\) | 波特率寄存器最终写入值 | 无 |

```text
目标：USART1 配置 115200bps，求 BRR（APB2=72MHz）

已知：fPCLK = 72,000,000；BaudRate = 115,200

推导过程：
  步骤1：USARTDIV = 72,000,000 / (16×115,200) = 39.0625
  步骤2：整数部分=39，小数部分=0.0625；小数编码=0.0625×16=1
         BRR = (39<<4) + 1 = 0x271

验证：72,000,000 / (16×39.0625) = 115,200  ✓
```

### 2.3 关键寄存器 / HAL 结构体

| 寄存器（HAL成员） | 作用 | 典型值/选项 |
|---|---|---|
| `huart1.Init.BaudRate` | 设置目标波特率 | `115200` |
| `huart1.Init.WordLength` | 数据位长度 | `UART_WORDLENGTH_8B` |
| `huart1.Init.StopBits` | 停止位 | `UART_STOPBITS_1` |
| `huart1.Init.Parity` | 奇偶校验 | `UART_PARITY_NONE` |
| `huart1.Init.Mode` | 收发方向 | `UART_MODE_TX_RX` |
| `USART1->BRR` | 波特率分频寄存器 | `0x271`（72MHz/115200） |

> 💡 日常应用优先用 HAL 配置；只有在排查“明明同配置却乱码”这类问题时，才重点核对 `BRR` 和总线时钟。

### 2.4 子功能说明

本文使用的是 **USART 异步模式（UART）** 做基础收发，其他如同步模式、LIN、半双工等留到后续文章；一句话区分：异步模式不带时钟线、靠双方约定波特率对齐时序。

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
   USART1 位于 `APB2`，确认 `PCLK2=72MHz`。

### 4.2 外设配置

**步骤一**：在 `Pinout & Configuration -> Connectivity -> USART1`，选择 `Asynchronous`，确认 `PA9` 自动为 `USART1_TX`、`PA10` 自动为 `USART1_RX`。  

**步骤二**：Parameter Settings 参数表格

| 参数项 | 填写值 | 说明 |
|---|---|---|
| Baud Rate | `115200` | 与串口助手一致，保证位时间匹配 |
| Word Length | `8 Bits` | 8N1 是最常见组合，兼容性最好 |
| Parity | `None` | 先做基础通信，减少排错变量 |
| Stop Bits | `1` | 与常用串口工具默认配置一致 |
| Mode | `TX_RX` | 既能打印也能后续扩展接收 |
| Hardware Flow Control | `Disable` | 本实验不用 RTS/CTS，简化连线与配置 |

**步骤三**：NVIC 中断配置（写明勾选路径和优先级建议值）  
本实验发送采用轮询，不强制开启 USART1 中断。路径 `Pinout & Configuration -> System Core -> NVIC`，`USART1 global interrupt` 可先不勾选；后续改中断接收时建议优先级 `Preemption Priority=2`。  

**步骤四**：代码生成设置（写明需要勾选哪个选项及其路径）  
在 `Project Manager -> Code Generator` 勾选 `Generate peripheral initialization as a pair of '.c/.h' files per peripheral`，便于把串口初始化和业务逻辑分层管理。

---

## 五、代码实现

### 5.1 设计思路

- 把 `printf` 重定向到 `HAL_UART_Transmit`，因为调试信息可以复用标准库接口，后续迁移日志模块成本低。  
- 主循环按固定 500ms 节拍发送，目的是先验证“稳定周期 + 稳定内容”，排除接收端偶发因素。  
- 保留发送计数变量，是为了快速判断“代码确实在跑”还是“只发送过一次后卡住”。  
- 发送采用轮询阻塞，是因为初级阶段先把链路打通，避免一开始就引入中断状态机复杂度。

### 5.2 初始化代码

```c
/* USER CODE BEGIN 2 */
uint32_t tx_count = 0;                                                  // 发送计数器用于观察主循环是否持续运行
printf("USART1 init done, baud=115200\r\n");                           // 启动后先打一行，确认串口链路已建立
HAL_Delay(50);                                                          // 稍作等待，避免上电瞬间上位机尚未打开导致首包丢失
/* USER CODE END 2 */
```

> 💡 `HAL_Delay(50)` 不是必须，但在实际联调里能减少“第一行日志看不到”带来的误判。

### 5.3 核心功能代码

**代码块1：核心处理函数**

```c
/**
  * @brief  周期发送调试文本并附带计数
  * @param  p_cnt: 发送计数器指针
  * @retval None
  * @note   采用阻塞发送路径，优先保证初学阶段现象稳定可复现
  */
static void Usart_SendHello(uint32_t *p_cnt)
{
    if (p_cnt == NULL)                                                   // 条件1：参数异常，避免空指针解引用
    {
        return;                                                          // 参数不合法直接返回，防止系统异常
    }

    (*p_cnt)++;                                                          // 条件2：参数正常时，先累加发送计数
    printf("Hello STM32, cnt=%lu\r\n", *p_cnt);                         // 输出固定文本和计数，便于观察周期与丢包
}
```

**代码块2：主循环 `while(1)` 部分**

```c
/* USER CODE BEGIN 3 */
while (1)
{
    Usart_SendHello(&tx_count);                                          // 每轮调用一次发送函数，保持职责清晰
    HAL_Delay(500);                                                      // 500ms发送周期，便于串口助手肉眼确认频率
}
/* USER CODE END 3 */
```

### 5.4 串口重定向（如本实验用到 printf 则必须包含，否则删除此节）

```c
#include "stdio.h"                                                       // 提供FILE与fputc声明

int fputc(int ch, FILE *f)                                               // 将printf的单字符输出重定向到USART1
{
    HAL_UART_Transmit(&huart1, (uint8_t *)&ch, 1, 0xFFFF);              // 阻塞发送1字节，保证日志完整性优先
    return ch;                                                           // 返回已发送字符，满足标准库接口约定
}
```

Keil 需勾选 MicroLIB、CubeIDE 需添加 `syscalls.c`。

---

## 六、实验现象与验证

### 6.1 预期效果

- ✅ 串口助手参数设置为 `115200, 8N1, 无流控` 后，每 `500ms` 接收一行 `"Hello STM32"`。  
- ✅ 连续运行 `10s` 约收到 `20` 行数据，计数 `cnt` 单调递增且无乱码字符。  

### 6.2 快速验证方法

方法1：串口助手定时观测（操作步骤）  
1. 打开串口助手，选择正确 COM 口，设置 `115200/8N1`。  
2. 观察 5 秒，预期看到约 10 行 `"Hello STM32, cnt=..."`。  
3. 若出现乱码，先核对工程时钟和助手波特率是否一致。

方法2：板内回环自检（可直接运行代码片段）

```c
uint8_t tx = 'A';                                                        // 准备发送测试字节
uint8_t rx = 0;                                                          // 接收缓存初值清零

HAL_UART_Transmit(&huart1, &tx, 1, 100);                                // 发送1字节，验证发送通路
HAL_UART_Receive(&huart1, &rx, 1, 100);                                 // 接收1字节，需PA9与PA10短接做回环
printf("loopback rx=%c (expect A)\r\n", rx);                            // 期望输出A，用于确认收发链路一致
```

---

## 七、常见问题排查

### ❓ 现象：串口助手显示乱码或全是异常符号

**可能原因**：
1. 系统时钟或 APB2 时钟配置错误，导致 BRR 对应的实际波特率偏离 115200。  
2. 串口助手参数与工程不一致（例如工程 8N1，但上位机设成了奇偶校验或 2 停止位）。

**排查步骤**：

先打印 `HAL_RCC_GetPCLK2Freq()`，确认 USART1 时钟确实是 72MHz；再核对上位机参数是否严格一致。

```c
/* 核对USART1时钟与串口参数，期望PCLK2=72000000 */
uint32_t pclk2 = HAL_RCC_GetPCLK2Freq();                                // 读取APB2时钟用于校验BRR计算前提
printf("PCLK2=%lu\r\n", pclk2);                                         // 期望输出72000000
printf("UART:115200,8N1,NoFlow\r\n");                                   // 明确当前工程串口配置给联调人员对照
```

### ❓ 现象：`printf` 完全没有任何输出

**可能原因**：
1. 工程未完成 `fputc` 重定向，`printf` 仍指向默认输出通道。  
2. Keil 未勾选 MicroLIB 或 CubeIDE 缺少 `syscalls.c`，导致标准输出底层未打通。

**排查步骤**：

先绕过 `printf`，直接调用 `HAL_UART_Transmit` 发固定字符串；若能发出，问题就集中在重定向链路。

```c
/* 绕过printf直接发字符串，期望串口助手看到RAW_UART_OK */
uint8_t msg[] = "RAW_UART_OK\r\n";                                      // 构造裸发送测试字符串
HAL_UART_Transmit(&huart1, msg, sizeof(msg) - 1, 1000);                 // 直接调用底层发送判断串口硬件是否正常
```

### ❓ 现象：发送第一行正常，后续间歇性卡顿或丢字（USART特有）

**可能原因**：
1. 连续发送大量日志时，阻塞发送占用过长，主循环里其他任务把发送节拍打乱。  
2. 未检查发送完成状态就立即重复写入，导致高频场景下 TXE/TC 节点处理不当。

**排查步骤**：

在发送前后打印系统节拍差值，观察是否明显大于 500ms；若偏差大，后续应切换中断或 DMA 发送。

```c
/* 测量一次发送周期抖动，期望delta接近500ms */
static uint32_t t_prev = 0;                                             // 保存上一次发送时刻用于周期测量
uint32_t t_now = HAL_GetTick();                                         // 读取当前毫秒节拍
printf("delta=%lu ms\r\n", t_now - t_prev);                             // 正常应接近500，明显偏大说明被阻塞
t_prev = t_now;                                                         // 更新基准时刻供下一次比较
printf("Hello STM32\r\n");                                              // 保持原有发送行为便于同时观察功能与时序
HAL_Delay(500);                                                         // 目标周期500ms
```

---

## 八、设计选型参考

| 方案 | 优点 | 缺点 | 适用场景 |
|---|---|---|---|
| 轮询收发（本文） | 实现最直接，调试路径短 | CPU 阻塞明显，吞吐有限 | 初学验证、低频日志输出 |
| 中断收发 | 响应及时，CPU 利用率更好 | 状态管理复杂，易出并发问题 | 中等速率命令交互 |
| DMA收发 | 吞吐高、CPU负担低 | 初始化与缓冲管理复杂 | 高频连续数据流 |
| SWO/半主机调试输出 | 无需占用USART口线（特定环境） | 依赖调试器与工具链支持 | 在线调试阶段临时日志 |

> 💡 **选型原则**：低频少量数据先用轮询，周期任务或并发任务上中断，高吞吐连续流量直接上 DMA。

---

## 九、进阶方向

- **USART 中断接收命令行**：能实现上位机输入指令实时解析，避免轮询接收导致的响应延迟。  
- **DMA + 空闲中断收包**：能实现不定长数据帧高效接收，避免逐字节中断带来的CPU开销。  
- **环形缓冲日志系统**：能实现非阻塞打印，避免关键控制任务被串口发送拖慢。  
- **多串口网关转发**：能实现 USART1/USART2 数据桥接，避免上位机只能单口调试的限制。  

---

## 十、总结

**本文完成了**：用 USART1（PA9/PA10）实现了 115200bps 串口发送与 `printf` 重定向，并按 500ms 周期稳定输出 `Hello STM32`。  

**核心知识点回顾**：  
1. USART 实际通信质量不仅取决于名义波特率，还取决于时钟配置是否正确从而保证 BRR 计算结果有效。  
2. `printf` 能否输出的关键在于 `fputc` 重定向链路和工程库配置是否完整匹配。  
3. 轮询方式适合快速打通链路，但在高频或多任务场景下应尽早切换到中断或 DMA 方案。  

---

### 参考资料

- STM32F103 参考手册链接（固定）：https://www.st.com/resource/en/reference_manual/cd00171190.pdf  
- HAL 库用户手册链接（固定）：https://www.st.com/resource/en/user_manual/dm00154093.pdf  
- CubeMX 用户手册链接（固定）：https://www.st.com/resource/en/user_manual/dm00104712.pdf  
- 补充资料1（主题相关）：https://www.st.com/resource/en/application_note/cd00220364.pdf  
- 补充资料2（主题相关）：https://www.st.com/en/embedded-software/stm32cubef1.html  

```
*如有错误或建议，欢迎在评论区留言。转载请注明原文出处。*
```

### 芯片差异说明（如有差异则必须包含，否则删除）

| 对比项 | STM32F103 (F1) | STM32F4 | STM32H7 |
|---|---|---|---|
| 波特率寄存器细节 | 经典 BRR 结构，16倍过采样常用 | BRR 机制类似，但时钟树与分频来源更灵活 | 时钟域更复杂，串口内核时钟来源可配置项更多 |
| FIFO 支持 | 无硬件 FIFO（依赖 DR 读写时机） | 多数型号仍以基础缓冲机制为主 | 多型号支持更深缓冲/FIFO特性，适合高吞吐 |
| 高速稳定性 | 中低速场景足够 | 高频场景更从容 | 高频和大带宽场景优势明显，但配置约束更多 |
| DMA 联动 | 支持基础 DMA 通道 | DMA 控制器能力更强 | GPDMA/BDMA 体系更丰富，适合复杂数据流 |
