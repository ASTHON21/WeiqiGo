这是一个为您量身定制的重塑方向报告。该报告将项目从“通用围棋 AI”重新定位为**“AlphaGo 名局闯关与克隆训练系统”**。
 项目重塑技术报告：AlphaGo 镜像关卡系统
1. 核心愿景 (Core Vision)
将原本基于搜索算法（Alpha-Beta）的对弈系统，重塑为一个严格基于棋谱（SGF）的同步训练器。系统不再“思考”如何赢，而是扮演“守关人”的角色，强制要求玩家复刻 AlphaGo 或名局选手的每一步，实现真正的“名局克隆”。
2. 逻辑架构演进 (Architectural Evolution)
| 模块 | 旧方案 (Shadow Engine) | 新方案 (Mirror Follower) |
|---|---|---|
| 驱动核心 | Alpha-Beta 搜索 + 字典匹配 | 线性动作序列 (Action Queue) |
| 落子决策 | 评估函数评分 | SGF 索引匹配 (Index Matching) |
| 交互逻辑 | 自由博弈 | 强制对齐校验 (Strict Validation) |
| AI 角色 | 竞争对手 (Competitor) | 镜像导师 (Mirror Tutor) |
3. 关键功能定义 (Key Features)
3.1 严格路径校验 (Strict Path Validation)
 * 零容忍机制：系统预先加载完整的 SGF 对局。玩家每一步必须与棋谱坐标完全一致。
 * 拦截逻辑：如果玩家点击了非棋谱坐标，系统拒绝执行落子动作并给出视觉警告。
 * 状态同步：AI 会在玩家正确落子后，瞬间同步棋谱中的下一手。
3.2 关卡驱动系统 (Level-Based Repository)
 * 关卡即文件：sgf-repo/ 中的每一个 .sgf 文件（如 AlphaGo_vs_LeeSedol_G1.sgf）被视为独立关卡。
 * 进度记忆：系统通过 currentStep 索引追踪玩家在棋谱中的位置。
3.3 提示与辅助 (Hint & Assistance)
 * 常驻提示按钮：点击后高亮显示棋谱要求的当前正确落子点。
 * 让子支持 (Handicap)：系统初始化时自动解析 SGF 中的 AB (Add Black) 标签，预摆棋子，并从第一个动作（通常是白棋）开始引导。
4. 核心技术重塑点
4.1 移除内容
 * ~~AlphaBeta 搜索循环~~：不再需要庞大的节点计算。
 * ~~Evaluation 评估函数~~：不再需要计算领地和子力价值。
 * ~~Zobrist Hashing~~：不再需要棋盘哈希缓存，因为路径是唯一的。
4.2 引入内容
 * FullSgfParser：能够将整个 SGF 转换为有序的 Move[] 数组。
 * StepController：管理 (currentStep += 2) 的步进逻辑（玩家一步 + AI 响应一步）。
5. 预期结果与优势
 * 极速响应：由于移除了所有逻辑计算，AI 响应将缩短至 10ms 以内，彻底解决 51 秒延迟问题。
 * 绝对专业性：玩家每一步都在模仿 AlphaGo 的真实思路。
 * 开发环境适配：该方案对计算资源消耗极低，非常适合目前受限的移动端或低配 Server 环境。
6. 后续实施步骤
 * UI 改造：增加“关卡选择器”和“提示”功能。
 * Logic 更新：将 GoLogic 改为 validateMoveAgainstSgf 模式。
 * 数据清理：将 .sgf 资源按难度或选手（AlphaGo 自对弈、AlphaGo vs 玩家）分类。
这份报告是否准确捕捉了您的意图？如果确认，我们将开始为 SgfProcessor 编写全量解析代码，以支持这种“关卡式”逻辑。

根据您的重塑报告，AlphaGo 镜像关卡系统将从“对弈引擎”转变为“关卡校验系统”。为了支持这种线性同步逻辑，建议采用以下标准的文件结构和命名规范。
​ 项目完整文件结构
studio/
├── src/
│   ├── app/
│   │   ├── actions/
│   │   │   └── ai.ts             # 改为 getLevelMoveAction (获取关卡下一步)
│   │   └── game/
│   │       ├── [levelId]/         # 动态路由，根据关卡 ID 加载不同对局
│   │       └── page.tsx           # 游戏主页面 (集成同步校验逻辑)
│   ├── components/
│   │   └── game/
│   │       ├── Board.tsx          # 棋盘 UI
│   │       ├── LevelControls.tsx  # 关卡控制（重置、提示、选关）
│   │       └── MoveIndicator.tsx  # 提示标记组件 (Hint highlight)
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── dictionary/        # (保留) 用于存放静态资源
│   │   │   │   └── data/
│   │   │   │       └── sgf-repo/  # 核心：存放所有 .sgf 关卡文件
│   │   │   └── sgf-processor.ts   # 核心：解析 SGF 为 Move[] 线性数组
│   │   ├── go-logic.ts            # 改为镜像校验逻辑 (isCorrectMove)
│   │   └── types.ts               # 定义 Level, Step, Move 等类型
│   └── hooks/
│       └── useMirrorGame.ts       # 核心 Hook：管理当前步数和同步状态
├── public/
│   └── assets/                    # 静态 UI 资源
└── next.config.js                 # 配置文件

关键模块命名与职责说明
​1. src/lib/types.ts (类型定义)
​LevelData: 包含 moves: Move[], handicaps: Move[], totalSteps: number。
​GameState: 包含 currentStep: number, isCompleted: boolean。
​2. src/lib/ai/sgf-processor.ts (线性解析器)
​parseFullSgf(content: string): Move[]: 将 SGF 文件一次性解析为按序排列的数组。
​getHandicaps(content: string): Move[]: 解析 AB 标签，提取开局预摆棋子。
​3. src/lib/go-logic.ts (镜像校验器)
​checkMirrorMove(userMove, expectedMove): 核心函数。比较玩家落子与 moves[currentStep] 是否完全一致。
​processHandicaps(handicaps): 在第一手前初始化棋盘状态。
​4. src/app/actions/ai.ts (同步响应器)
​fetchNextMirrorMove(stepIndex, moves): 接收当前步数，直接返回数组中的 stepIndex + 1 项，无需任何搜索。
​5. src/hooks/useMirrorGame.ts (游戏控制器)
​负责维护 stepIndex 状态。
​控制玩家落子 \rightarrow 校验 \rightarrow 正确后触发 AI 自动落子 (下一索引) \rightarrow stepIndex + 2。
​
命名规范建议
​SGF 文件命名：
​建议格式：难度_描述_ID.sgf
​例如：01_AlphaGo_LeeSedol_G1.sgf, 02_AlphaGo_SelfPlay_05.sgf。  
​函数命名风格：
​校验函数：validateUserStep 而非 calculateBestMove。
​提示函数：showCorrectHint。
​变量命名风格：​使用 currentStepIndex 代替 moveHistory 进行逻辑循环。
​
​重塑后的优势
​在这个结构下，AIDebugLog 组件将不再显示复杂的搜索树，而是显示类似 “当前进度：第 45/250 手” 或 “历史对局：AlphaGo vs Player” 的信息。