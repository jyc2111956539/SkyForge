---
title: STM32 SPI 通信基础：读写 Flash 与驱动显示设备
createTime: 2026/05/14 11:34:38
permalink: /tutorials/stm32/09-spi-basic/
---
【文章头部】
# STM32 SPI 通信基础：读写 Flash 与驱动显示设备
> **系列**：通信协议系列（二）  
> **难度等级**：⭐⭐⭐☆☆  
> **适用芯片**：STM32F103xx  
> **开发环境**：STM32CubeIDE 1.x + HAL 库  
> **前置知识**：GPIO 推挽输出模式、SPI 基础时序概念、串口 `printf` 调试输出

【一、前言】

SPI 可以理解成“仓库传送带+对讲机”的组合。SCK 是传送带节拍，MOSI 是主机发货通道，MISO 是从机回传通道，CS 是仓库门禁卡，拉低才允许当前器件参与通信。你给 W25Q64 发命令、地址、数据，本质就是按节拍把字节一位位同步推过去。

如果不用外部 Flash，而只靠 MCU 内部小容量存储，项目一上功能就会很快不够用。第一，日志、参数、字体等数据放不下；第二，掉电后数据持久化策略会很受限；第三，后期扩展时改动成本大。W25Q64 这类 SPI Flash 就是为“大容量非易失”场景准备的。

本文目标很明确：配置 **SPI1 主模式（PA4~PA7）**，完成 W25Q64 的 **扇区擦除、页写入、读出校验**。我们会把写入数组读回来逐字节对比，并用串口打印一致性结果。只要比对通过，就说明 SPI 时序、片选时序、忙等待逻辑都走通了。

【二、原理讲解】

### 2.1 工作原理

- **一句话核心**：SPI 是主从同步全双工总线，主机拉低 CS 后，随着 SCK 每跳一拍同时完成 1bit 发送和 1bit 接收。

```text
CS拉低
  │
  ▼
[SCK时钟输出]        ← 主机提供通信节拍，决定双方何时移位/采样
  │
  ├──> [MOSI发送]    ← 主机把命令/地址/数据送到Flash
  │
  └──> [MISO接收]    ← Flash同步回传状态/读出数据给主机
  │
  ▼
CS拉高
```

> 💡 **关键理解**：W25Q64 的 CS 最好由软件精确控制，原因是一次事务里“命令+地址+数据”必须连续且边界清晰，硬件自动 NSS 容易在多次 HAL 调用间抖动，导致指令被器件拆段误解。

### 2.2 SPI 四种模式

| 模式 | CPOL | CPHA | 空闲时钟电平 | 常见采样时机描述 |
|---|---:|---:|---|---|
| Mode0 | 0 | 0 | 低 | 第一个边沿采样（上升沿采样） |
| Mode1 | 0 | 1 | 低 | 第二个边沿采样（下降沿采样） |
| Mode2 | 1 | 0 | 高 | 第一个边沿采样（下降沿采样） |
| Mode3 | 1 | 1 | 高 | 第二个边沿采样（上升沿采样） |

W25Q64 使用 **Mode0（CPOL=0, CPHA=0）**。原因是它的数据手册定义在时钟空闲低电平下工作，且数据在上升沿被采样、下降沿更新，和 STM32 的 Mode0 直接匹配。

### 2.3 W25Q64 操作流程

W25Q64 的基本顺序是：**擦除 → 写入 → 读取**。  
原因是 NOR Flash 单元写入只能把位从 `1` 变 `0`，不能直接从 `0` 变回 `1`，所以写前必须擦除让目标区域恢复为 `0xFF`（全 1）。

本文用到的 3 个核心指令码：

- `0x20`：扇区擦除（4KB Sector Erase）  
- `0x02`：页编程（Page Program，最多 256B）  
- `0x03`：读数据（Read Data）  

### 2.4 关键寄存器 / HAL 结构体

