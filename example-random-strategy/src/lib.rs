#[allow(warnings)]
mod bindings;

use bindings::exports::pig_pen::player::strategy::Guest;

struct Component;

static mut ROLL_COUNT: u32 = 0;
static mut SEED: u32 = 12345;

fn simple_random() -> bool {
    unsafe {
        SEED = SEED.wrapping_mul(1664525).wrapping_add(1013904223);
        (SEED >> 16) % 100 < 75
    }
}

impl Guest for Component {
    fn should_roll(own_score: u32, _other_scores: Vec<u32>) -> bool {
        unsafe {
            ROLL_COUNT += 1;
            if ROLL_COUNT == 1 {
                return true;
            }
            ROLL_COUNT = 0;
        }

        if own_score >= 100 {
            return false;
        }

        simple_random()
    }
}

bindings::export!(Component with_types_in bindings);
