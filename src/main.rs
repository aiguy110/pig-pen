use anyhow::Result;
use axum::Router;
use clap::{Parser, Subcommand};
use pig_pen::{api, db, game, simulation::SimulationManager};
use std::{path::PathBuf, sync::Arc};
use tokio::{fs, net::TcpListener, sync::RwLock};
use tower_http::{cors::CorsLayer, services::ServeDir};

#[derive(Parser)]
#[command(name = "pig-pen")]
#[command(about = "A competitive AI dice game simulator")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,

    /// Port to run the web server on
    #[arg(short, long, default_value = "8080")]
    port: u16,
}

#[derive(Subcommand)]
enum Commands {
    /// Run simulation with WASM strategies
    Simulate {
        /// WASM strategy files to load
        #[arg(required = true)]
        strategies: Vec<PathBuf>,

        /// Number of games to simulate
        #[arg(short = 'n', long, default_value = "1000000")]
        games: usize,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let cli = Cli::parse();

    // If simulate command is used, run CLI mode
    if let Some(Commands::Simulate { strategies, games }) = cli.command {
        return run_cli_mode(strategies, games).await;
    }

    // Web server mode
    println!("Starting Pig Pen web server...");

    // Create bots directory if it doesn't exist
    let bots_dir = PathBuf::from("bots");
    fs::create_dir_all(&bots_dir).await?;

    // Initialize database
    let pool = db::create_pool().await?;

    // Create WASM engine
    let engine = Arc::new(game::create_engine()?);

    // Create simulation manager
    let simulation_manager = Arc::new(RwLock::new(SimulationManager::new(
        pool.clone(),
        engine.clone(),
    )));

    // Start background task to process simulation queue
    let manager_clone = simulation_manager.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            let mut manager = manager_clone.write().await;
            manager.check_and_start_next().await;
        }
    });

    // Create app state
    let state = api::AppState {
        pool,
        engine,
        bots_dir,
        simulation_manager,
    };

    // Create router with static file serving
    // API routes are registered first under /api prefix and take precedence
    // All other routes fall back to serving static files from frontend/build
    let api_routes = api::create_router(state);

    let app = Router::new()
        .nest("/api", api_routes)
        .fallback_service(ServeDir::new("frontend/build"))
        .layer(CorsLayer::permissive());

    // Start server
    let addr = format!("0.0.0.0:{}", cli.port);
    let listener = TcpListener::bind(&addr).await?;
    println!("Server running on http://{}", addr);
    println!("Serving static files from frontend/build/");

    axum::serve(listener, app).await?;

    Ok(())
}

// CLI mode for simulations
async fn run_cli_mode(strategy_files: Vec<PathBuf>, num_games: usize) -> Result<()> {
    let engine = game::create_engine()?;

    println!(
        "Loading {} WASM component strategies...",
        strategy_files.len()
    );
    let mut strategies: Vec<game::WasmStrategy> = Vec::new();
    for path in &strategy_files {
        println!("Loading strategy from: {}", path.display());
        strategies.push(game::WasmStrategy::from_file(
            &engine,
            path.to_str().unwrap(),
        )?);
    }

    let num_players = strategies.len();

    println!(
        "Running {} games with {} players...\n",
        num_games, num_players
    );

    let mut total_stats = vec![(0u32, 0i64); num_players];

    for game_num in 0..num_games {
        if game_num % 10_000 == 0 || game_num == num_games - 1 {
            let progress = (game_num as f64 / num_games as f64 * 100.0) as u32;
            let bar_width = 50;
            let filled = (progress as usize * bar_width) / 100;
            let bar = "=".repeat(filled) + &"-".repeat(bar_width - filled);
            print!(
                "\rProgress: [{bar}] {progress:3}% ({}/{} games)",
                game_num, num_games
            );
            use std::io::Write;
            std::io::stdout().flush().unwrap();
        }

        let (results, _) = game::simulate_game(&mut strategies)?;
        for i in 0..num_players {
            total_stats[i].0 += results[i].0;
            total_stats[i].1 += results[i].1;
        }
    }
    println!();

    println!("\n=== Final Statistics after {} games ===", num_games);
    for (i, (wins, money)) in total_stats.iter().enumerate() {
        let filename = strategy_files[i]
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");
        println!(
            "Player {} ({}): {} wins, ${:.2} average winnings",
            i + 1,
            filename,
            wins,
            *money as f64 / num_games as f64
        );
    }

    Ok(())
}