| 寄存器（HAL成员） | 作用 | 典型值/选项 |
|---|---|---|
| `hspi1.Init.Mode` | 主从模式选择 | `SPI_MODE_MASTER` |
| `hspi1.Init.Direction` | 通信方向 | `SPI_DIRECTION_2LINES` |
| `hspi1.Init.CLKPolarity` | CPOL | `SPI_POLARITY_LOW` |
| `hspi1.Init.CLKPhase` | CPHA | `SPI_PHASE_1EDGE` |
| `hspi1.Init.NSS` | 片选管理方式 | `SPI_NSS_SOFT` |
| `SPI1->DR` | 数据寄存器 | 发送/接收数据字节 |

> 💡 开发初期先靠 HAL 结构体把模式配准；出现“读写错位、总线有时通有时不通”时再重点看 CPOL/CPHA、NSS 和片选时序。

【三、硬件说明】

| STM32引脚 | 复用功能 | 连接至 | 说明 |
|---|---|---|---|
| PA4 | GPIO 输出（软件CS） | W25Q64 CS | 片选信号，低有效，建议推挽输出 |
| PA5 | SPI1_SCK | W25Q64 CLK | 时钟线，由主机输出 |
| PA6 | SPI1_MISO | W25Q64 DO | 从机输出到主机输入 |
| PA7 | SPI1_MOSI | W25Q64 DI | 主机输出到从机输入 |
| 3.3V | 电源 | W25Q64 VCC | 供电电压 |
| GND | 地 | W25Q64 GND | 共地基准 |

> 电压提示：W25Q64 常见模块工作在 3.3V 逻辑电平，禁止直接接 5V 逻辑到 SPI 引脚，避免损坏芯片。

【四、CubeMX 配置步骤】

### 4.1 时钟配置

1. 第一步：RCC 配置（选外部晶振）  
2. 第二步：Clock Configuration 页面的具体设置（写明目标频率数值）  
   设置 `SYSCLK=72MHz`，`AHB=72MHz`，`APB1=36MHz`，`APB2=72MHz`。  
3. 第三步：确认该外设所在总线的时钟频率（写明总线名称和数值）  
   SPI1 位于 `APB2`，确认 `PCLK2=72MHz`，再按分频得到 SPI 时钟（建议先低速如 `PCLK2/16` 调通）。

### 4.2 外设配置

**步骤一**：在 `Pinout & Configuration -> Connectivity -> SPI1` 选择 `Full-Duplex Master`。  

**步骤二**：Parameter Settings 参数表格

| 参数项 | 填写值 | 说明 |
|---|---|---|
| Mode | `Master` | STM32 主动发起读写事务 |
| Direction | `2Lines Full-Duplex` | MOSI/MISO 同时支持收发 |
| Data Size | `8 Bits` | W25Q64 命令和数据按字节传输 |
| CPOL | `Low` | 对应 Mode0 空闲低电平 |
| CPHA | `1 Edge` | 对应 Mode0 上升沿采样 |
| NSS | `Software` | CS 由 PA4 手动控制，事务边界更可控 |
| Baud Rate Prescaler | `16`（可先） | 先低速调通，后续再提速 |
| First Bit | `MSB First` | W25Q64 指令按高位先发 |

**步骤三**：GPIO 手动补充配置  
在 `System Core -> GPIO` 将 `PA4` 配为普通推挽输出（软件 CS），并默认输出高电平（未选中器件）。  

**步骤四**：代码生成设置  
在 `Project Manager -> Code Generator` 勾选 `Generate peripheral initialization as a pair of '.c/.h' files per peripheral`，便于 SPI 驱动与应用逻辑分层。

【五、代码实现】

### 5.1 设计思路

