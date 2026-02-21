"use client";

import { useState, useCallback, useReducer, useEffect } from "react";
import { GoBoard } from "@/components/game/GoBoard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { AIStrategy } from "@/components/game/AIStrategy";
import { SearchTreeVisualization } from "@/components/game/SearchTreeVisualization";
import { AIDebugLog } from "@/components/game/AIDebugLog";
import type {
  Player,
  BoardState,
  GameStatus,
  GameResult,
  Move,
  GameHistoryEntry,
  ScoreDetails,
  GameMode,
  GamePhase,
} from "@/lib/types";
import { processMove, calculateScore, createEmptyBoard } from "@/lib/go-logic";
import { cn } from "@/lib/utils";
import { MoveHistory } from "@/components/game/MoveHistory";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection } from "firebase/firestore";
import { getAiMove } from "@/app/actions/ai";

const timeSettings: { [key: number]: number } = {
  9: 60 * 60 * 1000,
  13: 2 * 60 * 60 * 1000,
  19: 3 * 60 * 60 * 1000,
};

interface GameState {
  boardSize: number;
  board: BoardState;
  currentPlayer: Player;
  gameStatus: GameStatus;
  gameResult: GameResult | null;
  moveHistory: Move[];
  boardHistory: BoardState[];
  lastMove: Move | null;
  captures: { black: number; white: number };
  gameMode: GameMode;
}

const getInitialState = (size: number = 19): GameState => ({
  boardSize: size,
  board: createEmptyBoard(size),
  currentPlayer: 'black',
  gameStatus: 'setup',
  gameResult: null,
  moveHistory: [],
  boardHistory: [],
  lastMove: null,
  captures: { black: 0, white: 0 },
  gameMode: 'pve',
});

type GameAction =
  | { type: 'START_GAME'; payload: { boardSize: number; gameMode: GameMode; } }
  | { type: 'MAKE_MOVE'; payload: { board: BoardState; move: Move; capturedStones: number; } }
  | { type: 'PASS_TURN' }
  | { type: 'UNDO' }
  | { type: 'END_GAME'; payload: { winner: Player | 'draw'; reason: string; scores?: { blackScore: number; whiteScore: number; details?: ScoreDetails; } } }
  | { type: 'SET_GAME_STATUS'; payload: GameStatus };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const { boardSize, gameMode } = action.payload;
      return {
        ...getInitialState(boardSize),
        gameMode,
        gameStatus: 'playing',
        boardHistory: [],
      };
    }
    case 'MAKE_MOVE': {
      const { board, move, capturedStones } = action.payload;
      const newCaptures = { ...state.captures };
      if (capturedStones > 0) {
        newCaptures[state.currentPlayer] = state.captures[state.currentPlayer] + capturedStones;
      }
      return {
        ...state,
        board,
        moveHistory: [...state.moveHistory, move],
        boardHistory: [...state.boardHistory, state.board],
        lastMove: move,
        currentPlayer: state.currentPlayer === 'black' ? 'white' : 'black',
        captures: newCaptures,
      };
    }
    case 'PASS_TURN': {
       const passMove: Move = { r: -1, c: -1, player: state.currentPlayer };
       return {
         ...state,
         moveHistory: [...state.moveHistory, passMove],
         boardHistory: [...state.boardHistory, state.board],
         lastMove: passMove,
         currentPlayer: state.currentPlayer === "black" ? "white" : "black",
       };
    }
    case 'UNDO': {
      if (state.moveHistory.length === 0) return state;
      const movesToUndo = state.gameMode === 'pve' && state.moveHistory.length >= 2 ? 2 : 1;
      const newMoveHistory = state.moveHistory.slice(0, state.moveHistory.length - movesToUndo);
      const newBoardHistory = state.boardHistory.slice(0, state.boardHistory.length - movesToUndo);
      
      const lastValidBoard = newBoardHistory.length > 0 
        ? newBoardHistory[newBoardHistory.length - 1]
        : createEmptyBoard(state.boardSize);
        
      const newLastMove = newMoveHistory.length > 0 ? newMoveHistory[newMoveHistory.length - 1] : null;
      
      return {
          ...state,
          moveHistory: newMoveHistory,
          boardHistory: newBoardHistory,
          board: lastValidBoard,
          lastMove: newLastMove,
          currentPlayer: newMoveHistory.length % 2 === 0 ? 'black' : 'white',
          captures: { black: 0, white: 0 }, 
      };
    }
    case 'END_GAME': {
      return {
        ...state,
        gameStatus: 'finished',
        gameResult: {
          winner: action.payload.winner,
          reason: action.payload.reason,
          blackScore: action.payload.scores?.blackScore,
          whiteScore: action.payload.scores?.whiteScore,
          scoreDetails: action.payload.scores?.details,
        }
      }
    }
    case 'SET_GAME_STATUS':
      return { ...state, gameStatus: action.payload };
    default:
      return state;
  }
}

