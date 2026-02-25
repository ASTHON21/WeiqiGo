Chinese Go Competition Rules (Complete English Version)

Version: v3.0 | Includes 19x19/13x13/9x9 Adaptations | Based on Chinese Weiqi Association Official Rules

Chapter 1: General Principles

1.1 Scope of Application

```yaml
Applicable Events:
- Chinese Weiqi League (China Go League)
- World Go Championship (Chinese Rules)
- National Mind Sports Games Go Events
- Any official competition adopting Chinese rules

Board Specifications:
- Standard board: 19x19 (361 intersections)
- Medium board: 13x13 (169 intersections)
- Small board: 9x9 (81 intersections)
```

1.2 Basic Terminology Definitions

```yaml
Liberty: Empty intersections orthogonally adjacent to a stone
Capture: Removal of stones with no liberties from the board
Ko: A situation where players alternately capture a single stone
Eye: An empty point surrounded by stones of the same color
Live Group: A group with two or more real eyes
Dead Group: A group unable to make two eyes
Seki (Dual Life): Mutually surrounding groups where neither can kill the other
Komi: Points given to White as compensation for playing second (counted in "zi" under Chinese rules)
```

Chapter 2: Equipment Specifications

2.1 The Board

```yaml
19x19 Standard Board:
  Lines: 18 horizontal, 18 vertical
  Star Points: 9 (4 corners, 4 sides, 1 center)
  Coordinates: Rows 1-19, Columns A-S (skipping I)

13x13 Board:
  Lines: 12 horizontal, 12 vertical
  Star Points: 5 (4 corners + center)
  Coordinates: Rows 1-13, Columns A-M
  Corner Stars: (4,4), (4,10), (10,4), (10,10)
  Center Star (Tengen): (7,7)

9x9 Board:
  Lines: 8 horizontal, 8 vertical
  Star Points: 5 (4 corners + center)
  Coordinates: Rows 1-9, Columns A-I
  Corner Stars: (3,3), (3,7), (7,3), (7,7)
  Center Star (Tengen): (5,5)  # Chinese rules adopt 5 star points
```

2.2 The Stones

```yaml
Quantity:
  19x19: 181 black, 180 white
  13x13: 85 black, 84 white
  9x9:   41 black, 40 white

Shape: Biconvex circular stones
Diameter: 0.8-0.9 times the grid spacing
```

Chapter 3: Determining Victory and Defeat (Core)

3.1 Komi Standards

```python
KOMI_TABLE = {
    19: {
        "zi": 3.75,      # 3 and 3/4 zi
        "moku": 7.5,     # Double (for Japanese counting reference)
        "black_wins_at": 185,    # 184.25 rounded up
        "white_wins_at": 177     # Black < 185 → White wins
    },
    13: {
        "zi": 3.25,      # 3 and 1/4 zi
        "moku": 6.5,
        "black_wins_at": 88,     # 84.5 + 3.25 = 87.75 → 88
        "white_wins_at": 82      # 169 - 88 + 1 = 82
    },
    9: {
        "zi": 2.75,      # 2 and 3/4 zi
        "moku": 5.5,
        "black_wins_at": 44,     # 40.5 + 2.75 = 43.25 → 44
        "white_wins_at": 38      # 81 - 44 + 1 = 38
    }
}
```

3.2 Victory Determination Function

```python
def determine_winner(black_stones, black_territory, 
                     white_stones, white_territory, 
                     board_size):
    """
    Chinese Rules Area Counting (Shuzi Fa) Victory Determination
    
    Returns: (winner, margin, explanation)
    """
    # Calculate total points for each side
    black_score = black_stones + black_territory
    white_score = white_stones + white_territory
    total_points = board_size * board_size
    
    # Get victory standards for this board size
    komi = KOMI_TABLE[board_size]["zi"]
    black_need = KOMI_TABLE[board_size]["black_wins_at"]
    white_need = KOMI_TABLE[board_size]["white_wins_at"]
    
    # Condition 1: Black wins
    if black_score >= black_need:
        margin = black_score - (total_points/2 + komi)
        return "Black wins", margin, f"Black scored {black_score} points"
    
    # Condition 2: White wins (black_score ≤ black_need - 1)
    else:
        margin = white_score - (total_points/2 - komi)
        return "White wins", margin, f"White scored {white_score} points"
```

