这是一份为当前项目架构量身定制的 .md 报告。它详细说明了项目的现状、三种模式的共存逻辑以及关键的文件连接关系，旨在让您的 AI 助手（Gemini）和开发环境（Firebase Studio）能够精准理解后续的开发指令。
 项目重塑状态报告：综合围棋平台 (Shadow Go)
1. 项目定位 (Project Orientation)
本项目已从单一的对弈 AI 进化为一个集 镜像关卡 (Mirror)、本地练棋 (Practice) 与 玩家连线 (Online) 为一体的综合性围棋平台。核心规格统一为 19x19 棋盘 (只有本地练棋和玩家连线模式支持 13 × 13 和 9 × 9 棋盘)，支持 AlphaGo 名局复刻与实时竞技。
2. 三大核心模式逻辑 (Core Modes)
| 模式 | 核心逻辑 | 文件依赖 | 关键特征 |
|---|---|---|---|
| 镜像关卡 | 严格同步 SGF 棋谱 | useMirrorGame.ts / sgf-processor.ts | 玩家必须走对每一步；AI 自动跟谱。 |
| 本地练棋 | 自由对弈/自对弈 | usePracticeGame.ts | 支持切换黑白、悔棋、形势分析。 |
| 玩家连线 | 远程实时同步 | useOnlineGame.ts / socket.ts | 跨客户端坐标同步；权限锁定机制。 |
3. 核心架构与文件连接 (Architecture)
3.1 底层规则层 (src/lib/go-logic.ts)
 * 职责：定义围棋的“物理定律”。
 * 功能：处理提子（Capture）、气数计算、合法性校验（非空位、非自杀、打劫校验）。
 * 连接：作为公共库，被三个模式的 Hook 同时调用。
3.2 数据处理层 (src/lib/ai/sgf-processor.ts)
 * 职责：SGF 格式的“转译中心”。
 * 功能：将 .sgf 文件解析为 Move[] 线性序列，支持提取初始摆子（Handicaps）。
 * 连接：输入 sgf-repo/ 资源，输出给 useMirrorGame.ts。
3.3 状态驱动层 (src/hooks/)
 * useMirrorGame.ts：维护 currentStepIndex，在 onMove 时比对 levelMoves[index]。
 * usePracticeGame.ts：管理本地 history 栈，支持 undo 操作。
 * useOnlineGame.ts：封装 Socket 事件，实现远程异步落子更新。
3.4 视图展示层 (src/components/game/Board.tsx)
 * 职责：纯净 UI 渲染。
 * 连接：接收 board 矩阵（来自 Hook）并触发 onSquareClick 事件。
4. 技术栈细节 (Tech Stack)
 * 前端框架: Next.js 15.x (App Router)
 * 通信协议: Socket.io / WebSocket (Online 模式)
 * 数据存储: Firebase / Firestore (关卡进度与对局存档)
 * AI 辅助: Gemini (用于生成对局解说或代码重构建议)
 * 核心算法: 移除暴力搜索，转向 基于索引的路径校验。
5. 当前开发进度 (Current Status)
 *  规格对齐：全系统已适配 19x19 逻辑。
 *  SGF 解析器：已完成支持 AlphaGo 棋谱全量解析的 SgfProcessor。
 *  镜像校验：已完成 GoLogic.validateMirrorMove 逻辑。
 *  待处理：多模式切换的路由分发，以及 Board.tsx 的通用化适配。
6. 后续开发重点
 * 统一 Board 组件：确保一个棋盘组件能同时响应镜像模式的“提示高亮”和连线模式的“锁定操作”。
 * Firebase 集成：将 sgf-repo/ 中的名局索引存储在数据库中，实现动态加载关卡。
** Gemini 提示建议：**
在后续对话中，如果您需要我修改代码，请指明是针对哪种模式（镜像、练棋或连线）。您可以问我：“如何为镜像模式添加‘错着闪红’的 UI 反馈？”或者“如何实现练棋模式的悔棋逻辑？”。

​ 项目完整文件结构
studio/
├── src/
│   ├── app/
│   │   ├── actions/
│   │   │   └── ai.ts             # 镜像模式：获取关卡数据及下一步坐标
│   │   └── game/
│   │       ├── mirror/[levelId]/ # 镜像关卡：根据 ID 加载 AlphaGo 等名局
│   │       ├── practice/         # 本地练棋：支持自对弈、形势判断、悔棋
│   │       ├── online/[roomId]/  # 玩家连线：通过 Socket 同步对局
│   │       └── page.tsx          # 模式选择入口页
│   ├── components/
│   │   └── game/
│   │       ├── Board.tsx          # 纯 UI 棋盘：只负责渲染和点击回调
│   │       ├── LevelControls.tsx  # 镜像专有控制（提示、进度条）
│   │       ├── PracticeTools.tsx  # 练棋工具（切换颜色、分析、悔棋）
│   │       ├── OnlineStatus.tsx   # 连线状态（延迟、对手在线情况）
│   │       └── MoveIndicator.tsx  # 标记组件（上一步落子、提示点）
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── sgf-processor.ts   # SGF 解析器：支持解析关卡及导出本地棋谱
│   │   │   └── sgf-repo/          # 静态资源：存放 AlphaGo 对局文件
│   │   ├── go-logic.ts            # 底层物理规则：提子、气数、合法性、打劫校验
│   │   ├── socket.ts              # Socket.io 客户端配置（用于 PvP 模式）
│   │   └── types.ts               # 全局类型定义（Move, Player, GameMode 等）
│   ├── hooks/
│   │   ├── useMirrorGame.ts       # 镜像模式逻辑：索引匹配、自动下一步
│   │   ├── usePracticeGame.ts     # 练棋模式逻辑：自由落子、历史记录维护
│   │   └── useOnlineGame.ts       # 连线模式逻辑：网络同步、落子确认
│   └── store/                     # (可选) 如果状态复杂，可使用 Zustand/Recoil
│       └── gameStore.ts
├── public/
│   └── assets/                    # 棋子图片、音效等
└── next.config.js                 # 配置文件（包含 Server Actions 限制调整）

命名规范建议
​SGF 文件命名：
​建议格式：难度_描述_ID.sgf
​例如：01_AlphaGo_LeeSedol_G1.sgf, 02_AlphaGo_SelfPlay_05.sgf。  
​校验函数：validateUserStep。
​提示函数：showCorrectHint。
​变量命名风格：​使用 currentStepIndex 进行逻辑循环。