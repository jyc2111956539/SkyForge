---
title: STM32 I2C 驱动 OLED：字符显示入门
createTime: 2026/05/14 11:34:38
permalink: /tutorials/stm32/08-i2c-oled/
---
【文章头部】
# STM32 I2C 驱动 OLED：字符显示入门
> **系列**：通信协议系列（一）  
> **难度等级**：⭐⭐⭐☆☆  
> **适用芯片**：STM32F103xx  
> **开发环境**：STM32CubeIDE 1.x + HAL 库  
> **前置知识**：GPIO 开漏输出模式、位操作与延时函数基础、C 语言数组与字符串基础

【一、前言】

I2C 可以类比成“一条双线合用的楼道对讲总线”。楼里很多住户（外设）共用一条通道，主机先喊门牌号（地址），只有对应住户应答，然后再收发内容。你这次驱动 OLED，本质就是 STM32 通过 I2C 把显示命令和字符数据一包包发过去。

如果不用 I2C，而是并口或大量 GPIO 直连，开发板引脚会被占得很快。实际项目里会遇到两个明显问题：第一，布线复杂度高、抗干扰变差；第二，后期维护时改模块很痛苦，软件和硬件耦合太紧。I2C 的价值就是用更少引脚完成可扩展通信。

本文会带你用 **软件 I2C（PB6/PB7）** 驱动 **SSD1306 128x64 OLED**，稳定显示两行内容。第一行固定显示 `"Hello STM32"`，第二行显示从 0 开始每秒递增的计数器。你可以通过目视显示和地址扫描两种方式验证通信链路是否真正打通。

【二、原理讲解】

### 2.1 工作原理

- **一句话核心**：主机通过 SCL 提供时钟、SDA 发送数据，按“起始→地址→应答→数据→应答→停止”时序完成一次 I2C 事务。

```text
START
  │
  ▼
[地址帧]            ← 发送7位设备地址+R/W位
  │
  ▼
[ACK应答]           ← 从机在第9个时钟拉低SDA表示收到
  │
  ▼
[数据帧]            ← 发送命令或显示数据
  │
  ▼
[ACK应答]           ← 每字节后都要应答确认
  │
  ▼
STOP
```

起始信号定义：**SCL 为高电平期间，SDA 从高跳变到低**。  
停止信号定义：**SCL 为高电平期间，SDA 从低跳变到高**。  
应答信号定义：**第 9 个时钟周期，发送方释放 SDA，由接收方拉低 SDA 表示 ACK；若保持高则是 NACK**。

> 💡 **关键理解**：I2C 必须用开漏输出+上拉电阻，因为总线是“多设备共线”，开漏只负责拉低，避免设备之间互相硬顶高低电平导致总线冲突。

### 2.2 I2C 地址说明

7 位地址是设备“门牌号”，8 位地址是在 7 位地址后再拼接 1 位读写位（R/W）。  
关系是：`8位写地址 = (7位地址 << 1) | 0`，`8位读地址 = (7位地址 << 1) | 1`。

SSD1306 常见 7 位地址有两种：`0x3C` 和 `0x3D`。  
对应 8 位写地址分别是：`0x78` 和 `0x7A`。

下面给一个可运行的软件 I2C 地址扫描代码，用来确认你模块真实地址：

```c
/* 扫描0x08~0x77的7位地址，找到有ACK响应的设备 */
void I2C_Scan(void)
{
    uint8_t addr = 0U;                                                   // 保存当前扫描地址，逐个尝试探测设备应答
    printf("I2C scan start...\r\n");                                     // 打印扫描开始标记，便于串口日志定位本次结果

    for (addr = 0x08U; addr <= 0x77U; addr++)                            // 跳过保留地址段，只扫描常用外设地址范围
    {
        i2c_start();                                                      // 发送起始信号，准备开始一次地址探测事务
        if (i2c_write_byte((uint8_t)(addr << 1)) == 0U)                  // 发送8位写地址并检查ACK，ACK=0表示设备存在
        {
            printf("Found device: 7bit=0x%02X, 8bitW=0x%02X\r\n",        // 输出探测到的地址，直接给出7位和8位写地址
                   addr, (uint8_t)(addr << 1));                          // 方便与OLED文档地址表示法对应确认
        }
        i2c_stop();                                                       // 无论是否应答都发停止信号，结束本次探测事务
        HAL_Delay(1);                                                     // 地址之间留短延时，给慢速设备恢复总线状态
    }

    printf("I2C scan done.\r\n");                                        // 打印扫描结束标记，便于确认扫描过程完整结束
}
```

### 2.3 关键函数说明（软件 I2C）

