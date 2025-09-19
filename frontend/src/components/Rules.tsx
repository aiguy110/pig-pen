import React from "react";

export const Rules: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-indigo-600">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎲 Pig Dice Game Rules
            </h1>
            <p className="text-gray-600">
              Master the rules to build a winning strategy
            </p>
          </div>
        </header>

        <div className="space-y-6">
          <section className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              📎 Objective
            </h2>
            <p className="text-gray-700">
              Make as much money as possible by reaching the highest score. At
              game end, everyone pays the winner $1 for each point behind the
              winner they are. Bots with a score of 0 pay double.
            </p>
          </section>

          <section className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🎮 Gameplay
            </h2>
            <p className="text-gray-700 mb-4">
              Each bot takes turns rolling 2 dice. During a turn, a bot
              continues until one of these occurs:
            </p>
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
              <ol className="space-y-3">
                <li className="flex items-start">
                  <span className="font-bold text-indigo-600 mr-3">1.</span>
                  <div>
                    <span className="font-semibold">Hold:</span> Bot decides to
                    stop and lock in their current score
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-indigo-600 mr-3">2.</span>
                  <div>
                    <span className="font-semibold">Roll a 7:</span> Score
                    resets to whatever it was at the beginning of their turn
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-indigo-600 mr-3">3.</span>
                  <div>
                    <span className="font-semibold">Snake eyes (1,1):</span>{" "}
                    Score resets to 0
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-indigo-600 mr-3">4.</span>
                  <div>
                    <span className="font-semibold">
                      Three doubles in a row:
                    </span>{" "}
                    Score resets to 0
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-indigo-600 mr-3">5.</span>
                  <div>
                    <span className="font-semibold">
                      Score hits exactly 100:
                    </span>{" "}
                    Score resets to 0
                  </div>
                </li>
              </ol>
            </div>
            <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-gray-800">
                <span className="font-bold text-yellow-700">
                  ⚠️ Special rule:
                </span>{" "}
                If a bot rolls doubles, they MUST roll again. (`should-roll`
                will not be called)
              </p>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🏁 End Game
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>
                  Once a bot reaches a score greater than 100 and decides to
                  hold, each other bot gets one final turn to try to overtake
                  them
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>
                  If a bot surplants the leader, all bots get another turn to
                  try to overtake the new leader
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>
                  Game ends when play returns to the bot with highest score over
                  100 without any other bot having exceeded that score
                </span>
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              💰 Scoring & Payouts
            </h2>
            <p className="text-gray-700 mb-4">
              At game end, the payout system works as follows:
            </p>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 space-y-2">
              <p className="text-gray-800">
                <span className="font-semibold">Standard payout:</span> $1 per
                point behind the winner
              </p>
              <p className="text-gray-800">
                <span className="font-semibold">Zero score penalty:</span> Bots
                with score of 0 pay double
              </p>
              <p className="text-gray-600 text-sm mt-3 italic">
                Example: If the winner has 105 points and you have 85 points,
                you pay $20. If you have 0 points, you pay $210 (105 × 2).
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
