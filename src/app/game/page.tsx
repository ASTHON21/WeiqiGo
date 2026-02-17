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
import { processMove, calculateScore } from "@/lib/go-logic";
import { cn } from "@/lib/utils";
import { findBestMove } from "@/lib/ai-engine";
import { MoveHistory } from "@/components/game/MoveHistory";

const timeSettings: { [key: number]: number } = {
  9: 60 * 60 * 1000,
  13: 2 * 60 * 60 * 1000,
  19: 3 * 60 * 60 * 1000,
};

const createEmptyBoard = (size: number): BoardState =>
  Array(size)
    .fill(null)
    .map(() => Array(size).fill(null));

// --- Game State Management with useReducer ---

interface GameState {
  boardSize: number;
  board: BoardState;
  currentPlayer: Player;
  gameStatus: GameStatus;
  gameResult: GameResult;
  moveHistory: Move[];
  boardHistory: BoardState[];
  lastMove: Move | null;
  captures: { black: number; white: number };
  gameMode: GameMode;
}

type GameAction =
  | { type: 'START_GAME'; payload: { boardSize: number; gameMode: GameMode; } }
  | { type: 'MAKE_MOVE'; payload: { board: BoardState; move: Move; capturedStones: number; } }
  | { type: 'PASS_TURN' }
  | { type: 'UNDO' }
  | { type: 'END_GAME'; payload: { winner: Player | 'draw'; reason: string; scores?: { blackScore: number; whiteScore: number; details?: ScoreDetails; } } }
  | { type: 'SET_GAME_STATUS'; payload: GameStatus };

