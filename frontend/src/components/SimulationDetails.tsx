import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import {
  simulationService,
  Simulation,
  SimulationResults,
} from "../services/api";

export const SimulationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const status = await simulationService.getSimulationStatus(id);
        setSimulation(status);

        if (status.status === "completed") {
          const simResults = await simulationService.getSimulationResults(id);
          console.log("Simulation results:", simResults);
          setResults(simResults);
        }
      } catch (err) {
        console.error("Failed to fetch simulation details:", err);
        setError("Failed to load simulation details");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();

    // Auto-refresh if simulation is running
    const interval = setInterval(() => {
      if (
        simulation?.status === "running" ||
        simulation?.status === "pending"
      ) {
        fetchDetails();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [id, simulation?.status]);

  const getStatusIcon = () => {
    if (!simulation) return null;

    switch (simulation.status) {
      case "completed":
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case "running":
        return <ClockIcon className="h-6 w-6 text-blue-500 animate-pulse" />;
      case "failed":
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      default:
        return <ClockIcon className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    if (!simulation) return "bg-gray-100 text-gray-800";

    switch (simulation.status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading && !simulation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <ClockIcon className="h-12 w-12 text-indigo-500 animate-pulse mx-auto mb-4" />
            <p className="text-gray-600">Loading simulation details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <Link
            to="/history"
            className="mt-2 text-red-700 underline hover:text-red-800 inline-block"
          >
            Back to history
          </Link>
        </div>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Simulation not found</p>
          <Link
            to="/history"
            className="mt-2 text-indigo-600 underline hover:text-indigo-700"
          >
            Back to history
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to="/history"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to History
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Simulation Details</h2>
              <p className="text-indigo-100">ID: {simulation.id}</p>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}
              >
                {simulation.status}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Games</p>
              <p className="text-2xl font-bold text-gray-800">
                {simulation.num_games.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Created</p>
              <p className="text-lg font-medium text-gray-800">
                {new Date(simulation.created_at).toLocaleString()}
              </p>
            </div>
            {simulation.completed_at && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-lg font-medium text-gray-800">
                  {new Date(simulation.completed_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {simulation.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600">{simulation.error_message}</p>
            </div>
          )}

          {results && results.results.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <ChartBarIcon className="h-6 w-6 mr-2 text-indigo-600" />
                Results
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Bot
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        Games Won
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        Win Rate
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        Total Money
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        Avg Money/Game
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        Peak Memory
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.results
                      .sort((a, b) => b.total_money - a.total_money)
                      .map((result, index) => (
                        <tr
                          key={result.bot_id}
                          className={
                            index === 0 ? "bg-yellow-50" : "hover:bg-gray-50"
                          }
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-800">
                                #{index + 1}{" "}
                              </span>
                              {index === 0 && (
                                <TrophyIcon className="h-5 w-5 text-yellow-500 mr-2" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {result.bot_name}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {result.games_won.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {(
                              (result.games_won / simulation.num_games) *
                              100
                            ).toFixed(1)}
                            %
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={
                                result.total_money >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {result.total_money > 0 ? "+" : "- "}$
                              {Math.abs(result.total_money).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={
                                result.average_money_per_game >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {result.average_money_per_game >= 0 ? "+" : "-"}$
                              {Math.abs(result.average_money_per_game).toFixed(
                                2,
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {result.peak_memory_bytes
                              ? `${(result.peak_memory_bytes / 1024).toFixed(2)} KB`
                              : ""}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {simulation.status === "running" && (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-blue-500 animate-pulse mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Simulation is currently running...
              </p>

              {/* Progress bar */}
              <div className="max-w-md mx-auto mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>
                    {simulation.games_completed.toLocaleString()} /{" "}
                    {simulation.num_games.toLocaleString()} games
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${(simulation.games_completed / simulation.num_games) * 100}%`,
                    }}
                  >
                    <div className="h-full bg-white bg-opacity-30 animate-pulse"></div>
                  </div>
                </div>
                <div className="text-center mt-2 text-sm font-medium text-gray-700">
                  {(
                    (simulation.games_completed / simulation.num_games) *
                    100
                  ).toFixed(1)}
                  % complete
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-2">
                This page will auto-refresh every 2 seconds
              </p>
            </div>
          )}

          {simulation.status === "pending" && (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Simulation is queued and will start soon...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
