import React, { useState } from "react";
import { PlayIcon } from "@heroicons/react/24/solid";
import { simulationService } from "../services/api";

interface SimulationControlProps {
  selectedBots: string[];
  onSimulationStart: (simulationId: string) => void;
}

export const SimulationControl: React.FC<SimulationControlProps> = ({
  selectedBots,
  onSimulationStart,
}) => {
  const [numGames, setNumGames] = useState(10000);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  const handleStart = async () => {
    if (selectedBots.length < 2) {
      setError("Please select at least 2 bots");
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const response = await simulationService.createSimulation(
        selectedBots,
        numGames,
      );
      onSimulationStart(response.simulation_id);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to start simulation");
    } finally {
      setStarting(false);
    }
  };

  const handleNumGamesChange = (value: number) => {
    setNumGames(value);
    setLimitWarning(null);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Simulation Settings
      </h2>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="numGames"
            className="block text-sm font-medium text-gray-700"
          >
            Number of Games
          </label>
          <input
            type="number"
            id="numGames"
            min="1"
            max="1000000"
            value={numGames}
            onChange={(e) =>
              handleNumGamesChange(parseInt(e.target.value) || 1)
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
          <p className="mt-1 text-sm text-gray-500">
            Run between 1 and 1,000,000 games
          </p>
          {limitWarning && (
            <div className="mt-2 rounded-md bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">{limitWarning}</p>
            </div>
          )}
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">
            Selected Bots
          </div>
          {selectedBots.length === 0 ? (
            <p className="text-sm text-gray-500">No bots selected</p>
          ) : (
            <div className="text-sm text-gray-900">
              {selectedBots.length} bot{selectedBots.length !== 1 ? "s" : ""}{" "}
              selected
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={starting || selectedBots.length < 2}
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
        >
          <PlayIcon className="h-5 w-5 mr-2" />
          {starting ? "Starting..." : "Start Simulation"}
        </button>
      </div>
    </div>
  );
};