const getInitialState = (size: number = 19): GameState => ({
  boardSize: size,
  board: createEmptyBoard(size),
  currentPlayer: 'black',
  gameStatus: 'setup',
  gameResult: null,
  moveHistory: [],
  boardHistory: [createEmptyBoard(size)],
  lastMove: null,
  captures: { black: 0, white: 0 },
  gameMode: 'pve',
});

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const { boardSize, gameMode } = action.payload;
      return {
        ...getInitialState(boardSize),
        gameMode,
        gameStatus: 'playing',
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
        boardHistory: [...state.boardHistory, board],
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
      const movesToUndo = state.gameMode === 'pve' ? 2 : 1;
      if (state.moveHistory.length < movesToUndo) {
        return state;
      }

      const newMoveHistory = state.moveHistory.slice(0, -movesToUndo);
      const newBoardHistory = state.boardHistory.slice(0, -movesToUndo);
      const lastValidBoard = newBoardHistory[newBoardHistory.length - 1] || createEmptyBoard(state.boardSize);
      const newLastMove = newMoveHistory[newMoveHistory.length - 1] || null;

      // Recalculating captures is complex, so we simplify by resetting.
      // This is a known limitation of the current undo implementation.
      const newCaptures = { black: 0, white: 0 }; 

      return {
          ...state,
          moveHistory: newMoveHistory,
          boardHistory: newBoardHistory,
          board: lastValidBoard,
          lastMove: newLastMove,
          currentPlayer: state.gameMode === 'pve' 
            ? 'black' 
            : (newLastMove ? (newLastMove.player === 'black' ? 'white' : 'black') : 'black'),
          captures: newCaptures,
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

  const { toast } = useToast();
  
  const [timers, setTimers] = useState<{ [key in Player]: number }>({
    black: timeSettings[19],
    white: timeSettings[19],
  });
  
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiGamePhase, setAiGamePhase] = useState<GamePhase>('Unknown');
  const [aiExplanation, setAiExplanation] = useState("The AI is waiting for the game to start.");
  const [aiDebugLog, setAiDebugLog] = useState<any>(null);

  const handleStartGame = useCallback((options: { boardSize: number; gameMode: GameMode }) => {
    dispatch({ type: 'START_GAME', payload: options });
    setTimers({ black: timeSettings[options.boardSize], white: timeSettings[options.boardSize] });
    setAiExplanation("AI is ready. Make your first move.");
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
         toast({ title: 'Game Over', description: 'Both players passed consecutively.'});
         const scoreResult = calculateScore(board);
         endGame(scoreResult.winner, 'Agreement', scoreResult);
     } else {
        toast({ title: `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} passed.` });
        dispatch({ type: 'PASS_TURN' });
     }
  }, [board, currentPlayer, gameStatus, toast, moveHistory, endGame]);

  const handleResign = () => {
    if (gameStatus !== 'playing') return;
    const winner = currentPlayer === 'black' ? 'white' : 'black';
    const resignee = currentPlayer;
    
    endGame(winner, `${resignee.charAt(0).toUpperCase() + resignee.slice(1)} resigned.`);
  }

  const handleUndo = () => {
    if (gameStatus !== 'playing' || moveHistory.length < (gameMode === 'pve' ? 2 : 1)) {
       toast({ title: 'Cannot Undo', description: 'No moves to undo.', variant: 'destructive' });
       return;
    }
    dispatch({ type: 'UNDO' });
    toast({ title: 'Undo Successful', description: `Reverted ${gameMode === 'pve' ? 'your last move and the AI\'s response' : '1 move'}.`});
  }

  const handleMove = useCallback((r: number, c: number) => {
      if (gameStatus !== "playing" || (gameMode === 'pve' && currentPlayer === 'white')) return;
      
      if (r === -1 && c === -1) {
          handlePass();
          return;
      }

      const result = processMove(board, r, c, currentPlayer, boardHistory);

      if (result.success) {
          const newMove: Move = { r, c, player: currentPlayer };
          dispatch({ type: 'MAKE_MOVE', payload: { board: result.newBoard, move: newMove, capturedStones: result.capturedStones } });
      } else { 
          let description = `An unknown error occurred at (${r}, ${c}).`;
          if (result.error === 'ko') description = `Move at (${r}, ${c}) is not allowed due to the Ko rule.`;
          else if (result.error === 'suicide') description = `Suicide move at (${r}, ${c}) is not allowed.`;
          else if (result.error === 'occupied') description = `Position (${r}, ${c}) is already occupied.`;
          
          toast({ title: "Invalid Move", description, variant: "destructive" });
      }
    }, [board, boardHistory, currentPlayer, gameStatus, handlePass, toast, gameMode]
  );
  
  const getLocalAiMove = (
    boardState: BoardState,
    playerTurn: Player,
    currentMoveHistory: Move[],
    currentBoardSize: number,
  ) => {
    try {
        const { bestMove, explanation, gamePhase } = findBestMove(
            boardState,
            playerTurn,
            currentMoveHistory,
            currentBoardSize
        );
        
        if (!bestMove) {
            return {
                success: false,
                error: "AI could not find a valid move.",
                debugLog: { error: "No best move returned from `findBestMove`." }
            };
        }

        return {
            success: true,
            bestMove: { r: bestMove.r, c: bestMove.c, player: playerTurn },
            explanation,
            gamePhase,
            debugLog: {
                phaseInput: {
                    gamePhase,
                    moveHistory: currentMoveHistory.length,
                },
                phaseResult: {
                    gamePhase
                },
                moveInput: {
                    boardState,
                    playerTurn,
                    moveHistory: currentMoveHistory,
                    boardSize: currentBoardSize,
                },
                moveResult: {
                    bestMove,
                    explanation,
                }
            }
        };

    } catch (e: any) {
        console.error('Error in getLocalAiMove:', e);
        return { 
            success: false, 
            error: e.message || "An unexpected error occurred in the AI engine.",
            debugLog: {
                error: e.toString(),
            }
        };
    }
  }

  // AI Turn Logic - 彻底改为本地调用，不再消耗 API
  useEffect(() => {
    if (gameMode === 'pve' && currentPlayer === 'white' && gameStatus === 'playing' && !isAiThinking) {
      const handleAiTurn = () => {
        setIsAiThinking(true);
        setAiExplanation("本地 AI 正在计算...");
        
        // 延迟 500ms 模拟思考感，实际上计算只需 10ms
        setTimeout(() => {
          const aiResult = getLocalAiMove(board, 'white', moveHistory, boardSize);

          if (aiResult.success && aiResult.bestMove.r !== -1) {
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
                 toast({ title: "AI Error", description: `AI chose an invalid move (${gameResult.error}). Passing.`, variant: 'destructive'});
                 dispatch({ type: 'PASS_TURN' });
            }
          } else {
            if(aiResult.error){
                toast({ title: "AI Error", description: aiResult.error, variant: 'destructive' });
            } else {
                toast({ title: "AI Passes", description: aiResult.explanation });
            }
            dispatch({ type: 'PASS_TURN' });
          }
          setIsAiThinking(false);
        }, 500);
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
                  endGame(currentPlayer === 'black' ? 'white' : 'black', `${currentPlayer} ran out of time.`);
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
          result: gameResult,
          moveHistory: moveHistory,
          boardSize: boardSize,
      };
      try {
        const storedHistoryRaw = localStorage.getItem('goMasterHistory');
        const history = storedHistoryRaw ? JSON.parse(storedHistoryRaw) : [];
        const newHistory = [newHistoryEntry, ...history];
        localStorage.setItem('goMasterHistory', JSON.stringify(newHistory));
        toast({ title: "Game Over", description: "This game has been saved to your history." });
      } catch (error) {
        console.error("Failed to save game history:", error);
        toast({ title: "Could not save game", description: "There was an error saving this game to your history.", variant: "destructive" });
      }
    }
  }, [gameStatus, gameResult, toast, moveHistory, boardSize, gameMode]);


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
            <span>{isAI ? 'Shadow AI' : (player.charAt(0).toUpperCase() + player.slice(1))}</span>
            </CardTitle>
            <CardDescription>Captures: {captures[player]}</CardDescription>
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
            The ancient game of strategy.
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
            <DialogTitle className="font-headline text-2xl">Game Over</DialogTitle>
            <DialogDescription>
              {gameResult?.winner === 'draw'
                ? `The game is a draw.`
                : `Winner: ${gameResult?.winner?.charAt(0).toUpperCase()}${gameResult?.winner?.slice(1)}`}
              <br />
              Reason: {gameResult?.reason}
            </DialogDescription>
          </DialogHeader>
          {gameResult?.scoreDetails ? (
              <div className="text-sm font-mono -mt-2 space-y-3 p-4 bg-muted/50 rounded-md">
                  <div className="grid grid-cols-2 gap-x-4">
                    <div className="space-y-1">
                        <h4 className="font-bold text-base mb-1">Black</h4>
                        <p>Stones: {gameResult.scoreDetails.blackStones}</p>
                        <p>Territory: {gameResult.scoreDetails.blackTerritory}</p>
                        <p className="font-bold border-t border-muted-foreground/50 pt-1">Total: {gameResult.blackScore?.toFixed(1)}</p>
                    </div>
                     <div className="space-y-1">
                        <h4 className="font-bold text-base mb-1">White</h4>
                        <p>Stones: {gameResult.scoreDetails.whiteStones}</p>
                        <p>Territory: {gameResult.scoreDetails.whiteTerritory}</p>
                        <p>Komi: {gameResult.scoreDetails.komi.toFixed(1)}</p>
                        <p className="font-bold border-t border-muted-foreground/50 pt-1">Total: {gameResult.whiteScore?.toFixed(1)}</p>
                    </div>
                  </div>
                  <p className="text-base font-bold text-center pt-2 border-t border-muted-foreground/50">
                    Difference: {Math.abs((gameResult.blackScore ?? 0) - (gameResult.whiteScore ?? 0)).toFixed(1)} points
                  </p>
              </div>
          ) : gameResult?.blackScore !== undefined && gameResult.whiteScore !== undefined ? (
              <div className="text-center font-mono -mt-2">
                  <div className="text-lg font-semibold">Final Score</div>
                  <div>Black: {gameResult.blackScore.toFixed(1)}</div>
                  <div>White: {gameResult.whiteScore.toFixed(1)}</div>
              </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => dispatch({type: 'SET_GAME_STATUS', payload: 'setup'})}>Main Menu</Button>
            <NewGameDialog
              onStartGame={handleStartGame}
              isPlayAgain={true}
            />
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
            <CardTitle className="font-headline text-xl">Controls</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={handlePass} disabled={gameStatus !== 'playing' || isAiThinking}>
              <Icons.Play className="mr-2 -rotate-90"/> Pass Turn
            </Button>
             <Button onClick={handleUndo} disabled={gameStatus !== 'playing' || isAiThinking || moveHistory.length < (gameMode === 'pve' ? 2 : 1)}>
                <Icons.Undo className="mr-2"/> Undo
            </Button>
            <Button variant="destructive" onClick={handleResign} disabled={gameStatus !== 'playing' || isAiThinking}>
              <Icons.Resign className="mr-2"/> Resign
            </Button>
            <Button variant="outline" onClick={() => dispatch({type: 'SET_GAME_STATUS', payload: 'setup'})}>
              <Icons.Logo className="mr-2"/> New Game
            </Button>
          </CardContent>
        </Card>
        <MoveHistory moveHistory={moveHistory} boardSize={boardSize} />
      </div>
    </div>
  );
}


