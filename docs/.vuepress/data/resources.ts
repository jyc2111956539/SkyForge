export type ResourceFormat = 'PDF' | 'DOCX' | 'ZIP'

export type ResourceModule =
  | '单片机与嵌入式'
  | '网络通信'
  | 'USB开发'
  | '模拟电子'
  | '电源设计'
  | '工具链与工程化'

export type ResourceTag =
  | '单片机'
  | 'STM32'
  | 'ARM'
  | '网络通信'
  | 'MQTT'
  | 'USB开发'
  | '模拟电子'
  | '电源设计'
  | '滤波器'
  | '开关电源'
  | '放大电路'
  | '数据手册'
  | '应用笔记'
  | '原理图'
  | 'PCB'
  | '源码'
  | '工具链'
  | '入门'
  | '进阶'
  | '工程化'

export type ResourceItem = {
  id: string
  title: string
  desc: string
  format: ResourceFormat
  module: ResourceModule
  tags: ResourceTag[]
  version: string
  size: string
  updatedAt: string
  url: string
}

export const resourceItems: ResourceItem[] = [
  {
    id: 'stm32-mqtt-starter',
    title: 'STM32 MQTT 通信入门资料包（示例）',
    desc: '包含最小连接流程、客户端配置说明与调试抓包示例，适合作为联网项目起步模板。',
    format: 'ZIP',
    module: '网络通信',
    tags: ['STM32', '单片机', '网络通信', 'MQTT', '源码', '入门'],
    version: 'v1.0',
    size: '4.2 MB',
    updatedAt: '2026-05-12',
    url: '/downloads/toolchain-template.zip',
  },
  {
    id: 'arm-startup-notes',
    title: 'ARM 启动流程速查（示例）',
    desc: '覆盖向量表、启动文件和异常入口的核心路径，便于快速定位启动阶段问题。',
    format: 'PDF',
    module: '单片机与嵌入式',
    tags: ['ARM', '单片机', '数据手册', '应用笔记', '入门'],
    version: 'v1.1',
    size: '1.1 MB',
    updatedAt: '2026-05-12',
    url: '/downloads/arm-startup-notes.pdf',
  },
  {
    id: 'usb-debug-sheet',
    title: 'USB 转串口调试清单（示例）',
    desc: '整理 USB 设备识别、串口参数匹配和常见掉线问题排查步骤。',
    format: 'DOCX',
    module: 'USB开发',
    tags: ['USB开发', '单片机', '应用笔记', '进阶'],
    version: 'v1.0',
    size: '420 KB',
    updatedAt: '2026-05-12',
    url: '/downloads/filter-checklist-v1.docx',
  },
  {
    id: 'filter-checklist-v1',
    title: '滤波器选型与验算表（示例）',
    desc: '提供目标频段、纹波指标与相位裕量的记录与验算模板。',
    format: 'DOCX',
    module: '模拟电子',
    tags: ['模拟电子', '滤波器', '应用笔记', '工程化'],
    version: 'v1.0',
    size: '340 KB',
    updatedAt: '2026-05-12',
    url: '/downloads/filter-checklist-v1.docx',
  },
  {
    id: 'amplifier-design-pack',
    title: '放大电路设计资料包（示例）',
    desc: '整合原理图、仿真工程和常见失真问题说明，便于迭代放大级参数。',
    format: 'ZIP',
    module: '模拟电子',
    tags: ['模拟电子', '放大电路', '原理图', 'PCB', '源码', '进阶'],
    version: 'v0.9',
    size: '8.1 MB',
    updatedAt: '2026-05-12',
    url: '/downloads/amplifier-design-pack.zip',
  },
  {
    id: 'smps-guide-v1',
    title: '开关电源设计指南（示例）',
    desc: '包含 Buck/Boost 设计流程、补偿网络检查项和测试记录模板。',
    format: 'PDF',
    module: '电源设计',
    tags: ['电源设计', '开关电源', '应用笔记', '工程化'],
    version: 'v1.0',
    size: '2.4 MB',
    updatedAt: '2026-05-12',
    url: '/downloads/smps-guide-v1.pdf',
  },
  {
    id: 'toolchain-template',
    title: '嵌入式工具链模板工程（示例）',
    desc: '包含目录结构、编译脚本和调试配置，适合作为团队统一工程基线。',
    format: 'ZIP',
    module: '工具链与工程化',
    tags: ['工具链', '单片机', '源码', '工程化'],
    version: 'v1.0',
    size: '5.6 MB',
    updatedAt: '2026-05-12',
    url: '/downloads/toolchain-template.zip',
  },
]