- CS 必须软件控制，因为一次完整 Flash 命令序列需要“连续命令帧”，手动控制可确保命令、地址、数据在同一片选窗口内完成。  
- 写前必须擦除，因为 W25Q64 位编程只能 `1→0`，不擦除就可能出现“写成功返回但数据不对”。  
- 每次写/擦后都要等待 Flash 空闲，因为器件内部正在执行编程周期时，立刻下一条命令会被忽略或异常。  
- 驱动层封装 `erase/write/read`，主循环只做“写-读-比对-打印”，这样逻辑清晰且便于移植到其他项目。

### 5.2 初始化代码

```c
/* USER CODE BEGIN 2 */
HAL_GPIO_WritePin(GPIOA, GPIO_PIN_4, GPIO_PIN_SET);                     // 先释放CS为高，避免上电后误触发Flash命令
printf("SPI1 + W25Q64 demo start\r\n");                                 // 启动提示，确认串口链路和程序已跑起来
HAL_Delay(10);                                                          // 给Flash上电稳定留一点时间，减少首包时序风险
/* USER CODE END 2 */
```

> 💡 这里最关键的是 CS 默认拉高。若上电瞬间 CS 低，Flash 可能把噪声当命令吃进去，后续现象会很诡异。

### 5.3 核心功能代码

```c
/**
  * @brief  擦除指定4KB扇区
  * @param  addr: 24位地址，任意落在目标扇区内即可
  * @retval None
  * @note   擦除前自动写使能，擦除后自动等待空闲
  */
void W25Q64_SectorErase(uint32_t addr)
{
    uint8_t cmd[4] = {0};                                                // 组合擦除指令+24位地址，保证一次事务完整发送
    W25Q64_WriteEnable();                                                // 每次擦写前都要写使能，否则芯片会忽略编程指令
    W25Q64_CS_Low();                                                     // 片选拉低，开始一次SPI事务边界
    cmd[0] = 0x20;                                                       // 扇区擦除指令，固定为0x20（4KB）
    cmd[1] = (uint8_t)(addr >> 16);                                      // 地址高字节，指向目标扇区范围
    cmd[2] = (uint8_t)(addr >> 8);                                       // 地址中字节，配合高字节定位
    cmd[3] = (uint8_t)(addr);                                            // 地址低字节，完成24位地址发送
    HAL_SPI_Transmit(&hspi1, cmd, 4, 100);                              // 发送擦除命令帧，芯片收到后进入内部擦除周期
    W25Q64_CS_High();                                                    // 拉高CS，明确命令结束并触发芯片执行
    W25Q64_WaitBusy();                                                   // 轮询BUSY位，确保擦除完全结束再做下一步
}

/**
  * @brief  页写入（最多256字节，且不能跨页）
  * @param  addr: 24位起始地址
  * @param  buf: 待写入数据缓冲区
  * @param  len: 写入长度（1~256）
  * @retval None
  * @note   本函数假设调用者已保证不跨页
  */
void W25Q64_PageWrite(uint32_t addr, const uint8_t *buf, uint16_t len)
{
    uint8_t hdr[4] = {0};                                                // 命令头缓冲：写指令+24位地址，先发头再发数据
    W25Q64_WriteEnable();                                                // 写使能锁存必须先置位，否则页编程无效
    W25Q64_CS_Low();                                                     // 片选拉低，保持整个“头+数据”在同一事务内
    hdr[0] = 0x02;                                                       // 页编程指令0x02，告诉芯片后续是写数据流
    hdr[1] = (uint8_t)(addr >> 16);                                      // 地址高字节，定位目标页区域
    hdr[2] = (uint8_t)(addr >> 8);                                       // 地址中字节，补全定位
    hdr[3] = (uint8_t)(addr);                                            // 地址低字节，完成24位地址
    HAL_SPI_Transmit(&hspi1, hdr, 4, 100);                              // 先发命令和地址，建立芯片内部写指针
    HAL_SPI_Transmit(&hspi1, (uint8_t *)buf, len, 200);                 // 再连续发送待写数据，按页编程写入阵列
    W25Q64_CS_High();                                                    // 拉高CS结束写事务，触发芯片内部编程执行
    W25Q64_WaitBusy();                                                   // 等待BUSY清零，避免下一条命令过早进入
}

/**
  * @brief  读取指定地址连续数据
  * @param  addr: 24位起始地址
  * @param  buf: 读出缓冲区
  * @param  len: 读取长度
  * @retval None
  * @note   读命令0x03支持连续读，len可跨页
  */
void W25Q64_ReadData(uint32_t addr, uint8_t *buf, uint16_t len)
{
    uint8_t hdr[4] = {0};                                                // 命令头缓冲：读指令+24位地址，建立读起点
    W25Q64_WaitBusy();                                                   // 先确认芯片空闲，防止在忙状态下读到旧数据
    W25Q64_CS_Low();                                                     // 片选拉低，开始一次读事务
    hdr[0] = 0x03;                                                       // 普通读指令0x03，后续时钟驱动下从MISO输出数据
    hdr[1] = (uint8_t)(addr >> 16);                                      // 地址高字节，确定读起点
    hdr[2] = (uint8_t)(addr >> 8);                                       // 地址中字节，补全地址
    hdr[3] = (uint8_t)(addr);                                            // 地址低字节，完成24位地址
    HAL_SPI_Transmit(&hspi1, hdr, 4, 100);                              // 发送读命令头，让芯片进入数据输出状态
    HAL_SPI_Receive(&hspi1, buf, len, 200);                             // 主机继续打时钟并从MISO收取len字节数据
    W25Q64_CS_High();                                                    // 拉高CS结束读事务，释放总线
}
```