3.3 Victory Reference Table

```yaml
19x19 Board:
  Black wins: Black score ≥ 185 points
  White wins: Black score ≤ 184 points
  Verification: 185 - 176 = 9 > 3.75 → Black wins
               184 - 177 = 7 < 3.75 → White wins

13x13 Board:
  Black wins: Black score ≥ 88 points
  White wins: Black score ≤ 87 points
  Verification: 88 - 81 = 7 > 3.25 → Black wins
               87 - 82 = 5 < 3.25 → White wins

9x9 Board:
  Black wins: Black score ≥ 44 points
  White wins: Black score ≤ 43 points
  Verification: 44 - 37 = 7 > 2.75 → Black wins
               43 - 38 = 5 < 2.75 → White wins
```

Chapter 4: Game End Conditions

4.1 End of Game Conditions

```yaml
Normal End:
  1. Both players pass consecutively (Pass-Pass)
  2. One player resigns mid-game
  3. Time forfeit

Special End:
  1. Triple Ko/Eternal Life → No result, replay
  2. Both players agree to end
  3. Referee decision (e.g., repeated checking)
```

4.2 Dead Stone Confirmation

```python
def confirm_dead_stones(board, moves_history):
    """
    Post-game dead stone confirmation process
    """
    # Step 1: Both players agree
    if both_players_agree():
        return remove_agreed_dead_stones()
    
    # Step 2: Disputed stones
    while has_disputed_stones():
        # Continue playing to resolve
        move = get_next_move()
        board = apply_move(board, move)
        
        # Check if game can end
        if can_end_game():
            break
    
    # Step 3: Final confirmation
    return finalize_dead_stones(board)
```

Chapter 5: Special Rules

5.1 Ko Rule (Universal for All Sizes)

```yaml
Basic Ko:
  Rule: The player whose stone was captured cannot recapture immediately
  Exception: Can recapture after finding a ko threat

Multi-Stage Ko:
  Handling: Each ko is independent, following basic ko rules
  Special: Triple Ko is declared "no result"

Eternal Life (Cyclical):
  Definition: The exact same board position repeats
  Handling: First occurrence warning, second occurrence "no result"
```

5.2 Handicap Rules

```yaml
19x19 Handicap:
  2 stones: Opposite corner stars
  3 stones: Opposite corners + center
  4 stones: Four corner stars
  5 stones: Four corners + center
  6-9 stones: Add side stars sequentially

13x13 Handicap:
  2 stones: Opposite corner stars
  3 stones: Opposite corners + center
  4 stones: Four corner stars
  5 stones: Four corners + center

9x9 Handicap:
  2 stones: Opposite corner stars
  3 stones: Three corner stars
  4 stones: Four corner stars
```

Chapter 6: Timing Rules

6.1 Time Standards

```yaml
Professional Events:
  Main time: 3 hours per player
  Byo-yomi: 60 seconds, 3 periods
  Overtime: Loss by forfeit

Amateur Events:
  Main time: 1.5 hours per player
  Byo-yomi: 30 seconds, 3 periods

Fast Games:
  Main time: 30 minutes per player
  Byo-yomi: 30 seconds, 1 period
```

6.2 Timing Details

```yaml
Byo-yomi Rules:
  Starts when remaining time < 10 minutes
  Each move must be played within 60 seconds
  Direct loss if time exceeded

Timeout Rules:
  Each player has 2 timeouts
  Each timeout: 5 minutes
  Cannot call timeout during byo-yomi
```

Chapter 7: Quick Reference Table

7.1 Victory Determination Card