| 函数名 | 作用 | 说明 |
|---|---|---|
| `i2c_start()` | 发送起始信号 | 构造 SCL 高期间 SDA 高→低 |
| `i2c_stop()` | 发送停止信号 | 构造 SCL 高期间 SDA 低→高 |
| `i2c_write_byte()` | 发送 1 字节并读取 ACK | 返回 `0` 表示收到 ACK，`1` 表示 NACK |
| `oled_write_cmd()` | 发送 OLED 命令字节 | 控制字节通常为 `0x00` |
| `oled_write_data()` | 发送 OLED 数据字节 | 控制字节通常为 `0x40` |
| `oled_set_pos()` | 设置页地址与列地址 | 让后续字符写入到指定显示位置 |

【三、硬件说明】

| STM32引脚 | 复用功能 | 连接至 | 注意事项 |
|---|---|---|---|
| PB6 | 软件 I2C SCL | OLED SCL | 配置为开漏输出，需上拉电阻 |
| PB7 | 软件 I2C SDA | OLED SDA | 配置为开漏输出，需上拉电阻 |
| 3.3V | 电源 | OLED VCC | 建议使用 3.3V，避免电平不兼容风险 |
| GND | 地 | OLED GND | 必须共地，否则总线电平参考失效 |

> 上拉说明：多数 0.96 寸 OLED 模块板上已带 4.7k~10k 上拉；若你的模块没有上拉，需外接上拉到 3.3V。

【四、CubeMX 配置步骤】

### 4.1 时钟配置

1. 第一步：RCC 配置（选外部晶振）  
2. 第二步：Clock Configuration 页面的具体设置（写明目标频率数值）  
   设定 `SYSCLK=72MHz`，`AHB=72MHz`，`APB1=36MHz`，`APB2=72MHz`。  
3. 第三步：确认该外设所在总线的时钟频率（写明总线名称和数值）  
   PB6/PB7 属于 GPIOB，挂在 `APB2`，确认 `PCLK2=72MHz` 以保证 GPIO 翻转时序稳定。

### 4.2 GPIO 配置

**步骤一**：进入 `Pinout & Configuration -> System Core -> GPIO`，将 `PB6` 与 `PB7` 配置为 `GPIO_Output`。  
**步骤二**：在 `GPIO` 参数页面把 `PB6/PB7` 都设置为 `Output Open Drain`，速度选 `Low` 或 `Medium`。  
**步骤三**：确认 `Pull-up/Pull-down` 设为 `No pull`（外部上拉主导总线电平，避免内部配置干扰）。  
**步骤四**：说明：本教程使用软件 I2C，**不需要启用 I2C1 外设**，只需 GPIO 即可。  

【五、代码实现】

### 5.1 设计思路

- 选软件 I2C 而不是硬件 I2C，是为了移植简单，换任意 GPIO 都能跑，遇到总线兼容问题也更好调时序。  
- 把驱动分成 `soft_i2c.c/.h` 和 `oled_ssd1306.c/.h` 两层，因为底层时序和上层显示逻辑职责不同，后续维护不容易互相污染。  
- OLED 刷新采用“局部写字符串”而不是整屏刷新，因为本例只改第二行计数，带宽占用更低、效果更稳。  
- 先做地址扫描再初始化 OLED，因为地址错了你后面所有显示逻辑都会看起来“像代码错”，实际是总线没通。

### 5.2 软件 I2C 底层实现

