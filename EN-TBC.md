Japanese & Korean Go Rules (Complete English Version)

Version: v2.1 | For Go Players | Based on Nihon Ki-in & Korea Baduk Association Official Rules

📋 Part One: Overview of Japanese & Korean Rules

1.1 What Are Japanese-Korean Rules?

The Japanese and Korean rules are fundamentally the same system, often called "territory counting." Unlike Chinese rules which count both stones and territory, Japanese-Korean rules only count empty points you surround.

```yaml
Core Principle:
  Your score = (Empty points you surround) - (Your stones captured by opponent)

Key Point: Stones on the board don't count directly—only the empty territory they enclose matters.
```

1.2 Which Tournaments Use These Rules?

Japanese Rules (Nihon Ki-in):

· The Seven Major Title Matches (Kisei, Meijin, Honinbo, Judan, Tengen, Oza, Gosei)
· All Japan-based professional tournaments

Korean Rules (Korea Baduk Association):

· Korean Baduk League
· LG Cup, Samsung Fire Cup (international)
· GS Caltex Cup, KBS Baduk King
· All domestic Korean tournaments

🎯 Part Two: Basic Game Rules

2.1 Equipment

```yaml
Board:
  Standard: 19×19 lines (361 intersections)
  Players take turns placing stones

Stones:
  Black: 181 pieces
  White: 180 pieces
  Play starts with Black
```

2.2 How Stones Live or Die

```yaml
Liberties (Breathing Points):
  - Every stone needs empty points directly adjacent (up, down, left, right)
  - Diagonal connections don't count as liberties
  - Connected stones share liberties

Capture:
  When a stone or group has zero liberties → removed from board immediately
  Removed stones become "prisoners"

Forbidden Moves:
  1. Suicide (placing a stone with no liberties that doesn't capture)
  2. Ko (explained in section 2.4)
  3. Playing on an occupied intersection
```

🔄 Part Three: The Ko Rule

3.1 Basic Ko Explained

```yaml
What is Ko?
  A situation where Black and White could keep capturing a single stone back and forth forever

The Rule:
  ⚠️ YOU CANNOT IMMEDIATELY RECAPTURE A KO ⚠️
  
  Example:
    1. Black captures a white stone
    2. White CANNOT recapture that same stone right away
    3. White must play elsewhere first (a "ko threat")
    4. If Black responds elsewhere, White can now recapture
```

3.2 Special Ko Situations

```yaml
Multi-Stage Ko:
  - Multiple kos on the board at once
  - Each ko follows the same rule independently
  - Can lead to complex fighting

Triple Ko:
  - Three kos creating a repeating cycle
  - Japanese/Korean rules: "No result" → game replayed

Eternal Life:
  - Very rare repeating position
  - Also declared "no result"
```

🏠 Part Four: Life, Death, and Eyes

4.1 What Makes a Group Alive?

```yaml
Two Eyes = Life:
  A group needs two separate empty spaces inside that the opponent cannot fill

Why two eyes?
  - Opponent can't fill one eye because it's suicide
  - Opponent can't fill both at once
  - Therefore the group can never be captured

Real Eyes vs. Fake Eyes:
  Real eye: All four diagonal points are controlled (or adjusted for edges)
  Fake eye: Missing diagonal control → opponent can eventually capture
```

4.2 Seki (Mutual Life / Dual Life)

```yaml
What is Seki?
  A situation where two opposing groups share liberties and neither can kill the other

Characteristics:
  - Groups are adjacent
  - Shared empty points between them
  - Whoever plays first in the shared area loses their group
  - Therefore both remain alive at game end

Important: In Japanese/Korean rules, the shared empty points in Seki count for NOBODY
```

4.3 Dead Stones

```yaml
At game end:
  - Players agree which groups are dead
  - Dead stones are removed and treated as prisoners
  - Disputed groups are played out to determine life/death

Key Point: You don't need to actually capture dead groups—just agree they're dead
```

