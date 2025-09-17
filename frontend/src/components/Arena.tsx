import React, { useState } from "react";
import { BotUpload } from "./BotUpload";
import { BotList } from "./BotList";
import { SimulationControl } from "./SimulationControl";
import { SimulationMonitor } from "./SimulationMonitor";

export const Arena: React.FC = () => {
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
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-indigo-600">
          <h2 className="text-2xl font-bold text-gray-900">Battle Arena</h2>
          <p className="mt-2 text-gray-600">
            Upload bots and run simulations to find the ultimate Pig Dice
            champion
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
        </div>
      </div>
    </div>
  );
};
