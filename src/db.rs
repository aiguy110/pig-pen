use anyhow::Result;
use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Bot {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub wasm_hash: String,
    pub file_path: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Simulation {
    pub id: String,
    pub status: String,
    pub num_games: u32,
    pub games_completed: u32,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SimulationParticipant {
    pub simulation_id: String,
    pub bot_id: String,
    pub player_index: i32,
    pub games_won: i32,
    pub total_money: i64,
}

pub async fn create_pool() -> Result<SqlitePool> {
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect("sqlite:pig-pen.db?mode=rwc")
        .await?;

    // Run migrations manually
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS bots (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            wasm_hash TEXT NOT NULL UNIQUE,
            file_path TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS simulations (
            id TEXT PRIMARY KEY,
            status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
            num_games INTEGER NOT NULL,
            games_completed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            started_at DATETIME,
            completed_at DATETIME,
            error_message TEXT
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Add games_completed column if it doesn't exist (migration for existing databases)
    let _ = sqlx::query("ALTER TABLE simulations ADD COLUMN games_completed INTEGER DEFAULT 0")
        .execute(&pool)
        .await;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS simulation_participants (
            simulation_id TEXT NOT NULL,
            bot_id TEXT NOT NULL,
            player_index INTEGER NOT NULL,
            games_won INTEGER DEFAULT 0,
            total_money INTEGER DEFAULT 0,
            PRIMARY KEY (simulation_id, bot_id, player_index),
            FOREIGN KEY (simulation_id) REFERENCES simulations(id),
            FOREIGN KEY (bot_id) REFERENCES bots(id)
        )
        "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}
