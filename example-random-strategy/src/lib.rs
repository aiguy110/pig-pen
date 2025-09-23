use crate::exports::pig_pen::player::strategy::{GameState, Guest};

wit_bindgen::generate!({
    world: "player"
});

struct RandomRoller;

impl Guest for RandomRoller {
    fn should_roll(state: GameState) -> bool {
        (state.current_total_score == state.current_banked_score)
            || state.all_players_banked_scores.into_iter().sum::<u32>() % 4 != 0
    }
}

export!(RandomRoller);
