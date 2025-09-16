use rand::Rng;

#[derive(Debug, Clone)]
struct PlayerState {
    score: u32,
    turn_start_score: u32,
    doubles_count: u32,
    is_active: bool,
}

fn roll_dice() -> (u32, u32) {
    let mut rng = rand::rng();
    (rng.random_range(1..=6), rng.random_range(1..=6))
}

fn simulate_turn<F>(
    player_state: &mut PlayerState,
    all_scores: &Vec<u32>,
    player_index: usize,
    strategy: &F,
) -> u32
where
    F: Fn(u32, Vec<u32>) -> bool,
{
    player_state.turn_start_score = player_state.score;
    player_state.doubles_count = 0;
    let mut must_roll = true;

    loop {
        let other_scores: Vec<u32> = all_scores
            .iter()
            .enumerate()
            .filter(|(i, _)| *i != player_index)
            .map(|(_, &s)| s)
            .collect();

        if !must_roll && !strategy(player_state.score, other_scores) {
            break;
        }

        let (die1, die2) = roll_dice();
        let sum = die1 + die2;

        if die1 == 1 && die2 == 1 {
            player_state.score = 0;
            player_state.doubles_count = 0;
            break;
        }

        if sum == 7 {
            player_state.score = player_state.turn_start_score;
            player_state.doubles_count = 0;
            break;
        }

        if die1 == die2 {
            player_state.doubles_count += 1;
            if player_state.doubles_count >= 3 {
                player_state.score = 0;
                player_state.doubles_count = 0;
                break;
            }
            must_roll = true;
        } else {
            player_state.doubles_count = 0;
            must_roll = false;
        }

        player_state.score += sum;

        if player_state.score == 100 {
            player_state.score = 0;
            player_state.doubles_count = 0;
            break;
        }

        if player_state.score > 100 {
            break;
        }
    }

    player_state.score
}

fn simulate_game<F>(strategies: &Vec<F>) -> Vec<(u32, i64)>
where
    F: Fn(u32, Vec<u32>) -> bool,
{
    let num_players = strategies.len();
    let mut players: Vec<PlayerState> = vec![
        PlayerState {
            score: 0,
            turn_start_score: 0,
            doubles_count: 0,
            is_active: true,
        };
        num_players
    ];

    let mut current_player = 0;
    let mut leader_score = 0;
    let mut leader_index = 0;
    let mut endgame_started = false;
    let mut players_had_final_turn = vec![false; num_players];

    loop {
        if !players[current_player].is_active {
            current_player = (current_player + 1) % num_players;

            let active_count = players.iter().filter(|p| p.is_active).count();
            if active_count <= 1 {
                break;
            }
            continue;
        }

        let all_scores: Vec<u32> = players.iter().map(|p| p.score).collect();
        simulate_turn(
            &mut players[current_player],
            &all_scores,
            current_player,
            &strategies[current_player],
        );

        if !endgame_started && players[current_player].score > 100 {
            endgame_started = true;
            leader_score = players[current_player].score;
            leader_index = current_player;
            players_had_final_turn = vec![false; num_players];
            players_had_final_turn[current_player] = true;
        } else if endgame_started {
            players_had_final_turn[current_player] = true;

            if players[current_player].score > leader_score {
                for i in 0..num_players {
                    if i != current_player && players[i].score <= leader_score {
                        players[i].is_active = false;
                    }
                }
                leader_score = players[current_player].score;
                leader_index = current_player;
                players_had_final_turn = vec![false; num_players];
                players_had_final_turn[current_player] = true;
            } else if players[current_player].score <= leader_score {
                players[current_player].is_active = false;
            }

            let all_had_turn = (0..num_players)
                .filter(|&i| players[i].is_active)
                .all(|i| players_had_final_turn[i]);

            if all_had_turn {
                for i in 0..num_players {
                    if i != leader_index && players[i].is_active && players[i].score <= leader_score
                    {
                        players[i].is_active = false;
                    }
                }
            }
        }

        current_player = (current_player + 1) % num_players;

        let active_count = players.iter().filter(|p| p.is_active).count();
        if active_count <= 1 {
            break;
        }
    }

    let winner_index = players
        .iter()
        .position(|p| p.is_active)
        .unwrap_or(leader_index);
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

    results
}

fn random_strategy(_own_score: u32, _other_scores: Vec<u32>) -> bool {
    static mut ROLL_COUNT: u32 = 0;
    unsafe {
        ROLL_COUNT += 1;
        if ROLL_COUNT == 1 {
            ROLL_COUNT = 0;
            return true;
        }
        ROLL_COUNT = 0;
    }

    let mut rng = rand::rng();
    rng.random_bool(0.75)
}

fn main() {
    let num_players = 4;
    let num_games = 10000;

    let strategies: Vec<Box<dyn Fn(u32, Vec<u32>) -> bool>> = (0..num_players)
        .map(|_| Box::new(random_strategy) as Box<dyn Fn(u32, Vec<u32>) -> bool>)
        .collect();

    let mut total_stats = vec![(0u32, 0i64); num_players];

    for game_num in 0..num_games {
        if game_num % 1000 == 0 {
            println!("Running game {}...", game_num);
        }

        let results = simulate_game(&strategies);
        for i in 0..num_players {
            total_stats[i].0 += results[i].0;
            total_stats[i].1 += results[i].1;
        }
    }

    println!("\n=== Final Statistics after {} games ===", num_games);
    for (i, (wins, money)) in total_stats.iter().enumerate() {
        println!("Player {}: {} wins, ${} net", i + 1, wins, money);
    }
}