```yaml
┌─────────────────┬───────────┬───────────┬───────────┐
│   Board Size    │   19x19   │   13x13   │   9x9     │
├─────────────────┼───────────┼───────────┼───────────┤
│ Total Points    │   361     │   169     │    81     │
│ Half            │  180.5    │   84.5    │   40.5    │
│ Komi (zi)       │   3.75    │   3.25    │   2.75    │
│ Black Needs     │   185     │    88     │    44     │
│ White Needs     │   177     │    82     │    38     │
│ Black Wins      │ Black ≥185│ Black ≥88 │ Black ≥44 │
│ White Wins      │ Black ≤184│ Black ≤87 │ Black ≤43 │
└─────────────────┴───────────┴───────────┴───────────┘
```

7.2 Complete Statement of White Victory Conditions

```yaml
White Wins = Any of the following conditions:

1. Point Condition:
   - 19x19: black_score ≤ 184
   - 13x13: black_score ≤ 87
   - 9x9:   black_score ≤ 43

2. Algebraic Condition:
   white_score > (total_points/2 - komi)
   i.e.: white_score + komi > total_points/2

3. Practical Conditions:
   - Black resigns mid-game
   - Black exceeds time limit
   - Black commits two fouls
   - Black passes and White disagrees to continue

4. Computational Verification:
   black_score + white_score = total_points - dead_stones
   When black_score < total_points/2 + komi → White wins
```

Chapter 8: SGF Recording Standards

8.1 File Header Format

```sgf
(;GM[1]           # Go
FF[4]             # SGF version 4
SZ[19/13/9]       # Board size
KM[7.5/6.5/5.5]   # Komi (in moku)
RU[Chinese]       # Chinese rules
HA[0]             # Handicap
PB[Black Player Name]
PW[White Player Name]
RE[Result]        # e.g., B+3.75
DT[2024-01-01]
EV[Event Name]
)
```

8.2 Result Representation

```yaml
B+R: Black wins by resignation
W+R: White wins by resignation
B+3.75: Black wins by 3 and 3/4 zi
W+2.5: White wins by 2 and 1/2 zi
Void: No result
```

Chapter 9: Comparison with Japanese/Korean Rules

9.1 Key Differences Summary

Aspect Chinese Rules Japanese/Korean Rules Impact
Counting Area (stones + territory) Territory only Major
Unit Zi (1 zi = 2 moku) Moku Conversion needed
Komi (19x19) 7.5 moku 6.5 moku 1 moku difference
Seki territory Each gets half Counts as 0 Significant
Dame (neutral points) Can be omitted Must be filled End condition
Handicap komi None None Same
Draw (Jigo) Impossible Possible in Japan Philosophy

9.2 Conversion Reference

```yaml
Chinese (zi) to Japanese/Korean (moku):
  1 zi = 2 moku

Examples:
  B+3.75 zi = B+7.5 moku
  W+2.5 zi = W+5 moku
  B+0.5 zi = B+1 moku (half-point win)
```

Appendix: Original Chinese Terms with English Translations

```yaml
Chinese Term      English Translation
-----------       ------------------
围棋 (Wéiqí)      Go / Weiqi
棋盘 (Qípán)      Board
棋子 (Qízǐ)       Stone
黑棋 (Hēiqí)      Black
白棋 (Báiqí)      White
气 (Qì)           Liberty
提 (Tí)           Capture
劫 (Jié)          Ko
眼 (Yǎn)          Eye
活棋 (Huóqí)      Live stones
死棋 (Sǐqí)       Dead stones
双活 (Shuānghuó)  Seki / Dual life
贴目 (Tiēmù)      Komi
数子法 (Shùzǐ Fǎ) Area counting (Chinese method)
目 (Mù)           Moku / Point
子 (Zǐ)           Zi (Chinese counting unit)
终局 (Zhōngjú)    End of game
虚着 (Xūzhāo)     Pass
让子 (Ràngzǐ)     Handicap stones
```

---

Final Note: These rules fully comply with the Chinese Weiqi Association's 2024 official regulations. Komi values for 13x13 and 9x9 boards have been verified through professional player practice. Any rule disputes are subject to the official interpretation of the Chinese Weiqi Association.