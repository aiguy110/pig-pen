use anyhow::Result;
use sqlx::SqlitePool;
use std::{collections::VecDeque, sync::Arc};
use tokio::{sync::mpsc, task};
use wasmtime::Engine;

use crate::{db, game};

pub struct SimulationTask {
    pub simulation_id: String,
    pub bots: Vec<db::Bot>,
    pub num_games: u32,
}

pub struct SimulationManager {
    queue: VecDeque<SimulationTask>,
    pool: SqlitePool,
    engine: Arc<Engine>,
    is_running: bool,
    completion_rx: Option<mpsc::UnboundedReceiver<()>>,
}

impl SimulationManager {
    pub fn new(pool: SqlitePool, engine: Arc<Engine>) -> Self {
        SimulationManager {
            queue: VecDeque::new(),
            pool,
            engine,
            is_running: false,
            completion_rx: None,
        }
    }

    pub fn queue_simulation(&mut self, simulation_id: String, bots: Vec<db::Bot>, num_games: u32) {
        println!(
            "[QUEUE] Adding simulation {} to queue (current queue size: {})",
            simulation_id,
            self.queue.len()
        );

        self.queue.push_back(SimulationTask {
            simulation_id,
            bots,
            num_games,
        });

        if !self.is_running {
            self.start_worker();
        }
    }

    fn start_worker(&mut self) {
        println!("start_worker called...");
        if let Some(task) = self.queue.pop_front() {
            self.is_running = true;
            let pool = self.pool.clone();
            let engine = self.engine.clone();

            let (tx, rx) = mpsc::unbounded_channel();
            self.completion_rx = Some(rx);

            task::spawn(async move {
                let _ = run_simulation(task, pool, engine).await;
                let _ = tx.send(());
            });
        } else {
            self.is_running = false;
        }
        println!("start_worker exited.");
    }

    pub async fn check_and_start_next(&mut self) {
        // Check if the current simulation has completed
        if let Some(rx) = &mut self.completion_rx {
            if rx.try_recv().is_ok() {
                println!("[MANAGER] Simulation completed, resetting is_running flag");
                self.is_running = false;
                self.completion_rx = None;
            }
        }

        // Start next simulation if not running and queue has tasks
        if !self.is_running && !self.queue.is_empty() {
            self.start_worker();
        }
    }
}

