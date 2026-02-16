'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GoBoard } from '@/components/game/GoBoard';
import { GameInfoPanel } from '@/components/game/GameInfoPanel';
import { GameControls } from '@/components/game/GameControls';
import { SearchTreeVisualization } from '@/components/game/SearchTreeVisualization';
import type { Board, Move, Player, GamePhase } from '@/types';
import { createEmptyBoard, placeStoneAndHandleCaptures, isValidMove } from '@/lib/gameLogic';
import { getAiMove } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

const BOARD_SIZE = 9;

export default function GamePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [board, setBoard] = useState<Board>(createEmptyBoard(BOARD_SIZE));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('B');
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [capturedStones, setCapturedStones] = useState({ B: 0, W: 0 });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiGamePhase, setAiGamePhase] = useState<GamePhase>('Unknown');
  const [aiExplanation, setAiExplanation] = useState('');
  const [lastPlayerPass, setLastPlayerPass] = useState(false);
  const [winner, setWinner] = useState<Player | 'Draw' | null>(null);

  const startNewGame = useCallback(() => {
    setBoard(createEmptyBoard(BOARD_SIZE));
    setCurrentPlayer('B');
    setMoveHistory([]);
    setCapturedStones({ B: 0, W: 0 });
    setIsGameOver(false);
    setIsAiThinking(false);
    setAiGamePhase('Fuseki');
    setAiExplanation('A new game begins. Place your stone.');
    setLastPlayerPass(false);
    setWinner(null);
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const handleAiTurn = useCallback(async (currentBoard: Board, history: Move[]) => {
    setIsAiThinking(true);
    setAiExplanation('The AI is contemplating its next move...');
    try {
      const aiResult = await getAiMove(currentBoard, 'W', history, BOARD_SIZE);
      if (aiResult) {
        const { bestMove, explanation, gamePhase } = aiResult;
        
        if (isValidMove(currentBoard, bestMove.row, bestMove.col, 'W', history)) {
          const { newBoard, newCapturedStones } = placeStoneAndHandleCaptures(currentBoard, bestMove.row, bestMove.col, 'W');
          setBoard(newBoard);
          setMoveHistory(prev => [...prev, { ...bestMove, player: 'W' }]);
          setCapturedStones(prev => ({ ...prev, W: prev.W + newCapturedStones }));
          setCurrentPlayer('B');
          setLastPlayerPass(false);
          setAiExplanation(explanation);
          setAiGamePhase(gamePhase as GamePhase);
        } else {
           // AI suggested an invalid move, so it passes.
           toast({ title: 'AI passes its turn.', description: "The AI couldn't find a valid move." });
           handlePassTurn();
        }
      }
    } catch (error) {
      console.error('AI move error:', error);
      toast({ variant: 'destructive', title: 'AI Error', description: 'The AI failed to make a move.' });
      handlePassTurn(); // AI passes on error
    } finally {
      setIsAiThinking(false);
    }
  }, [toast, handlePassTurn]);
  

  const handlePlayerMove = (row: number, col: number) => {
    if (isGameOver || currentPlayer !== 'B' || isAiThinking) return;

    if (!isValidMove(board, row, col, 'B', moveHistory)) {
      toast({ title: 'Invalid Move', description: 'You cannot place a stone there.', variant: 'destructive' });
      return;
    }

    const { newBoard, newCapturedStones } = placeStoneAndHandleCaptures(board, row, col, 'B');
    
    setBoard(newBoard);
    const newMove: Move = { row, col, player: 'B' };
    const newHistory = [...moveHistory, newMove];
    setMoveHistory(newHistory);
    setCapturedStones(prev => ({ ...prev, B: prev.B + newCapturedStones }));
    setCurrentPlayer('W');
    setLastPlayerPass(false);
    
    handleAiTurn(newBoard, newHistory);
  };
  
  const handlePassTurn = useCallback(() => {
    if (isGameOver || isAiThinking) return;

    const nextPlayer = currentPlayer === 'B' ? 'W' : 'B';
    const playerColor = currentPlayer === 'B' ? 'Black' : 'White';

    if (lastPlayerPass) {
        setIsGameOver(true);
        // Simple territory scoring could be added here
        const finalWinner = capturedStones.B > capturedStones.W ? 'B' : 'W';
        setWinner(finalWinner);
        toast({ title: 'Game Over', description: `${playerColor} passed. ${finalWinner === 'B' ? 'Black' : 'White'} wins.` });
    } else {
        setLastPlayerPass(true);
        setCurrentPlayer(nextPlayer);
        toast({ title: 'Player Passes', description: `${playerColor} passed their turn.` });
        if (nextPlayer === 'W') {
            handleAiTurn(board, moveHistory);
        }
    }
  }, [isGameOver, isAiThinking, currentPlayer, lastPlayerPass, capturedStones.B, capturedStones.W, toast, handleAiTurn, board, moveHistory]);

  return (
    <main className="min-h-screen bg-background text-foreground font-body p-4 md:p-6 lg:p-8">
      <div className="container mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col items-center gap-6">
          <GoBoard
            board={board}
            boardSize={BOARD_SIZE}
            onMove={handlePlayerMove}
            disabled={currentPlayer !== 'B' || isAiThinking || isGameOver}
            isAiThinking={isAiThinking}
            moveHistory={moveHistory}
            currentPlayer={currentPlayer}
          />
          <SearchTreeVisualization isThinking={isAiThinking} />
          <GameControls 
            onNewGame={startNewGame}
            onPass={handlePassTurn}
            isGameOver={isGameOver}
            currentPlayer={currentPlayer}
            isAiThinking={isAiThinking}
          />
        </div>
        <div className="lg:col-span-1">
          <GameInfoPanel
            currentPlayer={currentPlayer}
            capturedStones={capturedStones}
            moveHistory={moveHistory}
            aiGamePhase={aiGamePhase}
            aiExplanation={aiExplanation}
            isAiThinking={isAiThinking}
            user={null}
            isGameOver={isGameOver}
            winner={winner}
          />
        </div>
      </div>
    </main>
  );
}
