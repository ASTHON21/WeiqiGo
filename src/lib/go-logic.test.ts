
import { processMove, createEmptyBoard } from './go-logic';
import type { BoardState } from './types';

// Helper to print the board to the console for visual inspection
function printBoard(board: BoardState) {
  console.log('  ' + Array.from({ length: board.length }, (_, i) => String.fromCharCode('A'.charCodeAt(0) + i)).join(' '));
  board.forEach((row, i) => {
    const rowNum = (board.length - i).toString().padStart(2, ' ');
    console.log(rowNum + ' ' + row.map(cell => {
      if (cell === 'black') return 'X';
      if (cell === 'white') return 'O';
      return '.';
    }).join(' '));
  });
  console.log('\n');
}

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error('❌ ASSERTION FAILED: ' + message);
        // In a real test runner, we would throw an error.
        // For a simple script, we just log and continue.
        return false;
    }
    return true;
}


function runTests() {
  console.log('--- Running Go Logic Tests ---');
  let failures = 0;

  // Test 1: Single stone capture
  (() => {
    const testName = 'Test 1: Single stone capture';
    console.log(testName);
    let board = createEmptyBoard(9);
    let history = [board];
    
    // Setup
    let res = processMove(board, 0, 1, 'white', history); board = res.newBoard; history.push(board);
    res = processMove(board, 0, 0, 'black', history); board = res.newBoard; history.push(board);
    res = processMove(board, 1, 1, 'black', history); board = res.newBoard; history.push(board);

    console.log('Board before capture:');
    printBoard(board);

    // Capturing move
    const finalMove = processMove(board, 0, 2, 'black', history);

    console.log('Board after capture:');
    printBoard(finalMove.newBoard);

    if (
        assert(finalMove.success, `${testName} - Move should be successful`) &&
        assert(finalMove.newBoard[0][1] === null, `${testName} - Captured stone should be removed.`) &&
        assert(finalMove.capturedStones === 1, `${testName} - Captured stones count should be 1.`)
    ) {
      console.log(`✅ PASSED: ${testName}`);
    } else {
        failures++;
    }
  })();

  // Test 2: Group capture
  (() => {
    const testName = '\nTest 2: Group capture';
    console.log(testName);
    let board = createEmptyBoard(5);
    let history = [board];
    const moves = [
        {r:0,c:1,p:'white'}, {r:0,c:2,p:'white'},
        {r:1,c:0,p:'black'}, {r:1,c:3,p:'black'}, {r:2,c:1,p:'black'}, {r:2,c:2,p:'black'},
    ];
    for(const move of moves) {
        const res = processMove(board, move.r, move.c, move.p, history);
        board = res.newBoard;
        history.push(board);
    }
    
    console.log('Board before capture:');
    printBoard(board);

    // Capturing move
    const finalMove = processMove(board, 1, 1, 'black', history);

    console.log('Board after capture:');
    printBoard(finalMove.newBoard);

    if (
        assert(finalMove.success, `${testName} - Move should be successful`) &&
        assert(finalMove.newBoard[0][1] === null, `${testName} - Captured stone 1 should be removed.`) &&
        assert(finalMove.newBoard[0][2] === null, `${testName} - Captured stone 2 should be removed.`) &&
        assert(finalMove.capturedStones === 2, `${testName} - Captured stones count should be 2.`)
    ) {
        console.log(`✅ PASSED: ${testName}`);
    } else {
        failures++;
    }
  })();
  
  // Test 3: Suicide move should be invalid
  (() => {
    const testName = '\nTest 3: Suicide move';
    console.log(testName);
    let board = createEmptyBoard(5);
    let history = [board];

    const moves = [ {r:0,c:1,p:'black'}, {r:1,c:0,p:'black'}, {r:1,c:2,p:'black'}, {r:2,c:1,p:'black'} ];
    for(const move of moves) {
        const res = processMove(board, move.r, move.c, move.p, history);
        board = res.newBoard;
        history.push(board);
    }
    
    console.log('Board setup for suicide test:');
    printBoard(board);
    
    const suicideMove = processMove(board, 1, 1, 'white', history);

    if (
        assert(!suicideMove.success, `${testName} - Move should not be successful`) &&
        assert(suicideMove.error === 'suicide', `${testName} - Error should be 'suicide'.`)
    ) {
      console.log(`✅ PASSED: ${testName} correctly identified as invalid.`);
    } else {
        failures++;
    }
  })();

  // Test 4: Ko rule
  (() => {
    const testName = '\nTest 4: Ko rule';
    console.log(testName);
    let board = createEmptyBoard(5);
    let history: BoardState[] = [board];

    const moves = [
        {r:0,c:1,p:'black'}, {r:0,c:2,p:'white'},
        {r:1,c:0,p:'black'}, {r:1,c:3,p:'white'},
        {r:2,c:1,p:'black'}, {r:2,c:2,p:'white'},
        {r:1,c:2,p:'black'},
    ];
    for(const move of moves) {
        const res = processMove(board, move.r, move.c, move.p, history);
        board = res.newBoard;
        history.push(board);
    }
    
    // White captures black stone at (1,2) by playing at (1,1)
    const whiteCaptures = processMove(board, 1, 1, 'white', history);
    board = whiteCaptures.newBoard;
    history.push(board);

    console.log('Board after white captures (Ko situation created):');
    printBoard(board);
    assert(whiteCaptures.capturedStones === 1, `${testName} - White should capture 1 stone.`);
        
    // Now, black attempts to immediately recapture at (1,2)
    const blackRecaptures = processMove(board, 1, 2, 'black', history);

    if (
        assert(!blackRecaptures.success, `${testName} - Recapture should not be successful`) &&
        assert(blackRecaptures.error === 'ko', `${testName} - Error should be 'ko'.`)
    ) {
        console.log(`✅ PASSED: ${testName} violation correctly identified.`);
    } else {
        failures++;
    }
  })();

  console.log(`\n--- Test Summary ---`);
  if (failures === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.error(`🚨 ${failures} test(s) failed.`);
  }

}

// To run this test:
// 1. Make sure you have ts-node installed ('npm install -g ts-node')
// 2. Run 'ts-node src/lib/go-logic.test.ts' from your project root.
runTests();
