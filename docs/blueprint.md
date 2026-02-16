# **App Name**: Shadow Go

## Core Features:

- Go Board Display: Display a fully interactive Go board using Canvas/WebGL.
- AI Opponent with Alpha-Beta Search: Implement an AI opponent using Alpha-Beta pruning and pattern matching to determine the best move.
- FSM-Based AI Logic: Manage AI logic using a Finite State Machine with distinct phases for Fuseki, Chuban, and Yose.
- Real-time Search Tree Visualization: Dynamically render the AI search tree on the frontend.
- Move History: Store a sequence of moves to be accessed and review.
- Firestore Integration: Use Firestore to store game states and synchronize them across clients with low latency (below 100ms). The moves collection will include an evaluation field for storing win rate estimates for each move.
- Firebase Authentication: Set up login functionality to the Go application. Enable security rules that ensure that players take turns appropriately and can only play within their own games.

## Style Guidelines:

- Primary color: Dark charcoal grey (#333333) to mimic ink.
- Background color: Off-white (#F0EAD6) reminiscent of traditional Japanese paper.
- Accent color: Muted gold (#B8860B) to highlight interactive elements and indicate player turns.
- Body and headline font: 'Literata', serif, for a literary and traditional feel.
- Use simple, elegant icons to represent game actions and options, inspired by traditional Japanese calligraphy.
- Maintain a minimalist design with a focus on the Go board and a clean user interface to avoid distractions.
- Use subtle animations for stone placement and AI search tree updates to provide visual feedback without being intrusive.