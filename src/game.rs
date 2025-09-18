use anyhow::{Context, Result};
use rand::Rng;
use rand::seq::SliceRandom;
use std::fs;
use wasmtime::component::*;
use wasmtime::{Config, Engine, Store};

// Generate bindings for the WIT world
wasmtime::component::bindgen!({
    path: "wit",
    world: "player",
});

// Import the GameState type from the generated bindings
use crate::game::exports::pig_pen::player::strategy::GameState;

#[derive(Debug, Clone)]
pub struct PlayerState {
    pub score: u32,
    pub banked_score: u32, // Score locked in from previous turns
    pub turn_start_score: u32,
    pub doubles_count: u32,
}

// Type alias for dice roll
pub type DiceRoll = (u32, u32);

// Type alias for turn history entry (player_index, roll)
pub type TurnHistoryEntry = (u32, DiceRoll);

fn roll_dice() -> DiceRoll {
    let mut rng = rand::rng();
    (rng.random_range(1..=6), rng.random_range(1..=6))
}

pub struct WasmStrategy {
    store: Store<()>,
    player: Player,
}

impl WasmStrategy {
    pub fn new(engine: &Engine, wasm_bytes: &[u8]) -> Result<Self> {
        let mut store = Store::new(&engine, ());

        let component = Component::from_binary(&engine, &wasm_bytes)
            .context("Failed to compile WASM component")?;

        let linker = Linker::new(&engine);

        let player = match Player::instantiate(&mut store, &component, &linker) {
            Ok(player) => player,
            Err(e) => {
                println!("Error instantiating player: {:?}", e);
                return Err(e).context("Failed to instantiate WASM component");
            }
        };

        Ok(WasmStrategy { store, player })
    }

    pub fn from_file(engine: &Engine, wasm_path: &str) -> Result<Self> {
        let wasm_bytes = fs::read(wasm_path)
            .with_context(|| format!("Failed to read WASM file: {}", wasm_path))?;
        Self::new(engine, &wasm_bytes)
    }

    fn should_roll(&mut self, state: GameState) -> Result<bool> {
        self.player
            .pig_pen_player_strategy()
            .call_should_roll(&mut self.store, &state)
            .context("Failed to call should_roll function")
    }
}

pub fn simulate_turn(
    player_state: &mut PlayerState,
    all_banked_scores: &Vec<u32>,
    player_index: usize,
    strategy: &mut WasmStrategy,
    turn_history: &mut Vec<TurnHistoryEntry>,
) -> Result<u32> {
    player_state.turn_start_score = player_state.score;
    player_state.doubles_count = 0;
    let mut must_roll = true;
    let mut _turn_points = 0u32;

    loop {
        // Create game state for strategy
        let game_state = GameState {
            current_player_index: player_index as u32,
            current_banked_score: player_state.banked_score,
            current_total_score: player_state.score,
            all_players_banked_scores: all_banked_scores.clone(),
            turn_history: turn_history.clone(),
        };

        if !must_roll && !strategy.should_roll(game_state)? {
            // Player decides to hold, bank the turn points
            player_state.banked_score = player_state.score;
            break;
        }

        let roll = roll_dice();
        let (die1, die2) = roll;
        let sum = die1 + die2;

        // Record this roll in history
        turn_history.push((player_index as u32, roll));

        if die1 == 1 && die2 == 1 {
            // Snake eyes - score resets to 0
            player_state.score = 0;
            player_state.banked_score = 0;
            player_state.doubles_count = 0;
            break;
        }

        if sum == 7 {
            // Roll a 7 - score resets to turn start (banked score)
            player_state.score = player_state.turn_start_score;
            player_state.doubles_count = 0;
            break;
        }

        if die1 == die2 {
            player_state.doubles_count += 1;
            if player_state.doubles_count >= 3 {
                // Three doubles - score resets to 0
                player_state.score = 0;
                player_state.banked_score = 0;
                player_state.doubles_count = 0;
                break;
            }
            must_roll = true;
        } else {
            player_state.doubles_count = 0;
            must_roll = false;
        }

        player_state.score += sum;
        _turn_points += sum;

        if player_state.score == 100 {
            // Hit exactly 100 - score resets to 0
            player_state.score = 0;
            player_state.banked_score = 0;
            player_state.doubles_count = 0;
            break;
        }

        if player_state.score > 100 {
            // Over 100 - bank the score if holding
            player_state.banked_score = player_state.score;
            break;
        }
    }

    Ok(player_state.score)
}

pub fn simulate_game(strategies: &mut Vec<WasmStrategy>) -> Result<Vec<(u32, i64)>> {
    let num_players = strategies.len();
    let mut players: Vec<PlayerState> = vec![
        PlayerState {
            score: 0,
            banked_score: 0,
            turn_start_score: 0,
            doubles_count: 0,
        };
        num_players
    ];

    // Track complete turn history for the game
    let mut turn_history: Vec<TurnHistoryEntry> = Vec::new();

    // Create a randomized player order
    let mut player_order: Vec<usize> = (0..num_players).collect();
    let mut rng = rand::rng();
    player_order.shuffle(&mut rng);

    let mut current_player_index = 0;
    let mut leader_score = 0;
    let mut leader_index = 0;
    let mut endgame_started = false;
    let mut players_had_final_turn = vec![false; num_players];

    loop {
        let current_player = player_order[current_player_index];
        let all_banked_scores: Vec<u32> = players.iter().map(|p| p.banked_score).collect();

        simulate_turn(
            &mut players[current_player],
            &all_banked_scores,
            current_player,
            &mut strategies[current_player],
            &mut turn_history,
        )?;

        if !endgame_started && players[current_player].score > 100 {
            endgame_started = true;
            leader_score = players[current_player].score;
            leader_index = current_player;
            players_had_final_turn = vec![false; num_players];
            players_had_final_turn[current_player] = true;
        } else if endgame_started {
            players_had_final_turn[current_player] = true;

            if players[current_player].score > leader_score {
                // New leader emerged - reset final turn tracking for all players
                leader_score = players[current_player].score;
                leader_index = current_player;
                players_had_final_turn = vec![false; num_players];
                players_had_final_turn[current_player] = true;
            }

            // Check if all players have had their turn to catch the current leader
            let all_had_turn = players_had_final_turn.iter().all(|&had_turn| had_turn);
            if all_had_turn {
                // Game ends when everyone has had a chance to catch the current leader
                break;
            }
        }

        current_player_index = (current_player_index + 1) % num_players;
    }

    let winner_index = leader_index;
    let winner_score = players[winner_index].score;

    let mut results = vec![(0u32, 0i64); num_players];
    results[winner_index].0 = 1;

    for i in 0..num_players {
        if i == winner_index {
            for j in 0..num_players {
                if j != i {
                    let diff = winner_score - players[j].score;
                    let payment = if players[j].score == 0 {
                        (diff * 2) as i64
                    } else {
                        diff as i64
                    };
                    results[i].1 += payment;
                }
            }
        } else {
            let diff = winner_score - players[i].score;
            let payment = if players[i].score == 0 {
                (diff * 2) as i64
            } else {
                diff as i64
            };
            results[i].1 -= payment;
        }
    }

    Ok(results)
}

pub fn create_engine() -> Result<Engine> {
    let mut config = Config::new();
    config.wasm_component_model(true);
    Ok(Engine::new(&config)?)
}