```c
static void i2c_delay(void)                                              // 提供短延时，控制SCL节拍并满足从机时序要求
{
    for (volatile uint8_t i = 0; i < 20; i++) { ; }                     // 空循环延时，简单可控，便于不同主频下微调速度
}

void i2c_start(void)                                                     // 发送I2C起始信号：SCL高期间SDA高到低
{
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_7, GPIO_PIN_SET);                 // 先释放SDA为高，确保起始前总线空闲状态正确
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_SET);                 // 拉高SCL，准备在时钟高电平期间制造SDA跳变
    i2c_delay();                                                         // 留出建立时间，避免边沿过快导致从机误判
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_7, GPIO_PIN_RESET);               // SCL高时SDA拉低，这一刻定义为START条件
    i2c_delay();                                                         // 保持起始条件稳定一小段时间，提高兼容性
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_RESET);               // 拉低SCL，进入后续按位发送阶段
}

void i2c_stop(void)                                                      // 发送I2C停止信号：SCL高期间SDA低到高
{
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_7, GPIO_PIN_RESET);               // 先确保SDA为低，为STOP的上升沿做准备
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_SET);                 // 拉高SCL，满足停止条件发生在时钟高电平期间
    i2c_delay();                                                         // 给从机留出采样窗口，避免把STOP看成普通数据跳变
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_7, GPIO_PIN_SET);                 // SCL高时SDA拉高，这一刻定义为STOP条件
    i2c_delay();                                                         // 保持总线空闲时间，便于下一次事务稳定开始
}

uint8_t i2c_write_byte(uint8_t byte)                                     // 发送1字节并读取ACK，返回0=ACK，1=NACK
{
    uint8_t i = 0U;                                                      // 位计数器，从高位到低位依次发送8个bit

    for (i = 0U; i < 8U; i++)                                            // 每轮发送1bit，严格按I2C时钟边沿推进
    {
        if (byte & 0x80U)                                                // 判断当前最高位是1还是0，决定SDA拉高或拉低
        {
            HAL_GPIO_WritePin(GPIOB, GPIO_PIN_7, GPIO_PIN_SET);         // 发送bit=1时释放SDA为高电平
        }
        else                                                             // 当前位为0时进入此分支
        {
            HAL_GPIO_WritePin(GPIOB, GPIO_PIN_7, GPIO_PIN_RESET);       // 发送bit=0时主动把SDA拉低
        }

        byte <<= 1;                                                      // 左移准备下一位，保持MSB first传输顺序
        i2c_delay();                                                     // 数据建立时间，确保SCL上升沿前SDA已稳定
        HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_SET);             // 拉高SCL，让从机在高电平期间采样该bit
        i2c_delay();                                                     // 保持时钟高电平宽度，满足从机最小时序要求
        HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_RESET);           // 拉低SCL，结束当前bit时钟周期
    }

    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_7, GPIO_PIN_SET);                 // 发送完8位后释放SDA，让从机驱动ACK位
    i2c_delay();                                                         // 给从机切换驱动方向留时间，避免读到错误电平
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_SET);                 // 第9个时钟拉高，读取从机ACK/NACK电平
    i2c_delay();                                                         // 在时钟高电平期间等待ACK稳定
    uint8_t ack = (HAL_GPIO_ReadPin(GPIOB, GPIO_PIN_7) == GPIO_PIN_SET) ? 1U : 0U; // SDA高=NACK，低=ACK
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_RESET);               // 拉低SCL，结束ACK时钟周期

    return ack;                                                          // 返回应答结果，供上层判断是否重试或报错
}
```

### 5.3 核心功能代码

```c
/**
  * @brief  初始化SSD1306 OLED并清屏
  * @param  None
  * @retval None
  * @note   初始化序列不完整会导致花屏或无显示，命令顺序要保持稳定
  */
void oled_init(void)
{
    oled_write_cmd(0xAE);                                                // 关闭显示，先进入配置阶段避免上电噪点干扰
    oled_write_cmd(0x20);                                                // 设置内存寻址模式命令，后续选择页寻址更易写字
    oled_write_cmd(0x02);                                                // 选择页寻址模式，配合8x16字库定位更直观
    oled_write_cmd(0xB0);                                                // 设置页起始地址到0页，确保清屏从顶部开始
    oled_write_cmd(0xC8);                                                // COM扫描方向设置，匹配常见模块安装方向
    oled_write_cmd(0x00);                                                // 列地址低4位清零，初始化列起点
    oled_write_cmd(0x10);                                                // 列地址高4位清零，完整重置列地址指针
    oled_write_cmd(0x40);                                                // 设置显示起始行，避免画面整体偏移
    oled_write_cmd(0x81);                                                // 对比度设置命令，下一字节给出亮度强度
    oled_write_cmd(0x7F);                                                // 对比度中间值，保证显示清晰且不过亮
    oled_write_cmd(0xA1);                                                // 段重映射，修正左右方向避免镜像
    oled_write_cmd(0xA6);                                                // 正常显示模式，防止黑白反相导致误判
    oled_write_cmd(0xA8);                                                // 多路复用率设置命令，匹配128x64面板
    oled_write_cmd(0x3F);                                                // 64MUX配置，保证整屏行数正确
    oled_write_cmd(0xD3);                                                // 显示偏移量设置命令
    oled_write_cmd(0x00);                                                // 偏移量设为0，防止画面上下错位
    oled_write_cmd(0xD5);                                                // 时钟分频/振荡频率设置命令
    oled_write_cmd(0x80);                                                // 采用推荐值，兼顾稳定性与功耗
    oled_write_cmd(0xD9);                                                // 预充电周期设置命令
    oled_write_cmd(0xF1);                                                // 常见推荐参数，提升亮屏稳定性
    oled_write_cmd(0xDA);                                                // COM硬件引脚配置命令
    oled_write_cmd(0x12);                                                // 128x64常用配置，保证行驱动映射正确
    oled_write_cmd(0xDB);                                                // VCOMH电平设置命令
    oled_write_cmd(0x40);                                                // VCOMH推荐值，减小闪烁和鬼影概率
    oled_write_cmd(0x8D);                                                // 电荷泵配置命令，内部升压相关
    oled_write_cmd(0x14);                                                // 使能电荷泵，很多模块缺这步会黑屏
    oled_write_cmd(0xAF);                                                // 打开显示，配置完成后开始正常点亮
    oled_clear();                                                        // 清空GRAM显示内容，避免残留脏数据影响观察
}

/**
  * @brief  在指定行列显示字符串（6x8字体）
  * @param  row: 行号（0~7，按页）
  * @param  col: 列号（0~127）
  * @param  str: 待显示字符串指针
  * @retval None
  * @note   超出边界会导致显示错位，调用前应保证row/col范围合法
  */
void oled_show_string(uint8_t row, uint8_t col, const char *str)
{
    oled_set_pos(row, col);                                              // 先设置写入起始坐标，确保字符串从目标位置开始显示
    while (*str != '\0')                                                 // 逐字符输出直到字符串结束符，完成整串显示
    {
        oled_show_char(*str);                                            // 发送单字符点阵数据，交给底层写GRAM
        str++;                                                           // 指针后移，准备显示下一个字符
    }
}
```