```c
/* USER CODE BEGIN 3 */
while (1)
{
    uint8_t tx_buf[16] = {0x11,0x22,0x33,0x44,0x55,0x66,0x77,0x88,      // 准备测试写入数据，内容有规律便于比对定位错误
                          0xA1,0xB2,0xC3,0xD4,0xE5,0xF6,0x5A,0xA5};     // 继续填充测试样本，覆盖不同位型组合
    uint8_t rx_buf[16] = {0};                                            // 读回缓冲区先清零，便于观察实际读出内容
    uint8_t mismatch = 0U;                                               // 记录是否出现不一致，避免逐字节打印过多日志
    uint32_t test_addr = 0x000000U;                                      // 选择测试地址，放在首扇区便于重复验证

    W25Q64_SectorErase(test_addr);                                       // 先擦除目标扇区，确保写入前全部位恢复为1
    W25Q64_PageWrite(test_addr, tx_buf, sizeof(tx_buf));                 // 把测试数组写入Flash目标地址
    W25Q64_ReadData(test_addr, rx_buf, sizeof(rx_buf));                  // 从同一地址读回数据用于一致性校验

    for (uint8_t i = 0U; i < sizeof(tx_buf); i++)                        // 逐字节对比写入和读出结果，定位是否有偏移/错位
    {
        if (tx_buf[i] != rx_buf[i])                                      // 只要有一个字节不等就判定本轮通信验证失败
        {
            mismatch = 1U;                                               // 置位失败标志，后续统一打印失败信息
            printf("Mismatch at %u: TX=0x%02X RX=0x%02X\r\n",            // 输出出错位置和值，便于快速判断时序还是地址问题
                   i, tx_buf[i], rx_buf[i]);                             // 打印原值与读值差异，支持现场排查
        }
    }

    if (mismatch == 0U)                                                  // 全部字节一致则进入成功分支
    {
        printf("W25Q64 verify OK, all bytes match.\r\n");                // 打印成功结果，说明擦写读和时序都正常
    }
    else                                                                 // 出现任意不一致则进入失败分支
    {
        printf("W25Q64 verify FAIL.\r\n");                                // 打印失败提示，提醒检查CS时序和忙等待逻辑
    }

    HAL_Delay(1000);                                                     // 每秒做一轮验证，方便持续观察稳定性
}
/* USER CODE END 3 */
```