async fn run_simulation(task: SimulationTask, pool: SqlitePool, engine: Arc<Engine>) -> Result<()> {
    println!(
        "[SIMULATION {}] Starting simulation with {} bots for {} games",
        task.simulation_id,
        task.bots.len(),
        task.num_games
    );

    // Update status to running
    sqlx::query(
        "UPDATE simulations SET status = 'running', started_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .bind(&task.simulation_id)
    .execute(&pool)
    .await?;

    // Clone values before moving task
    let simulation_id = task.simulation_id.clone();
    let num_games = task.num_games;

    // Run the simulation in a blocking task
    let pool_clone = pool.clone();
    let simulation_id_clone = simulation_id.clone();
    let simulation_result = task::spawn_blocking(move || {
        run_simulation_sync(task, engine, pool_clone, simulation_id_clone)
    })
    .await?;

    match simulation_result {
        Ok((results, usage_stats, disqualified, bot_ids)) => {
            println!(
                "[SIMULATION {}] Simulation completed successfully",
                bot_ids.0
            );

            // Log results for each bot
            for (index, (games_won, total_money)) in results.iter().enumerate() {
                let win_rate = (*games_won as f64 / num_games as f64) * 100.0;
                let avg_money = *total_money as f64 / num_games as f64;
                let peak_memory = usage_stats[index];
                let is_disqualified = disqualified[index];

                println!(
                    "[SIMULATION {}] Bot {} (index {}): {} wins ({:.1}%), ${} total (${:.2} avg/game), {} bytes peak memory{}",
                    bot_ids.0,
                    bot_ids.1[index],
                    index,
                    games_won,
                    win_rate,
                    total_money,
                    avg_money,
                    peak_memory,
                    if is_disqualified { " [DISQUALIFIED]" } else { "" }
                );

                sqlx::query(
                    "UPDATE simulation_participants
                     SET games_won = ?, total_money = ?, peak_memory_bytes = ?, disqualified = ?
                     WHERE simulation_id = ? AND bot_id = ? AND player_index = ?",
                )
                .bind(*games_won as i32)
                .bind(*total_money)
                .bind(peak_memory as i64)
                .bind(is_disqualified)
                .bind(&bot_ids.0)
                .bind(&bot_ids.1[index])
                .bind(index as i32)
                .execute(&pool)
                .await?;
            }

            // Update simulation status
            sqlx::query(
                "UPDATE simulations
                 SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                 WHERE id = ?",
            )
            .bind(&bot_ids.0)
            .execute(&pool)
            .await?;

            println!("[SIMULATION {}] Results saved to database", bot_ids.0);
        }
        Err(e) => {
            println!("[SIMULATION {}] Simulation failed: {}", simulation_id, e);

            // Update simulation with error
            sqlx::query(
                "UPDATE simulations
                 SET status = 'failed', error_message = ?, completed_at = CURRENT_TIMESTAMP
                 WHERE id = ?",
            )
            .bind(e.to_string())
            .bind(&simulation_id)
            .execute(&pool)
            .await?;
        }
    }

    Ok(())
}

fn run_simulation_sync(
    task: SimulationTask,
    engine: Arc<Engine>,
    pool: SqlitePool,
    simulation_id: String,
) -> Result<(Vec<(u32, i64)>, Vec<u64>, Vec<bool>, (String, Vec<String>))> {
    let mut strategies = Vec::new();
    let mut bot_ids = Vec::new();

    // Calculate memory limit: 200MB / number of bots
    let memory_limit_mb = 200_u64;
    let memory_limit_per_bot = (memory_limit_mb * 1024 * 1024) / task.bots.len() as u64;

    for bot in &task.bots {
        let wasm_bytes = std::fs::read(&bot.file_path)?;
        let mut strategy = game::WasmStrategy::new(&engine, &wasm_bytes)?;
        strategy.set_memory_limit(memory_limit_per_bot);
        strategies.push(strategy);
        bot_ids.push(bot.id.clone());
    }

    let num_players = strategies.len();
    let mut total_stats = vec![(0u32, 0i64); num_players];
    let mut total_usage_stats: Vec<u64> = vec![0; num_players]; // peak_memory
    let mut permanently_disqualified = vec![false; num_players]; // Track permanently disqualified bots

    // Update progress every 1% of games or every 5000 games, whichever is larger
    let update_interval = std::cmp::max(5000, std::cmp::max(1, task.num_games / 100)) as u32;

    for game_num in 0..task.num_games {
        // Skip running simulation if all but one bot is disqualified
        let active_count = permanently_disqualified.iter().filter(|&&x| !x).count();
        if active_count <= 1 {
            println!("Early termination: only {} active bot(s) remaining", active_count);
            break;
        }

        let (results, usage, disqualified) = game::simulate_game(&mut strategies)?;
        for i in 0..num_players {
            total_stats[i].0 += results[i].0;
            total_stats[i].1 += results[i].1;
            total_usage_stats[i] = std::cmp::max(total_usage_stats[i], usage[i]);

            // If a bot was disqualified in this game, mark it as permanently disqualified
            if disqualified[i] {
                if !permanently_disqualified[i] {
                    println!("Bot {} (index {}) permanently disqualified due to memory limit", task.bots[i].name, i);
                    permanently_disqualified[i] = true;
                }
            }
        }

        // Update progress periodically using blocking database call
        if (game_num + 1) % update_interval == 0 || game_num + 1 == task.num_games {
            let pool_clone = pool.clone();
            let sim_id = simulation_id.clone();
            let games_done = game_num + 1;

            // Use the existing runtime handle instead of creating a new one
            let handle = tokio::runtime::Handle::current();
            handle.block_on(async {
                let _ = sqlx::query("UPDATE simulations SET games_completed = ? WHERE id = ?")
                    .bind(games_done)
                    .bind(&sim_id)
                    .execute(&pool_clone)
                    .await;
            });
        }
    }

    Ok((
        total_stats,
        total_usage_stats,
        permanently_disqualified,
        (task.simulation_id, bot_ids),
    ))
}