```c
/* USER CODE BEGIN 3 */
while (1)
{
    static uint32_t counter = 0U;                                        // 定义递增计数器并静态保存，掉出循环后值不丢失
    char line2[20] = {0};                                                // 第二行显示缓冲区，长度够放“Count:xxxxxx”字符串

    oled_show_string(0, 0, "Hello STM32");                               // 第一行固定显示欢迎文本，用于验证字符显示基础功能
    snprintf(line2, sizeof(line2), "Count:%lu", counter);                // 把当前计数转成字符串，便于OLED按字符显示
    oled_show_string(2, 0, "                ");                          // 先清空第二行旧内容，避免位数变短时残留旧字符
    oled_show_string(2, 0, line2);                                       // 第二行显示递增计数值，验证动态刷新是否正常

    counter++;                                                           // 每轮循环计数加1，形成可观察的递增效果
    HAL_Delay(1000);                                                     // 每秒更新一次，刷新节奏清晰且肉眼易确认
}
/* USER CODE END 3 */
```

【六、实验现象与验证】

### 6.1 预期效果

- ✅ OLED 第一行稳定显示 `Hello STM32`，上电后不闪烁不漂移。  
- ✅ 第二行计数器每 `1s` 增加 `1`，从 `0` 开始连续递增。  

### 6.2 快速验证方法

方法1：显示行为验证  
1. 上电后 2 秒内应看到第一行固定文本。  
2. 观察第二行每秒变化一次，长时间运行不应出现倒退或跳变异常。  

方法2：地址扫描验证  
1. 先运行 `I2C_Scan()`。  
2. 串口应出现 `0x3C` 或 `0x3D`（7位），对应 `0x78` 或 `0x7A`（8位写地址）。  
3. 若扫描不到地址，先查接线和上拉，再查 SDA/SCL 是否接反。  

【七、常见问题排查】

### ❓ 现象：OLED 上电后无任何显示

**可能原因**：
1. I2C 地址写错，把 7 位地址和 8 位地址混用了。  
2. 初始化命令没发完整，或者 `0x8D/0x14/0xAF` 关键命令缺失导致面板不点亮。

**排查步骤**：

先扫地址确认从机存在，再最小化发送一组关键初始化命令检查是否能亮屏。

```c
/* 最小化亮屏排查流程：先扫地址，再发关键开屏命令 */
I2C_Scan();                                                              // 扫描总线确认OLED设备地址是否存在
oled_write_cmd(0xAE);                                                    // 先关屏进入配置状态，避免配置时显示异常
oled_write_cmd(0x8D);                                                    // 电荷泵配置命令，许多模块必须配置
oled_write_cmd(0x14);                                                    // 使能电荷泵，不使能常见表现是全黑屏
oled_write_cmd(0xAF);                                                    // 开屏命令，若此后仍无显示优先怀疑接线或供电
```

### ❓ 现象：显示乱码或部分区域花屏

**可能原因**：
1. SDA/SCL 接反，导致字节时序被错误解释。  
2. 初始化序列不完整或页/列地址设置错误，数据写入到了错误区域。

**排查步骤**：

先固定显示一个短字符串并重复写同一位置，确认是时序问题还是地址定位问题。