### 5.4 串口重定向

```c
#include "stdio.h"                                                       // 引入标准IO声明，提供fputc接口原型

int fputc(int ch, FILE *f)                                               // 将printf输出重定向到USART1发送通道
{
    HAL_UART_Transmit(&huart1, (uint8_t *)&ch, 1, 0xFFFF);              // 阻塞发送单字节，保证调试日志完整按序输出
    return ch;                                                           // 返回已发送字符，兼容标准库行为
}
```

Keil 需勾选 MicroLIB，CubeIDE 需添加 `syscalls.c`。

【六、实验现象与验证】

- ✅ 串口周期打印 `W25Q64 verify OK, all bytes match.`，说明擦除-写入-读取链路闭环正确。  
- ✅ 若故意注释掉擦除函数，再写同一地址，常见会出现读值不匹配或保持旧值，验证“写前擦除”必要性。  

快速验证方法：

1. **串口逐字节比对法**：保留 `Mismatch at ...` 打印，观察是否存在固定偏移或随机错误。  
2. **逻辑分析仪抓总线法**：抓 `CS/SCK/MOSI/MISO`，确认每次命令帧边界是“CS低开始、CS高结束”，并检查 Mode0 边沿采样是否一致。  

【七、常见问题排查】

### ❓ 现象：读出数据全为 0xFF

**可能原因**：
1. 写入前没擦除，目标区域仍是旧状态，或者写使能未生效导致实际没写进去。  
2. 读地址错了，读到的是未写区域（默认全 `0xFF`）。

**排查步骤**：

先固定同一地址做“擦-写-读”最小闭环，再打印状态寄存器确认 BUSY/WEL 逻辑。

```c
/* 最小闭环排查：擦除后写一个字节再读回 */
uint8_t tx = 0x5A;                                                       // 选一个非0xFF测试字节，便于判断是否真的写入
uint8_t rx = 0x00;                                                       // 读回缓存先清零，避免残留值干扰判断
uint32_t addr = 0x000000U;                                               // 固定地址，排除地址计算偏差因素
W25Q64_SectorErase(addr);                                                // 先擦除扇区，把目标区域恢复为全1可编程状态
W25Q64_PageWrite(addr, &tx, 1);                                          // 写入1字节，缩小问题范围便于定位
W25Q64_ReadData(addr, &rx, 1);                                           // 从同一地址读回，验证链路最小功能
printf("tx=0x%02X rx=0x%02X\r\n", tx, rx);                               // 期望tx与rx一致，不一致再查时序或写使能
```

### ❓ 现象：写入数据与读出数据不一致

**可能原因**：
1. 页写跨页了（超过 256B 或跨页边界），后半段写入行为不符合预期。  
2. 写完没等待空闲，马上读导致读到编程前旧数据或中间态。

**排查步骤**：

先把单次写入长度限制在单页内，再强制加入忙等待，观察一致性是否恢复。

```c
/* 单页写入排查：限制长度并在读前等待空闲 */
uint8_t buf_tx[8] = {1,2,3,4,5,6,7,8};                                  // 小数据块放在单页内，排除跨页写带来的复杂因素
uint8_t buf_rx[8] = {0};                                                 // 读回缓冲清零，便于直接比较每个字节
uint32_t addr = 0x000100U;                                               // 选择页内地址，避免触发页边界跨越问题
W25Q64_SectorErase(addr);                                                // 先擦除所在扇区，保证写入位可从1变0
W25Q64_PageWrite(addr, buf_tx, sizeof(buf_tx));                          // 写入小块数据，降低变量数量便于定位问题
W25Q64_WaitBusy();                                                       // 强制等待芯片空闲，确保内部编程已完成
W25Q64_ReadData(addr, buf_rx, sizeof(buf_rx));                           // 读回同长度数据，做一一对应比较
for (uint8_t i = 0; i < 8; i++)                                          // 逐项打印便于看出是否是固定偏移或随机错位
{
    printf("[%u] tx=0x%02X rx=0x%02X\r\n", i, buf_tx[i], buf_rx[i]);    // 期望每项完全一致，否则重点查时序和页边界
}
```

