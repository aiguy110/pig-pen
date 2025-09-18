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
    /// Represents a single dice roll as a tuple of two u32 values
    type roll = tuple<u32, u32>

    /// Game state information passed to strategy functions
    record game-state {
        /// The current player's index in the game (0-based)
        current-player-index: u32,
        
        /// The player's current banked score (locked in from previous turns)
        current-banked-score: u32,
        
        /// The player's current total score (banked + current turn points)
        current-total-score: u32,
        
        /// List of all players' banked scores (including current player)
        /// Index corresponds to player position in the game
        all-players-banked-scores: list<u32>,
        
        /// Complete turn history as (player-index, roll) pairs
        turn-history: list<tuple<u32, roll>>,
    }

    should-roll: func(state: game-state) -> bool
}

world player {
    export strategy
}
```

### Strategy Components
Strategies are implemented as WASM components that:
- Export the `strategy` interface
- Receive a comprehensive game state including:
  - Current player index for position awareness
  - Current banked score (locked in from previous turns)
  - Current total score (including turn points)
  - All players' banked scores with consistent indexing
  - Complete turn history showing all rolls
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
- They receive comprehensive game state including banked scores, total scores, and turn history
- Can distinguish between banked points (safe) and turn points (at risk)
- Access to complete roll history enables pattern analysis and advanced strategies
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

---

# Web API Documentation

The Pig-Pen project now includes a web server with REST API endpoints for uploading bots, running simulations, and retrieving results.

## Starting the Web Server

```bash
cargo run --release
```

The server will start on `http://0.0.0.0:8080`. The CLI mode is still available by passing WASM files as arguments.

## API Endpoints

### Upload Bot
**POST** `/api/bots`

Upload a new bot WASM component.

**Request:** `multipart/form-data`
- `name` (text, required): Name of the bot
- `description` (text, optional): Description of the bot
- `wasm` (binary, required): WASM component file

**Response:**
```json
{
  "id": "uuid",
  "message": "Bot uploaded successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/bots \
  -F "name=My Strategy" \
  -F "description=A smart strategy" \
  -F "wasm=@strategy.wasm"
```

### List Bots
**GET** `/api/bots`

