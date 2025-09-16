# Pig Dice Game Rules

## Objective
Make as much money as possible by reaching the highest score.

## Gameplay
Each player takes turns rolling 2 dice. During a turn, a player continues until one of these occurs:

1. **Hold**: Player decides to stop and lock in their current score
2. **Roll a 7**: Score resets to whatever it was at the beginning of their turn
3. **Snake eyes (1,1)**: Score resets to 0
4. **Three doubles in a row**: Score resets to 0
5. **Score hits exactly 100**: Score resets to 0

**Special rule**: If a player rolls doubles, they MUST roll again.

## End Game
- Once a player reaches a score greater than 100 and decides to hold, each other player gets one final turn to try to overtake them
- If a player surplants the leader, all players get another turn to try to overtake the new leader
- Game ends when play returns to the player with highest score over 100 without any other player having exceeded that score

## Scoring
At game end, everyone pays the winner $1 for each point behind the winner they are. Players with a score of 0 pay double.

---

# Pig-Pen Project

## Overview
A Rust-based dice game simulator that pits AI strategies against each other in games of Pig. The project uses WebAssembly components to allow strategies to be implemented in any language that supports WASM.

## Project Structure

```
pig-pen/
├── src/
│   └── main.rs              # Main game simulator
├── wit/
│   └── strategy.wit         # WIT interface definition
├── example-random-strategy/ # Example WASM component strategy
│   ├── src/
│   │   └── lib.rs          # Random strategy implementation
│   └── Cargo.toml
├── Cargo.toml              # Main project dependencies
└── strategy*.wasm          # Compiled WASM strategies
```

## Architecture

### Core Simulator (`src/main.rs`)
- Implements the complete Pig game rules
- Loads WASM component strategies dynamically
- Runs simulations and tracks statistics
- Uses `wasmtime` with component model support

### WIT Interface (`wit/strategy.wit`)
```wit
package pig-pen:player@0.1.0

interface strategy {
    should-roll: func(own-score: u32, other-scores: list<u32>) -> bool
}

world player {
    export strategy
}
```

### Strategy Components
Strategies are implemented as WASM components that:
- Export the `strategy` interface
- Receive their current score and opponents' scores
- Return a boolean decision (true = roll, false = hold)

## Building and Running

### Prerequisites
- Rust toolchain with `wasm32-wasip1` target
- `cargo-component` for building WASM components

### Building a Strategy Component
```bash
cd example-random-strategy
cargo component build --release
```

### Running Simulations
```bash
cargo run --release -- ./example-random-strategy/target/wasm32-wasip1/release/random_strategy.wasm [...]
```

The simulator will:
1. Load the specified WASM component files
2. Run 1,000,000 games
3. Report statistics (games won, money won/lost) for each player

## Creating Custom Strategies

### In Rust
1. Create a new cargo component project:
   ```bash
   cargo component new --lib my-strategy
   ```

2. Copy the WIT files:
   ```bash
   cp -r wit/ my-strategy/
   ```

3. Implement the strategy interface in `src/lib.rs`

4. Build the component:
   ```bash
   cargo component build --release
   ```

### In Other Languages
Any language with WASM component support can implement strategies by:
1. Using the WIT interface definition
2. Implementing the `should-roll` function
3. Compiling to a WASM component

## Implementation Details

### Game State Management
- Each player maintains score, turn start score, doubles count, and active status
- Endgame triggers when a player exceeds 100 and decides to hold
- Final turns are tracked to ensure fair play

### Strategy Execution
- Strategies are called before each roll decision
- They receive current game state (own score, all opponents' scores)
- Must return quickly to maintain simulation performance

### Statistics Tracking
- Games won per player
- Net money won/lost based on final scores
- Results averaged over 10,000 games for statistical significance

## Example Strategy
The included `example-random-strategy`:
- Always rolls at least once per turn
- Then has a 75% chance to continue rolling
- Stops if score reaches 100

## Future Enhancements
- Add more sophisticated example strategies
- Support for tournament modes
- Real-time visualization of games
- Strategy performance analytics
- Support for strategies with memory/learning