### ❓ 现象：偶发整包读写失败，重试又正常（CS 时序特有）

**可能原因**：
1. CS 拉低到首字节发送之间没有建立时间，器件没正确识别事务开始。  
2. 命令没发完就拉高 CS，导致指令被截断，Flash 进入未知状态。

**排查步骤**：

在 CS 拉低/拉高前后加微小延时，并把“命令+地址+数据”放在同一片选窗口内。

```c
/* CS时序排查：人为拉大CS建立/保持时间观察稳定性 */
W25Q64_CS_Low();                                                         // 先拉低CS，明确告诉Flash本次事务开始
for (volatile uint8_t d = 0; d < 20; d++) { ; }                         // 建立时间延时，避免首字节过快导致识别失败
HAL_SPI_Transmit(&hspi1, tx_buf, 4, 100);                               // 在CS保持低电平期间连续发送数据帧
for (volatile uint8_t d = 0; d < 20; d++) { ; }                         // 保持时间延时，防止最后一位还未锁存就结束事务
W25Q64_CS_High();                                                        // 再拉高CS结束事务，确保帧边界完整可识别
```

【八、设计选型参考】

| 协议 | 优点 | 缺点 | 适用场景 |
|---|---|---|---|
| SPI | 高速、全双工、时序直观 | 线多（至少4线），片选管理复杂 | Flash、LCD、高速传感器 |
| I2C | 线少（2线）、多设备挂载方便 | 速率较低、总线电容敏感 | 低速配置类器件、传感器网络 |
| UART | 简单点对点、调试方便 | 非总线型、多设备扩展差 | 日志输出、模块串口通信 |
| SPI+DMA | 吞吐高、CPU占用低 | 驱动复杂度上升 | 大块连续数据搬运 |

> 💡 **选型原则**：需要高吞吐和外部存储优先 SPI；引脚紧张且低速多设备优先 I2C；点对点调试和简单通信优先 UART。

【九、进阶方向】

- **页写跨页自动拆包**：实现任意长度写入自动分页，避免调用层手动处理页边界。  
- **JEDEC ID 与容量自检**：上电自动读芯片 ID，避免模块替换后驱动参数不匹配。  
- **DMA + SPI 批量读写**：提升大数据块吞吐，减少 CPU 在阻塞传输上的等待。  
- **掉电保护与日志环形区**：实现参数存储与故障日志持久化，提升系统可维护性。  

【十、总结】

**本文完成了**：用 SPI1 主模式驱动 W25Q64，完成了扇区擦除、页写入、数据读出和串口一致性校验。  

**核心知识点回顾**：  
1. W25Q64 的基本流程是“擦除→写入→读取”，因为 Flash 位写入只能 `1→0`。  
2. SPI 模式必须匹配器件时序，W25Q64 采用 Mode0（CPOL=0, CPHA=0）。  
3. 片选 CS 边界和忙状态等待是稳定读写的关键，少任何一个都会出现偶发或稳定性错误。  

【参考资料】

1. STM32F103 参考手册（RM0008）：https://www.st.com/resource/en/reference_manual/cd00171190.pdf  
2. STM32F1 HAL 库用户手册（UM1850）：https://www.st.com/resource/en/user_manual/dm00154093.pdf  
3. W25Q64 Datasheet（Winbond）：https://www.winbond.com/resource-files/w25q64jv%20revf%2003272018%20plus.pdf  
4. AN4760 SPI communication with STM32 MCUs：https://www.st.com/resource/en/application_note/an4760-spi-communication-with-stm32-mcus-stmicroelectronics.pdf  

【文末】*如有错误或建议，欢迎在评论区留言。转载请注明原文出处。*