function NewGameDialog({ 
  onStartGame, 
  isPlayAgain = false,
}: { 
  onStartGame: (options: { boardSize: number, gameMode: GameMode }) => void; 
  isPlayAgain?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [boardSize, setBoardSize] = useState("9");
  const [gameMode, setGameMode] = useState<GameMode>("pve");

  const handleStart = () => {
    onStartGame({ 
      boardSize: Number(boardSize),
      gameMode: gameMode,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button onClick={() => setIsOpen(true)} className={cn("mt-8", isPlayAgain && "mt-0")} size={isPlayAgain ? "default" : "lg"}>
        {isPlayAgain ? 'Play Again' : 'Start New Game'}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">New Game Settings</DialogTitle>
          <DialogDescription>
            Configure your match.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
            <div className="grid gap-2">
                <Label>Game Mode</Label>
                <Select 
                    value={gameMode} 
                    onValueChange={(value) => setGameMode(value as GameMode)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a game mode" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pve">Player vs. AI</SelectItem>
                        <SelectItem value="pvp">Player vs. Player</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label>Board Size</Label>
                <Select 
                    value={boardSize} 
                    onValueChange={setBoardSize}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a board size" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="19">19x19 (Standard)</SelectItem>
                        <SelectItem value="13">13x13 (Quick Game)</SelectItem>
                        <SelectItem value="9">9x9 (Beginner)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        <DialogFooter>
          <Button onClick={handleStart}><Icons.Play className="mr-2"/> Start Game</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
