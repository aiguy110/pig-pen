# Pig-Pen

A competitive AI dice game simulator where bot strategies compete in games of Pig. Upload your WASM bot, run simulations, and see how your strategy performs against others!

## Quick Start

### Prerequisites
- Rust toolchain (1.70+)
- Node.js (16+) and npm
- `cargo-component` for building WASM strategies

### Installation & Running

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/pig-pen.git
cd pig-pen
```

2. **Build and serve the frontend:**
```bash
# Build frontend static assets
cd frontend
npm install
npm run build
cd ..

# The build output will be in frontend/build/
```

3. **Run the server:**
```bash
cargo run --release
```

The application will be available at `http://localhost:8080`

## Game Rules

**Pig** is a dice game where players compete to reach the highest score and win money from opponents.

### Gameplay
- Players take turns rolling 2 dice
- During a turn, continue rolling until:
  - **Hold**: Lock in current score
  - **Roll a 7**: Score resets to turn start
  - **Snake eyes (1,1)**: Score resets to 0
  - **Three doubles in a row**: Score resets to 0
  - **Score exactly 100**: Score resets to 0
- **Special rule**: Rolling doubles forces another roll

### Winning
- First player over 100 who holds triggers endgame
- Other players get one final turn to overtake
- Winner collects $1 per point difference from each opponent
- Players at 0 pay double

## Creating Bot Strategies

### Bot Interface

Bots implement a comprehensive decision interface:
```wit
interface strategy {
    should-roll: func(state: game-state) -> bool
}
```
- Returns `true` to roll, `false` to hold
- Receives a game state record containing:
  - `current-player-index`: Your index in the game (0-based)
  - `current-banked-score`: Your locked-in score from previous turns
  - `current-total-score`: Your total including current turn points
  - `all-players-banked-scores`: All players' banked scores (including yours)
  - `turn-history`: Complete history of rolls as (player-index, roll) tuples

### Building a Rust Bot

1. **Create a new component project:**
```bash
cargo component new --lib my-strategy
cd my-strategy
```

2. **Copy the WIT interface:**
```bash
cp -r ../pig-pen/wit .
```

3. **Implement your strategy** in `src/lib.rs`:
```rust
use exports::pig_pen::player::strategy::Guest;

struct Component;

impl Guest for Component {
    fn should_roll(state: GameState) -> bool {
        // Calculate turn points from state
        let turn_points = state.current_total_score - state.current_banked_score;
        
        // Your strategy logic here
        if state.current_total_score >= 100 {
            return false; // Hold at 100+
        }
        
        // Find max opponent score (excluding ourselves)
        let max_opponent = state.all_players_banked_scores
            .iter()
            .enumerate()
            .filter(|(i, _)| *i != state.current_player_index as usize)
            .map(|(_, &score)| score)
            .max()
            .unwrap_or(0);
        
        if state.current_banked_score < max_opponent {
            return turn_points < 25; // Keep rolling when behind
        }
        
        turn_points < 20 // Conservative when ahead
    }
}
```

4. **Build the WASM component:**
```bash
cargo component build --release
```

5. **Upload via the web interface** or use the API

### Example Strategy

See `example-random-strategy/` for a complete example that:
- Always rolls at least once per turn
- Has 75% chance to continue rolling
- Stops at score 100

## Web Interface

The web UI provides:
- **Bot Upload**: Drag-and-drop WASM files
- **Bot Management**: View all uploaded strategies
- **Simulation Control**: Run games between selected bots
- **Live Results**: Real-time progress and detailed statistics

## REST API

### Upload Bot
```bash
curl -X POST http://localhost:8080/api/bots \
  -F "name=My Bot" \
  -F "description=Advanced strategy" \
  -F "wasm=@my-strategy.wasm"
```

### List Bots
```bash
curl http://localhost:8080/api/bots
```

### Run Simulation
```bash
curl -X POST http://localhost:8080/api/simulations \
  -H "Content-Type: application/json" \
  -d '{"bot_ids": ["bot1-id", "bot2-id"], "num_games": 10000}'
```

### Check Results
```bash
curl http://localhost:8080/api/simulations/{simulation-id}/results
```

## Command Line Mode

Run simulations directly from the command line:
```bash
cargo run --release -- strategy1.wasm strategy2.wasm strategy3.wasm
```

This runs 1,000,000 games and outputs statistics for each player.

## Project Structure

```
pig-pen/
├── src/
│   ├── main.rs           # Server and game simulator
│   ├── game.rs          # Game logic
│   └── simulation.rs    # Simulation engine
├── frontend/            # React TypeScript UI
│   ├── src/
│   └── build/          # Static assets (after npm run build)
├── wit/                # WASM component interface
├── bots/              # Uploaded bot storage
├── pig-pen.db         # SQLite database
└── example-random-strategy/  # Example bot
```

## Development

### Frontend Development
```bash
cd frontend
npm start  # Development server on port 3000
```

### Backend Development
```bash
cargo run   # Development mode
cargo test  # Run tests
```

### Building for Production

1. **Build frontend:**
```bash
cd frontend
npm run build
```

2. **Build backend:**
```bash
cargo build --release
```

3. **Run production server:**
```bash
./target/release/pig-pen
```

## Configuration

- **Port**: Server runs on port 8080 (hardcoded)
- **Database**: SQLite database at `./pig-pen.db`
- **Bot Storage**: WASM files in `./bots/`
- **Static Assets**: Served from `./frontend/build/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write your bot strategy or improve the platform
4. Submit a pull request

### Bot Strategy Ideas
- **Conservative**: Hold at low totals
- **Aggressive**: Push for high scores
- **Adaptive**: Adjust based on opponent scores
- **Endgame**: Special logic when opponents near 100
- **Statistical**: Use probability calculations

## Troubleshooting

### Common Issues

**WASM compilation fails:**
- Ensure `cargo-component` is installed
- Check WIT interface matches exactly
- Use `wasm32-wasip1` target

**Frontend build fails:**
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and reinstall

**Server won't start:**
- Check port 8080 is available
- Ensure database has write permissions
- Verify `frontend/build` exists for production

## License

MIT

## Acknowledgments

Built with:
- [Wasmtime](https://wasmtime.dev/) - WebAssembly runtime
- [Axum](https://github.com/tokio-rs/axum) - Web framework
- [React](https://react.dev/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling