import React, { useState, useEffect } from "react";
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  simulationService,
  Simulation,
  SimulationResults,
} from "../services/api";

interface SimulationMonitorProps {
  simulationId: string | null;
}

export const SimulationMonitor: React.FC<SimulationMonitorProps> = ({
  simulationId,
}) => {
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!simulationId) {
      setSimulation(null);
      setResults(null);
      return;
    }

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const status =
          await simulationService.getSimulationStatus(simulationId);
        setSimulation(status);

        if (status.status === "completed") {
          const simResults =
            await simulationService.getSimulationResults(simulationId);
          setResults(simResults);
        }
      } catch (err) {
        console.error("Failed to fetch simulation status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    const interval = setInterval(() => {
      if (
        simulation?.status === "pending" ||
        simulation?.status === "running"
      ) {
        fetchStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [simulationId, simulation?.status]);

  if (!simulationId) {
    return null;
  }

  if (loading && !simulation) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!simulation) {
    return null;
  }

  const getStatusIcon = () => {
    switch (simulation.status) {
      case "pending":
      case "running":
        return <ClockIcon className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case "completed":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (simulation.status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Simulation Status
        </h2>
        <div className="flex items-center">
          {getStatusIcon()}
          <span
            className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}
          >
            {simulation.status.charAt(0).toUpperCase() +
              simulation.status.slice(1)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm">
          <span className="text-gray-500">Games:</span>
          <span className="ml-2 font-medium text-gray-900">
            {simulation.num_games.toLocaleString()}
          </span>
        </div>

        <div className="text-sm">
          <span className="text-gray-500">Created:</span>
          <span className="ml-2 font-medium text-gray-900">
            {new Date(simulation.created_at).toLocaleString()}
          </span>
        </div>

        {simulation.started_at && (
          <div className="text-sm">
            <span className="text-gray-500">Started:</span>
            <span className="ml-2 font-medium text-gray-900">
              {new Date(simulation.started_at).toLocaleString()}
            </span>
          </div>
        )}

        {simulation.completed_at && (
          <div className="text-sm">
            <span className="text-gray-500">Completed:</span>
            <span className="ml-2 font-medium text-gray-900">
              {new Date(simulation.completed_at).toLocaleString()}
            </span>
          </div>
        )}

        {simulation.error_message && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{simulation.error_message}</p>
          </div>
        )}

        {simulation.status === "running" && (
          <div className="mt-4">
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>
                {simulation.games_completed.toLocaleString()} /{" "}
                {simulation.num_games.toLocaleString()} games
              </span>
              <span>
                {(
                  (simulation.games_completed / simulation.num_games) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-indigo-600 h-2 rounded-full"
                style={{
                  width: `${
                    (simulation.games_completed / simulation.num_games) * 100
                  }%`,
                }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {results && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Results
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bot Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Games Won
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Money
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Money/Game
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  // Find the winner among non-disqualified bots
                  const eligibleResults = results.results.filter(
                    (r) => !r.disqualified,
                  );
                  const winnerMoney =
                    eligibleResults.length > 0
                      ? Math.max(...eligibleResults.map((r) => r.total_money))
                      : 0;

                  return results.results
                    .sort((a, b) => {
                      // Sort disqualified bots to the bottom
                      if (a.disqualified && !b.disqualified) return 1;
                      if (!a.disqualified && b.disqualified) return -1;
                      // For bots with same qualification status, sort by total money
                      return b.total_money - a.total_money;
                    })
                    .map((result, index) => {
                      const isWinner =
                        !result.disqualified &&
                        result.total_money === winnerMoney;

                      return (
                        <tr
                          key={result.bot_id}
                          className={isWinner ? "bg-yellow-50" : ""}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {result.bot_name}
                            {result.disqualified ? (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Disqualified (mem limit exceeded)
                              </span>
                            ) : isWinner ? (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Winner
                              </span>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.games_won.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(
                              (result.games_won / results.num_games) *
                              100
                            ).toFixed(1)}
                            %
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${result.total_money.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${result.average_money_per_game.toFixed(2)}
                          </td>
                        </tr>
                      );
                    });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