```c
/* 固定坐标重复写同一字符串，观察是否稳定可复现 */
for (uint8_t i = 0; i < 10; i++)                                         // 连续写10次用于观察内容是否稳定一致
{
    oled_set_pos(0, 0);                                                  // 固定到第一页第0列，排除坐标漂移因素
    oled_show_string(0, 0, "TEST123");                                   // 重复写固定文本，理想情况下每次显示应一致
    HAL_Delay(200);                                                      // 留观察时间，便于判断是否出现随机花屏
}
```

### ❓ 现象：程序能跑，但 OLED 一直不应答（地址错误排查）

**可能原因**：
1. 模块实际地址是 `0x3D`，代码却写成 `0x3C`（或反过来）。  
2. 代码用的是 8 位地址接口，却传入了 7 位地址（少左移一位）。

**排查步骤**：

运行完整扫描代码，记录发现地址，再统一按你驱动函数要求使用 7 位或 8 位格式。

```c
/* 地址排查：扫描并打印7位/8位地址，避免格式混淆 */
void OLED_Address_Check(void)
{
    uint8_t addr = 0U;                                                   // 扫描游标，逐个尝试标准7位地址
    printf("Check OLED address...\r\n");                                 // 输出提示，便于串口日志分段阅读

    for (addr = 0x08U; addr <= 0x77U; addr++)                            // 扫描常用从机地址范围，覆盖SSD1306常见地址
    {
        i2c_start();                                                      // 发起一次地址探测事务，准备发送写地址
        if (i2c_write_byte((uint8_t)(addr << 1)) == 0U)                  // 发送8位写地址并检测ACK
        {
            printf("ACK at 7bit=0x%02X, 8bitW=0x%02X\r\n",               // 同时打印两种表示法，防止后续再混淆
                   addr, (uint8_t)(addr << 1));                          // 便于直接对照0x3C/0x3D和0x78/0x7A
        }
        i2c_stop();                                                       // 本次探测结束释放总线，避免影响下一地址
        HAL_Delay(1);                                                     // 短延时降低连续探测对慢设备的压力
    }

    printf("Address check done.\r\n");                                   // 扫描结束提示，确认流程完整执行
}
```

【八、设计选型参考】

| 方案 | 优点 | 缺点 | 适用场景 |
|---|---|---|---|
| 软件 I2C（本文） | 引脚灵活、移植快、时序可手调 | 占用CPU、速率较低 | 教学实验、兼容性调试、资源受限重映射 |
| 硬件 I2C | 外设托管时序、CPU负担低、速率高 | 外设配置复杂，个别模块兼容性需调参 | 量产项目、稳定高速通信 |
| SPI 驱动 OLED | 速率高、刷新快、抗干扰好 | 占用引脚更多（SCK/MOSI/CS/DC/RES） | 高频刷新UI、图形动画显示 |

> 💡 **选型原则**：先求“能快速打通并好调试”选软件 I2C；量产或高刷新需求明确时优先硬件 I2C 或 SPI。

【九、进阶方向】

- **全屏缓存+局部刷新策略**：实现高效文本和图标混合显示，避免全屏重绘导致闪烁。  
- **多字号字库与中文点阵**：实现更完整的人机界面，避免只支持英文数字的显示局限。  
- **硬件 I2C 迁移与速率优化**：在保持接口不变的前提下提升刷新速度，减少 CPU 占用。  
- **I2C 总线挂多设备**：同总线同时接 OLED、EEPROM、传感器，验证地址管理和仲裁稳定性。  

【十、总结】

**本文完成了**：用软件 I2C（PB6/PB7）驱动 SSD1306 OLED，实现了第一行显示 `Hello STM32`、第二行每秒递增计数器。  

**核心知识点回顾**：  
1. I2C 的关键时序是 START/STOP/ACK，电平定义要严格满足“时钟高电平期间的数据跳变规则”。  
2. SSD1306 地址要分清 7 位和 8 位写地址，`0x3C/0x3D` 对应 `0x78/0x7A`。  
3. 软件 I2C 的本质是 GPIO 开漏按时序“模拟总线”，稳定性取决于上拉、电平和延时细节。  

【参考资料】

1. STM32F103 参考手册（RM0008）：https://www.st.com/resource/en/reference_manual/cd00171190.pdf  
2. STM32F1 HAL 库用户手册（UM1850）：https://www.st.com/resource/en/user_manual/dm00154093.pdf  
3. SSD1306 Datasheet：https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf  
4. UM10204 I2C-bus specification：https://www.nxp.com/docs/en/user-guide/UM10204.pdf  

【文末】*如有错误或建议，欢迎在评论区留言。转载请注明原文出处。*
