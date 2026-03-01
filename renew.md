​"Hey Gemini. Our GoLogic structure is solid. To make the referee 'world-class,' we need to upgrade a few specific internal methods. Please perform the following logic injections:
​1. Refine isSameBoard (Performance Optimization):
Instead of a double for-loop, implement a Zobrist Hashing-like string check or use Uint8Array flattening for faster Ko (Repetition) detection.
​2. Upgrade checkSekiSimple (Logic Accuracy):
Current logic only checks if a group has a liberty to be 'Seki.' This is too simple. Please update it to:
​A group is in Seki if it has 0 liberties but is adjacent to an opponent group that also has 0 liberties, and both are connected to the same 'shared' empty points (Dame) that neither can fill without being captured.
​3. Correct findEnclosedArea (Owner Logic):
​Currently, if a territory touches both black and white stones, you mark it as seki.
​Refinement: In Chinese Rules, if an area touches both colors, it is Dame (Neutral). In Japanese Rules, it is Seki (No points). Please ensure that if owners.size > 1, the territory points are returned but flagged specifically so ChineseScoring can ignore them entirely.
​4. Handle 'Dead Stones' before Scoring:
Add a method GoLogic.removeDeadStones(board). Since we don't have a Neural Network, implement a 'Two-Eye' heuristic:
​Any group that cannot form two separate eyes (enclosed internal liberties) or connect to a living group after 2 consecutive 'Pass' moves should be flagged as dead and cleared from the board before calculateChineseScore is called.
​Please rewrite the findEnclosedArea and checkSekiSimple methods specifically to be more robust against these Go edge cases."