🧮 Part Five: Scoring Method (Territory Counting)

5.1 How to Count Your Score

```yaml
STEP-BY-STEP PROCESS:

1. END THE GAME
   Both players pass consecutively → game stops

2. AGREE ON DEAD STONES
   Point to groups you think are dead
   Remove agreed dead stones (they become prisoners)

3. FILL THE TERRITORY
   Take your captured prisoners
   Use them to fill your opponent's territory

4. COUNT EMPTY POINTS
   Count all remaining empty points in your territory
   This is your final score

5. APPLY KOMI
   Add 6.5 points to White's score
   Compare totals
```

5.2 Example Calculation

```yaml
Position after game:

Black's territory: 45 empty points
White's territory: 40 empty points

Prisoners:
  Black captured: 3 white stones
  White captured: 2 black stones

Filling:
  Black uses White's 3 prisoners → fill 3 points of White's territory
  White uses Black's 2 prisoners → fill 2 points of Black's territory

Final territory:
  Black: 45 - 2 = 43 points
  White: 40 - 3 = 37 points

Add komi: White 37 + 6.5 = 43.5

Result: White wins by 0.5 point
```

5.3 Visual Guide to Counting

```text
Before Filling:
┌─────────────────────┐
│  B B B . . W W W    │
│  B . B . . W . W    │
│  B B B . . W W W    │
│  . . . . . . . .    │
└─────────────────────┘
B territory: 4 points
W territory: 5 points
B prisoners: 2
W prisoners: 1

After Filling:
┌─────────────────────┐
│  B B B X . W W W    │  X = filled with prisoner
│  B . B X . W X W    │
│  B B B . . W W W    │
│  . . . . . . . .    │
└─────────────────────┘
B final: 4 - 1 = 3
W final: 5 - 2 = 3
Plus komi: W 3 + 6.5 = 9.5
```

📏 Part Six: Komi (Compensation for White)

6.1 Standard Komi Values

```yaml
19×19 Board:
  Komi: 6.5 points
  Why 0.5? → Ensures no draws (jigo) in most tournaments
  Exception: Japanese rules technically allow draws, but 6.5 makes them extremely rare

13×13 Board:
  Official: 6.5 points (same as 19×19)
  Note: Some amateur tournaments adjust to 5.5, but professional events keep 6.5

9×9 Board:
  Official: 6.5 points (controversial but standard)
  Debate: Many players think 5.5 is fairer for small boards
```

6.2 Why Komi Exists

```yaml
Black's Advantage:
  - Black moves first
  - Studies show first move worth about 6-7 points
  - Komi balances this advantage

Historical Note:
  - Old games: No komi (Black was stronger)
  - Modern: 5.5 → 6.5 (as Black's opening got better understood)
  - Future: Could increase if AI shows Black's advantage is larger
```

🏁 Part Seven: Ending the Game

7.1 How to End

```yaml
Normal Ending:
  1. Player A passes
  2. Player B passes
  3. Both agree game is finished

Important: In Japanese/Korean rules, you MUST play all dame (neutral points) before passing
  - Dame = empty points between groups that belong to nobody
  - They don't affect score but must be filled
  - Exception: If both players agree to skip, they can pass earlier

After Two Passes:
  - Enter counting phase
  - Confirm dead stones
  - Count territory
```

7.2 Disputes During Counting

```yaml
If players disagree about dead stones:
  1. Resume play from that position
  2. Continue until the status is clear
  3. Then recount

Note: The player who disputed plays first in resumption
      (This is a penalty for disagreeing)
```

🇰🇷 Part Eight: Korean Rule Special Notes

8.1 Stone Lid Rule (2026 Update)

