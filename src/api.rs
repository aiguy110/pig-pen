use axum::{
    Router,
    extract::{Multipart, Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use std::{path::PathBuf, sync::Arc};
use tokio::{fs, sync::RwLock};
use uuid::Uuid;
use wasmtime::Engine;

use crate::{db, game, simulation::SimulationManager};

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub engine: Arc<Engine>,
    pub bots_dir: PathBuf,
    pub simulation_manager: Arc<RwLock<SimulationManager>>,
}

#[derive(Serialize)]
struct BotResponse {
    id: String,
    name: String,
    description: Option<String>,
    created_at: String,
}

#[derive(Serialize)]
struct UploadBotResponse {
    id: String,
    message: String,
}

#[derive(Deserialize)]
struct StartSimulationRequest {
    bot_ids: Vec<String>,
    num_games: i32,
}

#[derive(Serialize)]
struct StartSimulationResponse {
    simulation_id: String,
    message: String,
}

#[derive(Serialize)]
struct SimulationStatusResponse {
    id: String,
    status: String,
    num_games: i32,
    created_at: String,
    started_at: Option<String>,
    completed_at: Option<String>,
    error_message: Option<String>,
}

#[derive(Serialize)]
struct SimulationResultsResponse {
    simulation_id: String,
    status: String,
    num_games: i32,
    results: Vec<ParticipantResult>,
    completed_at: Option<String>,
}

#[derive(Serialize)]
struct ParticipantResult {
    bot_id: String,
    bot_name: String,
    player_index: i32,
    games_won: i32,
    total_money: i64,
    average_money_per_game: f64,
}

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/bots", post(upload_bot).get(list_bots))
        .route("/simulations", post(start_simulation))
        .route("/simulations/:id", get(get_simulation_status))
        .route("/simulations/:id/results", get(get_simulation_results))
        .with_state(state)
}

async fn upload_bot(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<UploadBotResponse>, StatusCode> {
    let mut name = None;
    let mut description = None;
    let mut wasm_data = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?
    {
        let field_name = field.name().map(String::from);

        match field_name.as_deref() {
            Some("name") => {
                name = Some(field.text().await.map_err(|_| StatusCode::BAD_REQUEST)?);
            }
            Some("description") => {
                description = Some(field.text().await.map_err(|_| StatusCode::BAD_REQUEST)?);
            }
            Some("wasm") => {
                wasm_data = Some(field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?);
            }
            _ => {}
        }
    }

    let name = name.ok_or(StatusCode::BAD_REQUEST)?;
    let wasm_data = wasm_data.ok_or(StatusCode::BAD_REQUEST)?;

    // Validate WASM component
    let _ = game::WasmStrategy::new(&state.engine, &wasm_data)
        .map_err(|_| StatusCode::UNPROCESSABLE_ENTITY)?;

    // Calculate hash
    let mut hasher = Sha256::new();
    hasher.update(&wasm_data);
    let hash = format!("{:x}", hasher.finalize());

    // Check if bot with same hash already exists
    let existing = sqlx::query_as::<_, db::Bot>("SELECT * FROM bots WHERE wasm_hash = ?")
        .bind(&hash)
        .fetch_optional(&state.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some(bot) = existing {
        return Ok(Json(UploadBotResponse {
            id: bot.id,
            message: "Bot with identical WASM already exists".to_string(),
        }));
    }

    // Save WASM file
    let bot_id = Uuid::new_v4().to_string();
    let file_name = format!("{}.wasm", bot_id);
    let file_path = state.bots_dir.join(&file_name);

    fs::write(&file_path, wasm_data)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Save to database
    sqlx::query(
        "INSERT INTO bots (id, name, description, wasm_hash, file_path) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&bot_id)
    .bind(&name)
    .bind(&description)
    .bind(&hash)
    .bind(file_path.to_string_lossy().as_ref())
    .execute(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(UploadBotResponse {
        id: bot_id,
        message: "Bot uploaded successfully".to_string(),
    }))
}

async fn list_bots(State(state): State<AppState>) -> Result<Json<Vec<BotResponse>>, StatusCode> {
    let bots = sqlx::query_as::<_, db::Bot>("SELECT * FROM bots ORDER BY created_at DESC")
        .fetch_all(&state.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<BotResponse> = bots
        .into_iter()
        .map(|bot| BotResponse {
            id: bot.id,
            name: bot.name,
            description: bot.description,
            created_at: bot.created_at,
        })
        .collect();

    Ok(Json(response))
}

async fn start_simulation(
    State(state): State<AppState>,
    Json(request): Json<StartSimulationRequest>,
) -> Result<Json<StartSimulationResponse>, StatusCode> {
    if request.bot_ids.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    if request.num_games <= 0 || request.num_games > 1_000_000 {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Verify all bots exist
    let mut bots = Vec::new();
    for bot_id in &request.bot_ids {
        let bot = sqlx::query_as::<_, db::Bot>("SELECT * FROM bots WHERE id = ?")
            .bind(bot_id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .ok_or(StatusCode::NOT_FOUND)?;

        bots.push(bot);
    }

    let simulation_id = Uuid::new_v4().to_string();

    // Create simulation record
    sqlx::query("INSERT INTO simulations (id, status, num_games) VALUES (?, ?, ?)")
        .bind(&simulation_id)
        .bind("pending")
        .bind(request.num_games)
        .execute(&state.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create participant records
    for (index, bot) in bots.iter().enumerate() {
        sqlx::query(
            "INSERT INTO simulation_participants (simulation_id, bot_id, player_index) VALUES (?, ?, ?)"
        )
        .bind(&simulation_id)
        .bind(&bot.id)
        .bind(index as i32)
        .execute(&state.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Queue simulation for execution
    let mut manager = state.simulation_manager.write().await;
    manager.queue_simulation(simulation_id.clone(), bots, request.num_games);

    Ok(Json(StartSimulationResponse {
        simulation_id,
        message: "Simulation queued successfully".to_string(),
    }))
}

async fn get_simulation_status(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<SimulationStatusResponse>, StatusCode> {
    let simulation = sqlx::query_as::<_, db::Simulation>("SELECT * FROM simulations WHERE id = ?")
        .bind(&id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(SimulationStatusResponse {
        id: simulation.id,
        status: simulation.status,
        num_games: simulation.num_games,
        created_at: simulation.created_at,
        started_at: simulation.started_at,
        completed_at: simulation.completed_at,
        error_message: simulation.error_message,
    }))
}

async fn get_simulation_results(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<SimulationResultsResponse>, StatusCode> {
    let simulation = sqlx::query_as::<_, db::Simulation>("SELECT * FROM simulations WHERE id = ?")
        .bind(&id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let participants = sqlx::query_as::<_, db::SimulationParticipant>(
        "SELECT * FROM simulation_participants WHERE simulation_id = ? ORDER BY player_index",
    )
    .bind(&id)
    .fetch_all(&state.pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut results = Vec::new();
    for participant in participants {
        let bot = sqlx::query_as::<_, db::Bot>("SELECT * FROM bots WHERE id = ?")
            .bind(&participant.bot_id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

        results.push(ParticipantResult {
            bot_id: participant.bot_id,
            bot_name: bot.name,
            player_index: participant.player_index,
            games_won: participant.games_won,
            total_money: participant.total_money,
            average_money_per_game: participant.total_money as f64 / simulation.num_games as f64,
        });
    }

    Ok(Json(SimulationResultsResponse {
        simulation_id: simulation.id,
        status: simulation.status,
        num_games: simulation.num_games,
        results,
        completed_at: simulation.completed_at,
    }))
}