Get a list of all uploaded bots.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Bot Name",
    "description": "Bot description",
    "created_at": "2025-01-01T00:00:00"
  }
]
```

**Example:**
```bash
curl http://localhost:8080/api/bots
```

### Start Simulation
**POST** `/api/simulations`

Start a new simulation between selected bots.

**Request:**
```json
{
  "bot_ids": ["bot-id-1", "bot-id-2"],
  "num_games": 10000
}
```

**Response:**
```json
{
  "simulation_id": "uuid",
  "message": "Simulation queued successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/simulations \
  -H "Content-Type: application/json" \
  -d '{"bot_ids": ["id1", "id2"], "num_games": 10000}'
```

### Get Simulation Status
**GET** `/api/simulations/:id`

Check the status of a simulation.

**Response:**
```json
{
  "id": "uuid",
  "status": "pending|running|completed|failed",
  "num_games": 10000,
  "created_at": "2025-01-01T00:00:00",
  "started_at": "2025-01-01T00:00:01",
  "completed_at": "2025-01-01T00:00:10",
  "error_message": null
}
```

**Example:**
```bash
curl http://localhost:8080/api/simulations/simulation-id
```

### Get Simulation Results
**GET** `/api/simulations/:id/results`

Get detailed results of a completed simulation.

**Response:**
```json
{
  "simulation_id": "uuid",
  "status": "completed",
  "num_games": 10000,
  "results": [
    {
      "bot_id": "uuid",
      "bot_name": "Bot Name",
      "player_index": 0,
      "games_won": 3500,
      "total_money": 25000,
      "average_money_per_game": 2.5
    }
  ],
  "completed_at": "2025-01-01T00:00:10"
}
```

**Example:**
```bash
curl http://localhost:8080/api/simulations/simulation-id/results
```

## Data Persistence

- Bots are stored in the `bots/` directory with their metadata in SQLite
- Duplicate bots (same WASM hash) are detected and not re-uploaded
- Simulation results are persisted in the database
- The database file is `pig-pen.db` in the project root

## Notes

- No authentication is required for any endpoint
- CORS is enabled for all origins
- Maximum of 1,000,000 games per simulation
- Simulations run asynchronously in the background
- The server processes one simulation at a time

---

# Frontend Documentation

## Overview
A React TypeScript application that provides a web interface for the Pig-Pen game simulator. The frontend allows users to upload bot strategies, run simulations, and view results.

## Tech Stack
- React 19 with TypeScript
- Tailwind CSS v3 for styling
- Axios for API communication
- Heroicons for UI icons
- Create React App as the build tool

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── BotUpload.tsx   # Bot upload form
│   │   ├── BotList.tsx     # Display and select bots
│   │   ├── SimulationControl.tsx  # Configure and start simulations
│   │   └── SimulationMonitor.tsx  # Track simulation progress and results
│   ├── services/
│   │   └── api.ts          # API client and TypeScript interfaces
│   ├── App.tsx             # Main application component
│   └── index.css          # Global styles with Tailwind directives
├── public/                 # Static assets
├── tailwind.config.js     # Tailwind CSS configuration
└── package.json           # Dependencies and scripts
```

## Key Features

### Bot Management
- **Upload**: Drag-and-drop or file selection for WASM bot uploads
- **List View**: Display all uploaded bots with metadata
- **Selection**: Multi-select interface for choosing bots for simulations

### Simulation Control
- Configure number of games (1 to 1,000,000)
- Start simulations with selected bots
- Real-time validation and error handling

### Live Monitoring
- Status updates (pending, running, completed, failed)
- Progress tracking with timestamps
- Auto-refresh every 2 seconds during active simulations

### Results Display
- Detailed statistics table with:
  - Games won and win rate percentage
  - Total money won/lost
  - Average money per game
- Winner highlighting
- Sortable by performance metrics

## UI Components

### BotUpload
- Form validation for required fields
- File type restriction to .wasm files
- Success/error messaging
- Auto-refresh bot list on successful upload

### BotList
- Card-based layout for each bot
- Visual selection state with color coding
- Creation timestamp display
- Empty state messaging

### SimulationControl
- Number input with min/max validation
- Disabled state when insufficient bots selected
- Clear feedback on selection requirements

### SimulationMonitor
- Color-coded status badges
- Animated loading states
- Comprehensive results table
- Error message display

## API Integration

### Service Layer (`services/api.ts`)
- Centralized API configuration
- TypeScript interfaces for all data types
- Async/await pattern for all requests
- Error handling with axios interceptors

### Endpoints Used
- `POST /api/bots` - Upload new bots
- `GET /api/bots` - List all bots
- `POST /api/simulations` - Start simulations
- `GET /api/simulations/:id` - Check simulation status
- `GET /api/simulations/:id/results` - Get simulation results

## Styling

### Design System
- **Colors**: Indigo/purple gradient theme
- **Typography**: System font stack
- **Spacing**: Consistent 4px grid system
- **Shadows**: Layered depth for cards
- **Animations**: Pulse for loading states

### Responsive Design
- Mobile-first approach
- Grid system adapts from 1 to 3 columns
- Touch-friendly interaction targets
- Readable font sizes across devices

## Running the Frontend

### Development Mode
```bash
cd frontend
npm install
npm start
```
Opens on http://localhost:3000 with hot reload

### Production Build
```bash
cd frontend
npm run build
```
Creates optimized bundle in `frontend/build/`

### Configuration
- Proxy configured in package.json to forward API calls to backend
- CORS handled by backend server
- No environment variables required for default setup

## Development Notes

### State Management
- Local component state with React hooks
- Lifting state up for shared data (selected bots, current simulation)
- No external state management library needed

### Performance Optimizations
- Conditional rendering to reduce re-renders
- Debounced API calls where appropriate
- Lazy loading for large result sets
- Memoization for expensive computations

### Error Handling
- Try-catch blocks for all async operations
- User-friendly error messages
- Graceful fallbacks for network failures
- Form validation before submission

## Future Enhancements

### Planned Features
- Bot performance history graphs
- Tournament bracket visualization
- Real-time game playback
- Bot code editor with syntax highlighting
- Leaderboard system

### Technical Improvements
- WebSocket for real-time updates
- Service worker for offline support
- Code splitting for faster initial load
- Integration tests with React Testing Library
- Accessibility improvements (ARIA labels, keyboard navigation)
