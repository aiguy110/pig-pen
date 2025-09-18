import React, { useState } from "react";

export const BotDocumentation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"rust" | "python">("rust");

  const witInterface = `package pig-pen:player@0.1.0;

/// Interface for a Pig game strategy
interface strategy {
    /// Represents a single dice roll as a tuple of two u32 values
    type roll = tuple<u32, u32>;

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
        /// player-index indicates which player made the roll
        /// roll is a tuple of the two dice values
        turn-history: list<tuple<u32, roll>>,
    }

    /// Decides whether to roll the dice given the current game state
    ///
    /// Parameters:
    /// - state: Complete game state information
    ///
    /// Returns: true to roll, false to hold
    should-roll: func(state: game-state) -> bool;
}

/// World defining what a player component needs to export
world player {
    export strategy;
}`;

  const rustInstructions = `# Rust Bot Creation Guide

## Prerequisites
- Rust toolchain with \`wasm32-wasip1\` target
- \`cargo-component\` tool

## Installation
\`\`\`bash
# Install cargo-component
cargo install cargo-component

# Add WASM target
rustup target add wasm32-wasip1
\`\`\`

## Step 1: Create a new component project
\`\`\`bash
cargo component new --lib my-strategy
cd my-strategy
\`\`\`

## Step 2: Add the WIT file
Create \`wit/strategy.wit\` with the interface definition shown above.

## Step 3: Update Cargo.toml
\`\`\`toml
[package]
name = "my-strategy"
version = "0.1.0"
edition = "2021"

[dependencies]
wit-bindgen = "0.16"

[lib]
crate-type = ["cdylib"]

[package.metadata.component]
package = "pig-pen:player"
\`\`\`

## Step 4: Implement your strategy
\`\`\`rust
// src/lib.rs
wit_bindgen::generate!({
    world: "player",
    path: "./wit"
});

struct MyStrategy;

impl Guest for MyStrategy {
    fn should_roll(state: GameState) -> bool {
        // Your strategy logic here
        // Access banked vs current total scores
        let turn_points = state.current_total_score - state.current_banked_score;

        if state.current_total_score >= 100 {
            return false; // Hold if we've reached 100
        }

        // Find max opponent score (excluding ourselves)
        let max_opponent = state.all_players_banked_scores
            .iter()
            .enumerate()
            .filter(|(i, _)| *i != state.current_player_index as usize)
            .map(|(_, &score)| score)
            .max()
            .unwrap_or(0);

        if state.current_banked_score < max_opponent {
            // More aggressive when behind
            return turn_points < 25;
        }

        // Conservative when ahead, hold at 20 points
        turn_points < 20
    }
}

export!(MyStrategy);
\`\`\`

## Step 5: Build your component
\`\`\`bash
cargo component build --release
\`\`\`

Your WASM component will be at:
\`target/wasm32-wasip1/release/my_strategy.wasm\``;

  const pythonInstructions = `# Python Bot Creation Guide

## Prerequisites
- Python 3.10 or later
- \`componentize-py\` tool

## Installation
\`\`\`bash
# Install componentize-py
pip install componentize-py
\`\`\`

## Step 1: Create project structure
\`\`\`bash
mkdir my-python-strategy
cd my-python-strategy
\`\`\`

## Step 2: Add the WIT file
Create \`wit/strategy.wit\` with the interface definition shown above.

## Step 3: Create your strategy implementation
\`\`\`python
# app.py
from strategy import exports
from strategy.exports import Strategy
from strategy.types import Ok

class MyStrategy(Strategy):
    def should_roll(self, state) -> bool:
        """
        Implement your strategy logic here

        Args:
            state: GameState object containing:
                - current_player_index: Your index in the game (0-based)
                - current_banked_score: Your banked score
                - current_total_score: Your total including turn points
                - all_players_banked_scores: List of all players' banked scores
                - turn_history: List of (player_index, (die1, die2)) tuples

        Returns:
            True to roll, False to hold
        """
        # Calculate turn points
        turn_points = state.current_total_score - state.current_banked_score

        # Hold if we've reached 100
        if state.current_total_score >= 100:
            return False

        # Find max opponent score (excluding ourselves)
        opponents_scores = [score for i, score in enumerate(state.all_players_banked_scores)
                           if i != state.current_player_index]
        max_opponent = max(opponents_scores) if opponents_scores else 0

        if state.current_banked_score < max_opponent:
            # Keep rolling until 25 points when behind
            return turn_points < 25

        # Conservative strategy when ahead - hold at 20
        return turn_points < 20
\`\`\`

## Step 4: Generate bindings
\`\`\`bash
componentize-py bindings wit/ --world player --out-dir strategy
\`\`\`

## Step 5: Build the WASM component
\`\`\`bash
componentize-py componentize \\
    --wit-path wit/strategy.wit \\
    --world player \\
    --output my_strategy.wasm \\
    app
\`\`\`

Your WASM component will be: \`my_strategy.wasm\`

## Tips for Python
- Keep imports minimal for smaller WASM size
- Use simple data structures
- Test locally before building
- Consider using type hints for clarity`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Build Your Own Bot
            </h1>
            <p className="text-lg text-gray-600">
              Create AI strategies that compete in Pig Dice using WebAssembly
              components
            </p>
          </header>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              WebAssembly Interface (WIT)
            </h2>
            <p className="text-gray-600 mb-4">
              All bots must implement this interface to participate in the
              arena:
            </p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{witInterface}</code>
            </pre>
            <p className="text-sm text-gray-600 mt-4">
              Learn more about the WebAssembly Component Model:{" "}
              <a
                href="https://component-model.bytecodealliance.org/introduction.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 underline"
              >
                component-model.bytecodealliance.org
              </a>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg">
            <div className="border-b border-gray-200">
              <div className="flex space-x-1 p-2">
                <button
                  onClick={() => setActiveTab("rust")}
                  className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
                    activeTab === "rust"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Rust
                </button>
                <button
                  onClick={() => setActiveTab("python")}
                  className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
                    activeTab === "python"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Python
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="prose prose-lg max-w-none">
                <div
                  dangerouslySetInnerHTML={{
                    __html: convertMarkdownToHtml(
                      activeTab === "rust"
                        ? rustInstructions
                        : pythonInstructions,
                    ),
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function convertMarkdownToHtml(markdown: string): string {
  // First, extract and preserve code blocks with placeholders
  const codeBlocks: string[] = [];
  let html = markdown.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (match, lang, code) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push(
        `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4"><code>${escapeHtml(code.trim())}</code></pre>`,
      );
      return placeholder;
    },
  );

  // Now process the rest of the markdown
  html = html
    // Headers (only process lines that don't start with __CODE_BLOCK_)
    .replace(
      /^### (.*$)/gim,
      '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>',
    )
    .replace(
      /^## (.*$)/gim,
      '<h2 class="text-xl font-semibold mt-8 mb-3">$1</h2>',
    )
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
    // Inline code
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 px-2 py-1 rounded text-sm">$1</code>',
    )
    // Lists
    .replace(/^\* (.*$)/gim, '<li class="ml-4">• $1</li>')
    .replace(/^- (.*$)/gim, '<li class="ml-4">• $1</li>')
    // Strong
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="mb-4">');

  // Wrap in paragraph tags
  html = '<p class="mb-4">' + html + "</p>";

  // Wrap consecutive li elements in ul
  html = html.replace(/(<li.*?<\/li>\s*)+/g, (match) => {
    return `<ul class="space-y-1 my-2">${match}</ul>`;
  });

  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    html = html.replace(`<p class="mb-4">__CODE_BLOCK_${index}__</p>`, block);
    html = html.replace(`__CODE_BLOCK_${index}__`, block);
  });

  // Clean up empty paragraphs
  html = html.replace(/<p class="mb-4">\s*<\/p>/g, "");

  return html;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