```yaml
What's Changing:
  Starting July 2026, Korean rules require:

  "Players must place captured stones on their stone lid"
  (The lid of the container holding your stones)

Penalties:
  First violation: "Attention" (verbal warning)
  Second violation: "Warning" + 1 point penalty
  More violations: Referee discretion

Why this rule?
  - Prevents players from mixing up captured stones
  - Makes counting easier and fairer
  - Avoids disputes about how many stones were captured
```

8.2 No Draws in Korean Rules

```yaml
Key Difference from Japan:
  Korean rules DO NOT ALLOW DRAWS
  The 0.5 in komi ensures one player always wins
  Triple ko still results in "no result" (game replayed)
```

📊 Part Nine: Quick Reference

9.1 Rules Summary Card

```yaml
┌─────────────────────────────────────────────────┐
│           JAPANESE/KOREAN RULES CHEAT SHEET     │
├─────────────────────────────────────────────────┤
│                                                  │
│  📍 SCORING: Territory + Prisoners              │
│     Your score = Your empty territory           │
│                 - Your stones captured          │
│                                                  │
│  🎯 KOMI: 6.5 points to White                   │
│                                                  │
│  ⚔️  SEKI: Shared points count for NOBODY        │
│                                                  │
│  🏁 ENDING: Both pass after all dame filled     │
│                                                  │
│  🔄 KO: Cannot recapture immediately            │
│                                                  │
│  💀 DEAD STONES: Must agree before counting     │
│                                                  │
├─────────────────────────────────────────────────┤
│  BOARD SIZES: 19×19 (standard)                  │
│               13×13 (training/quick games)      │
│               9×9   (beginners/ultra-fast)      │
└─────────────────────────────────────────────────┘
```

9.2 Common Mistakes to Avoid

```yaml
MISTAKE 1: Counting stones on the board
  ❌ "I have 50 stones so I'm winning"
  ✅ "I have 30 points of territory after filling prisoners"

MISTAKE 2: Forgetting to fill dame
  ❌ Passing early and missing neutral points
  ✅ Play all neutral points before passing

MISTAKE 3: Not counting Seki correctly
  ❌ Claiming points in shared Seki area
  ✅ Seki points belong to nobody

MISTAKE 4: Ko confusion
  ❌ Immediately recapturing
  ✅ Play elsewhere first, then come back

MISTAKE 5: Forgetting prisoners when counting
  ❌ Just counting territory
  ✅ Territory - opponent's prisoners = final score
```

🌏 Part Ten: Japanese vs Korean Rules Comparison

Aspect Japanese Rules Korean Rules Practical Difference?
Basic counting Territory Territory None
Komi 6.5 6.5 None
Draw allowed? Yes (theoretically) No Extremely rare anyway
Stone lid rule No Yes (from 2026) Physical behavior only
Triple ko No result No result Same
Rulebook style Philosophical Procedural Doesn't affect play

Bottom Line: For players, Japanese and Korean rules are functionally identical. The only difference is how strictly they're enforced (Koreans are more specific about procedures).

🎓 Part Eleven: Tips for Players

11.1 If You Learned Chinese Rules First

```yaml
Key adjustments when switching to Japanese/Korean rules:

1. COUNTING IS DIFFERENT
   Chinese: Stones on board + territory = score
   Japanese: Only territory - prisoners = score
  
   Example same position:
     Chinese: Black 185 → Black wins
     Japanese: Black 43 points after filling → +6.5 komi → White wins

2. DAME MUST BE FILLED
   Chinese: Can stop before dame
   Japanese: Must fill all neutral points

3. SEKI HANDLING
   Chinese: Seki points count half each
   Japanese: Seki points count 0
```

11.2 Proverb for Remembering

```
"In Chinese rules, every stone counts.
 In Japanese rules, only the empty space you control counts.
 In both, the winner is the one who uses stones most efficiently."
```

---

Final Note: Whether you play in Tokyo or Seoul, the rules feel the same. The Korean stone lid rule (2026) is the first significant divergence in decades, but it only affects how you handle captured stones—not how you play the game itself. Enjoy your game!