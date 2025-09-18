#![no_std]

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[allow(warnings)]
mod bindings;

use bindings::exports::pig_pen::player::strategy::{GameState, Guest};
use core::panic::PanicInfo;

struct Component;

static mut SEED: u32 = 12345;

fn simple_random() -> bool {
    unsafe {
        SEED = SEED.wrapping_mul(1664525).wrapping_add(1013904223);
        (SEED >> 16) % 100 < 75
    }
}

impl Guest for Component {
    fn should_roll(state: GameState) -> bool {
        let current_turn_rolls = state
            .turn_history
            .iter()
            .rev()
            .take_while(|(player_index, _)| *player_index == state.current_player_index)
            .count();

        if state.current_total_score >= 100 {
            return false;
        }

        if current_turn_rolls == 0 {
            return true;
        }

        simple_random()
    }
}

bindings::export!(Component with_types_in bindings);

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}