export default function GamePage() {
  const [gameState, dispatch] = useReducer(gameReducer, getInitialState());
  const { board, boardSize, currentPlayer, gameStatus, gameResult, moveHistory, boardHistory, lastMove, captures, gameMode } = gameState;
  const db = useFirestore();
  const { toast } = useToast();
  
  const [timers, setTimers] = useState<{ [key in Player]: number }>({
    black: timeSettings[19],
    white: timeSettings[19],
  });
  
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiGamePhase, setAiGamePhase] = useState<GamePhase>('Unknown');
  const [aiExplanation, setAiExplanation] = useState("AI 正在等待游戏开始。");
  const [aiDebugLog, setAiDebugLog] = useState<any>(null);

  const handleStartGame = useCallback((options: { boardSize: number; gameMode: GameMode }) => {
    dispatch({ type: 'START_GAME', payload: options });
    setTimers({ black: timeSettings[options.boardSize], white: timeSettings[options.boardSize] });
    setAiExplanation("AI 已就绪，请黑方落子。");
    setAiGamePhase("Fuseki");
    setAiDebugLog(null);
  }, []);

  const endGame = useCallback((winner: Player | 'draw', reason: string, scores?: {blackScore: number, whiteScore: number, details?: ScoreDetails}) => {
    dispatch({ type: 'END_GAME', payload: { winner, reason, scores } });
  }, []);
  
  const handlePass = useCallback(() => {
     if (gameStatus !== 'playing') return;
     const lastMoveInHistory = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;
     if (lastMoveInHistory && lastMoveInHistory.r === -1 && lastMoveInHistory.c === -1) {
         const scoreResult = calculateScore(board);
         endGame(scoreResult.winner, '双方停着协议终局', scoreResult);
     } else {
        toast({ title: `${currentPlayer === 'black' ? '黑方' : '白方'} 停着。` });
        dispatch({ type: 'PASS_TURN' });
     }
  }, [board, currentPlayer, gameStatus, toast, moveHistory, endGame]);

  const handleResign = () => {
    if (gameStatus !== 'playing') return;
    const winner = currentPlayer === 'black' ? 'white' : 'black';
    endGame(winner, `${currentPlayer === 'black' ? '黑方' : '白方'} 投子认负。`);
  }

  const handleUndo = () => {
    if (gameStatus !== 'playing' || moveHistory.length === 0) {
       toast({ title: '无法悔棋', description: '没有可撤销的棋步。', variant: 'destructive' });
       return;
    }
    dispatch({ type: 'UNDO' });
    const movesUndone = gameMode === 'pve' && moveHistory.length >= 2 ? 2 : 1;
    toast({ title: '悔棋成功', description: `已回退 ${movesUndone} 手。`});
  }

  const handleMove = useCallback((r: number, c: number) => {
      if (gameStatus !== "playing" || (gameMode === 'pve' && currentPlayer === 'white')) return;
      
      const result = processMove(board, r, c, currentPlayer, boardHistory);
      
      if (result.success) {
          dispatch({ 
            type: 'MAKE_MOVE', 
            payload: { 
              board: result.newBoard, 
              move: { r, c, player: currentPlayer }, 
              capturedStones: result.capturedStones 
            } 
          });
      } else { 
          const errorMsg = result.error === 'ko' ? "打劫！请先在别处落子。" : "此处不可落子";
          toast({ title: "非法落子", description: errorMsg, variant: "destructive" });
      }
    }, [board, boardHistory, currentPlayer, gameStatus, toast, gameMode]
  );
  
  useEffect(() => {
    if (gameMode === 'pve' && currentPlayer === 'white' && gameStatus === 'playing' && !isAiThinking) {
      const handleAiTurn = async () => {
        setIsAiThinking(true);
        setAiExplanation("AI 正在深度思考中...");
        
        try {
          // 优化：不再通过网络传递庞大的 boardHistory，仅传递 Move[]
          const aiResult = await getAiMove(board, 'white', moveHistory, boardSize);

          if (aiResult.bestMove && aiResult.bestMove.r !== -1) {
            setAiGamePhase(aiResult.gamePhase as any);
            setAiExplanation(aiResult.explanation);
            setAiDebugLog(aiResult.debugLog);

            const gameResult = processMove(board, aiResult.bestMove.r, aiResult.bestMove.c, 'white', boardHistory);
            if (gameResult.success) {
              dispatch({ 
                type: 'MAKE_MOVE', 
                payload: { 
                  board: gameResult.newBoard, 
                  move: { r: aiResult.bestMove.r, c: aiResult.bestMove.c, player: 'white' }, 
                  capturedStones: gameResult.capturedStones 
                } 
              });
            } else {
                 toast({ title: "AI 错误", description: `AI 选择了一个非法位置。强制停着。`, variant: 'destructive'});
                 dispatch({ type: 'PASS_TURN' });
            }
          } else {
            setAiExplanation(aiResult.explanation || "AI 选择停着。");
            setAiDebugLog(aiResult.debugLog);
            toast({ title: "AI 停着", description: aiResult.explanation });
            dispatch({ type: 'PASS_TURN' });
          }
        } catch (error) {
          console.error("AI Turn Error:", error);
          toast({ title: "AI 服务异常", description: "与 AI 引擎通讯失败，请检查网络。", variant: "destructive" });
          dispatch({ type: 'PASS_TURN' });
        } finally {
          setIsAiThinking(false);
        }
      };
      handleAiTurn();
    }
  }, [currentPlayer, gameMode, gameStatus, isAiThinking, board, boardHistory, moveHistory, boardSize, toast]);
  
  useEffect(() => {
      if (gameStatus !== 'playing') return;
      const interval = setInterval(() => {
          setTimers(prev => {
              const newTime = prev[currentPlayer] - 1000;
              if (newTime <= 0) {
                  endGame(currentPlayer === 'black' ? 'white' : 'black', `${currentPlayer === 'black' ? '黑方' : '白方'} 超时。`);
                  return { ...prev, [currentPlayer]: 0 };
              }
              return { ...prev, [currentPlayer]: newTime };
          });
      }, 1000);
      return () => clearInterval(interval);
  }, [currentPlayer, gameStatus, endGame]);

  useEffect(() => {
    if (gameStatus === 'finished' && gameResult) {
      const newHistoryEntry: GameHistoryEntry = {
          id: new Date().toISOString(),
          date: new Date().toISOString(),
          mode: gameMode === 'pve' ? 'ai' : 'local',
          result: gameResult as any,
          moveHistory: moveHistory,
          boardSize: boardSize,
      };

      try {
        addDocumentNonBlocking(collection(db, "games"), {
          ...newHistoryEntry,
          playerWhiteId: gameMode === 'pve' ? 'ai-shadow' : 'local-player',
          playerBlackId: 'local-player',
          status: 'finished',
          createdAt: new Date().toISOString(),
        });
        toast({ title: "云端同步", description: "对局记录已保存到您的资料库。" });
      } catch (error) {
        console.error("Failed to save to Firestore:", error);
      }
    }
  }, [gameStatus, gameResult, toast, moveHistory, boardSize, gameMode, db]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderPlayerCard = (player: Player) => {
    const isAI = gameMode === 'pve' && player === 'white';
    return (
        <Card key={`${player}-${currentPlayer}`} className={cn(
        "text-center transition-all duration-300",
        gameStatus === 'playing' && currentPlayer === player && 'animate-turn-indicator-pop ring-2 ring-primary'
        )}>
        <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-xl font-headline">
            <Icons.Stone className={cn("w-6 h-6", player === 'black' ? 'fill-black' : 'fill-white stroke-black stroke-[2px]')}/>
            <span>{isAI ? 'Shadow AI' : (player === 'black' ? '黑方' : '白方')}</span>
            </CardTitle>
            <CardDescription>提子数: {captures[player]}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-4xl font-mono font-bold tracking-wider">{formatTime(timers[player])}</div>
        </CardContent>
        </Card>
    );
  };
  
  if (gameStatus === "setup") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="text-center">
          <h1 className="text-6xl font-headline font-bold text-primary">Go Master</h1>
          <p className="mt-4 text-xl text-foreground/80">
            探寻黑白博弈的终极智慧。
          </p>
          <NewGameDialog onStartGame={handleStartGame} />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 flex flex-col lg:flex-row gap-8 items-start justify-center">
      <Dialog open={gameStatus === "finished"} onOpenChange={(open) => !open && dispatch({type: 'SET_GAME_STATUS', payload: 'setup'})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">对局结束</DialogTitle>
            <DialogDescription>
              {gameResult?.winner === 'draw'
                ? `本局握手言和（和棋）。`
                : `获胜方：${gameResult?.winner === 'black' ? '黑方' : '白方'}`}
              <br />
              判定原因: {gameResult?.reason}
            </DialogDescription>
          </DialogHeader>
          {gameResult?.scoreDetails ? (
              <div className="text-sm font-mono -mt-2 space-y-3 p-4 bg-muted/50 rounded-md">
                  <div className="grid grid-cols-2 gap-x-4">
                    <div className="space-y-1">
                        <h4 className="font-bold text-base mb-1">黑方</h4>
                        <p>子力: {gameResult.scoreDetails.blackStones}</p>
                        <p>领地: {gameResult.scoreDetails.blackTerritory}</p>
                        <p className="font-bold border-t border-muted-foreground/50 pt-1">总分: {gameResult.blackScore?.toFixed(1)}</p>
                    </div>
                     <div className="space-y-1">
                        <h4 className="font-bold text-base mb-1">白方</h4>
                        <p>子力: {gameResult.scoreDetails.whiteStones}</p>
                        <p>领地: {gameResult.scoreDetails.whiteTerritory}</p>
                        <p>贴目: {gameResult.scoreDetails.komi.toFixed(1)}</p>
                        <p className="font-bold border-t border-muted-foreground/50 pt-1">总分: {gameResult.whiteScore?.toFixed(1)}</p>
                    </div>
                  </div>
              </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => dispatch({type: 'SET_GAME_STATUS', payload: 'setup'})}>回到主菜单</Button>
            <NewGameDialog onStartGame={handleStartGame} isPlayAgain={true} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="w-full lg:w-1/4 flex flex-col gap-4">
        {renderPlayerCard('white')}
        {gameMode === 'pve' && (
          <>
            <AIStrategy 
              phase={aiGamePhase} 
              explanation={aiExplanation} 
              isThinking={isAiThinking} 
            />
            <SearchTreeVisualization isThinking={isAiThinking} />
            <AIDebugLog log={aiDebugLog} />
          </>
        )}
      </div>

      <div className="relative">
        <GoBoard 
          board={board} 
          onMove={handleMove} 
          disabled={gameStatus !== 'playing' || (gameMode === 'pve' && currentPlayer === 'white')}
          lastMove={lastMove} 
          size={boardSize}
          currentPlayer={currentPlayer}
          isAiThinking={isAiThinking}
        />
      </div>

      <div className="w-full lg:w-1/4 flex flex-col gap-4">
        {renderPlayerCard('black')}
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-xl">对局控制</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={handlePass} disabled={gameStatus !== 'playing' || isAiThinking}>
              <Icons.Play className="mr-2 -rotate-90"/> 停着 (Pass)
            </Button>
             <Button onClick={handleUndo} disabled={gameStatus !== 'playing' || isAiThinking || moveHistory.length < (gameMode === 'pve' ? 2 : 1)}>
                <Icons.Undo className="mr-2"/> 悔棋 (Undo)
            </Button>
            <Button variant="destructive" onClick={handleResign} disabled={gameStatus !== 'playing' || isAiThinking}>
              <Icons.Resign className="mr-2"/> 认负 (Resign)
            </Button>
            <Button variant="outline" onClick={() => dispatch({type: 'SET_GAME_STATUS', payload: 'setup'})}>
              <Icons.Logo className="mr-2"/> 新对局
            </Button>
          </CardContent>
        </Card>
        <MoveHistory moveHistory={moveHistory} boardSize={boardSize} />
      </div>
    </div>
  );
}

function NewGameDialog({ onStartGame, isPlayAgain = false }: { onStartGame: (options: { boardSize: number, gameMode: GameMode }) => void; isPlayAgain?: boolean; }) {
  const [isOpen, setIsOpen] = useState(false);
  const [boardSize, setBoardSize] = useState("19");
  const [gameMode, setBoardMode] = useState<GameMode>("pve");
  const handleStart = () => {
    onStartGame({ boardSize: Number(boardSize), gameMode: gameMode });
    setIsOpen(false);
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button onClick={() => setIsOpen(true)} className={cn("mt-8", isPlayAgain && "mt-0")} size={isPlayAgain ? "default" : "lg"}>
        {isPlayAgain ? '再来一局' : '开启新对局'}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">对局配置</DialogTitle>
          <DialogDescription>请选择棋盘大小及对战模式。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
            <div className="grid gap-2">
                <Label>对战模式</Label>
                <Select value={gameMode} onValueChange={(value) => setBoardMode(value as GameMode)}>
                    <SelectTrigger><SelectValue placeholder="选择模式" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pve">人机对战 (vs Shadow AI)</SelectItem>
                        <SelectItem value="pvp">本地对弈 (双人同屏)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label>棋盘尺寸</Label>
                <Select value={boardSize} onValueChange={setBoardSize}>
                    <SelectTrigger><SelectValue placeholder="选择棋盘" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="19">19x19 (标准竞赛)</SelectItem>
                        <SelectItem value="13">13x13 (快速对局)</SelectItem>
                        <SelectItem value="9">9x9 (初学者入门)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        <DialogFooter>
          <Button onClick={handleStart}><Icons.Play className="mr-2"/> 开始对局</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
