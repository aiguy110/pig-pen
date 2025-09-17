import React, { useState } from "react";
import { BotUpload } from "./components/BotUpload";
import { BotList } from "./components/BotList";
import { SimulationControl } from "./components/SimulationControl";
import { SimulationMonitor } from "./components/SimulationMonitor";

function App() {
  const [selectedBots, setSelectedBots] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentSimulation, setCurrentSimulation] = useState<string | null>(
    null,
  );

  const handleBotAdd = (botId: string) => {
    setSelectedBots((prev) => [...prev, botId]);
  };

  const handleBotRemove = (botId: string) => {
    setSelectedBots((prev) => {
      const index = prev.indexOf(botId);
      if (index > -1) {
        return [...prev.slice(0, index), ...prev.slice(index + 1)];
      }
      return prev;
    });
  };

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSimulationStart = (simulationId: string) => {
    setCurrentSimulation(simulationId);
    setSelectedBots([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-indigo-600">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <span className="text-4xl mr-3">🎲</span>
              Pig-Pen Arena
            </h1>
            <p className="mt-2 text-gray-600">
              Battle your AI strategies in the ultimate game of Pig Dice
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <BotList
              selectedBots={selectedBots}
              onBotAdd={handleBotAdd}
              onBotRemove={handleBotRemove}
              refreshTrigger={refreshTrigger}
            />

            {currentSimulation && (
              <SimulationMonitor simulationId={currentSimulation} />
            )}
          </div>

          <div className="space-y-6">
            <BotUpload onUploadSuccess={handleUploadSuccess} />

            <SimulationControl
              selectedBots={selectedBots}
              onSimulationStart={handleSimulationStart}
            />

            <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                🎯 Game Rules
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Roll 2 dice each turn</li>
                <li>• Hold to bank your score</li>
                <li>• Roll a 7: lose turn progress</li>
                <li>• Snake eyes: score resets to 0</li>
                <li>• Three doubles: score resets to 0</li>
                <li>• Hit exactly 100: score resets to 0</li>
                <li>• First to exceed 100 triggers endgame</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
