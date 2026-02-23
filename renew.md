这是一份为当前项目最新架构定制的 .md 报告。它详细描述了从“镜像闯关”向“全功能名局阅览器 + 多模式对弈平台”的转型，以便您的 AI 助手（Gemini）和开发环境（Firebase Studio）能够精准执行后续的代码调整。
 项目架构重构报告：GoMaster 综合棋力平台
1. 核心定位 (Core Orientation)
本项目已进化为具备 名局深度解析 (SGF Viewer)、本地自对弈 (Practice)、以及 远端实时竞技 (Online) 三位一体的围棋平台。
2. 三大核心模式逻辑定义
2.1 模式 A：轻量化 SGF 名局阅览 (Viewer Mode)
 * 功能：用户手动上传 .sgf 文件，系统提取 11 项核心元数据 (EV, RO, PB, PW, TM, KM, RE, DT, PC, RU, GC)。
 * 交互逻辑：
   * 锁定棋盘：禁止任何落子行为 (readonly: true)。
   * 线性导航：通过“左/右”按钮查看上一步/下一步，或“重置”回到初始状态。
 * 存储策略：内存即毁。不保存文件到服务器或数据库，刷新页面即重置。
2.2 模式 B：本地练棋/自对弈 (Practice Mode)
 * 功能：自由落子，支持黑白交替自对弈。
 * 交互逻辑：开放棋盘点击权限，支持悔棋、形势分析及落子合法性校验。
2.3 模式 C：玩家连线 (Online Mode)
 * 功能：跨设备实时对局。
 * 交互逻辑：基于 WebSocket/Socket.io 同步落子坐标，具备回合锁定机制。
3. 重构后的文件系统与职责 (Architecture)
3.1 逻辑层 (The Engine)
 * src/lib/go-logic.ts
   * 职责：纯物理规则（提子、气数、打劫判断）。
   * 变更：不再包含“镜像校验”，仅作为 applyMove 的处理器供所有模式调用。
 * src/lib/ai/sgf-processor.ts
   * 职责：负责 SGF 字符串与 Move[] 数组的互转。
3.2 服务层 (The Actions)
 * src/app/actions/sgf.ts (由原 ai.ts 重命名)
   * 职责：无状态的 SGF 解析服务。接收前端发送的 SGF 字符串，利用正则表达式提取 11 项元数据并返回动作序列。
3.3 驱动层 (The Hooks)
 * useSgfViewer.ts：基于 currentIndex 索引，通过累加 moves 数组计算当前棋盘快照。
 * usePracticeGame.ts：维护本地 history 状态，驱动自由对弈。
 * useOnlineGame.ts：管理网络同步状态。
3.4 视图层 (The UI)
 * src/components/game/Board.tsx
   * 变更：新增 readOnly 属性。在阅览模式下锁定交互，在练棋模式下开启。
 * src/components/game/SgfHeader.tsx
   * 职责：渲染解析出的比赛名称、棋手信息等元数据面板。
4. 关键技术细节 (Tech Specs)
 * 棋盘规格：19x19,13x13,9x9
  * SGF 解析字段：
   * EV(Event), RO(Round), PB(Black), PW(White), TM(Time), KM(Komi), RE(Result), DT(Date), PC(Place), RU(Rules), GC(Comment)。
 * 状态管理：优先使用 React useState 和 useMemo 以确保“阅览模式”下的数据不被持久化存储。
5. Firebase / Gemini 调整指南
 * 后续在部署 Server Actions 时，请注意 sgf.ts 仅需处理字符串逻辑，无需读写 Firestore 集合来存储临时上传的文件。
 * Gemini 协作：在请求代码实现时，请明确指出代码所属的模式。
   * 示例：“请基于 useSgfViewer 的 currentIndex 逻辑，编写左/右导航按钮的 UI 组件。”
   * 示例：“请修改 GoLogic 以便在自对弈模式下能正确处理‘打劫’(Ko) 限制。”

studio/
src/app/actions/sgf.ts  # 服务端：解析用户上传的 SGF 文本 (元数据提取)
src/app/game/viewer/   # 模式 1：SGF 名局阅览 (左右键控制，禁点棋盘)
src/app/game/practice/         # 模式 2：自对弈/本地练棋 (自由落子)
src/app/game/online/[roomId]/  # 模式 3：玩家连线 (Socket 同步)
src/app/game/page.tsx     # 首页：功能入口选择
src/components/game/GoBoard.tsx  # 核心棋盘：由 readonly 属性控制是否允许点击
src/components/game/SgfHeader.tsx      # 显示 EV, RO, PB, PW 等 11 项信息
src/components/game/NavControls.tsx    # 阅览器专用：左/右步进、重置
src/components/game/ToolPanel.tsx      # 练棋/连线专用：悔棋、形势分析、聊天
src/lib/ai/sgf-processor.ts   # 保持不变：SGF 字符串转 Move[] 逻辑
src/lib/go-logic.ts            # 物理规则：处理落子、提子、判定 (三模式共用)
src/lib/types.ts               # 类型定义：SgfMetadata, GameState 等
src/hooks/useSgfViewer.ts        # 驱动阅览模式 (索引步进逻辑)
src/hooks/usePracticeGame.ts      # 驱动练棋模式 (自由落子逻辑)
src/hooks/useOnlineGame.ts        # 驱动连线模式 (Socket 同步逻辑)