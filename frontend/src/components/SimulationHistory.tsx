import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { simulationService, SimulationHistoryItem } from "../services/api";
import {
  ClockIcon,
  TrophyIcon,
  UserGroupIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const SimulationHistory: React.FC = () => {
  const [simulations, setSimulations] = useState<SimulationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSimulations();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchSimulations, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSimulations = async () => {
    try {
      const data = await simulationService.listSimulations();
      setSimulations(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch simulations:", err);
      setError("Failed to load simulation history");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "running":
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case "failed":
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case "completed":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "running":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "failed":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDuration = (started: string | null, completed: string | null) => {
    if (!started || !completed) return null;
    const start = new Date(started).getTime();
    const end = new Date(completed).getTime();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  if (loading && simulations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading simulation history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchSimulations}
          className="mt-2 text-red-700 underline hover:text-red-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (simulations.length === 0) {
    return (
      <div className="text-center py-12">
        <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">No simulations yet</p>
        <p className="text-gray-500 text-sm mt-2">
          Start a simulation to see it appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Simulation History</h2>
        <button
          onClick={fetchSimulations}
          className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden shadow">
          <thead className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Created
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Players
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">Games</th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Winner
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {simulations.map((sim) => (
              <tr key={sim.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(sim.status)}
                    <span className={getStatusBadge(sim.status)}>
                      {sim.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatDate(sim.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <UserGroupIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-800">
                      {sim.participant_count}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-800">
                  {sim.num_games.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {sim.winner_name ? (
                    <div className="flex items-center gap-1">
                      <TrophyIcon className="h-4 w-4 text-yellow-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          {sim.winner_name}
                        </div>
                        {sim.winner_games_won && (
                          <div className="text-xs text-gray-500">
                            {sim.winner_games_won} wins
                          </div>
                        )}
                      </div>
                    </div>
                  ) : sim.status === "failed" && sim.error_message ? (
                    <span className="text-sm text-red-600">
                      {sim.error_message}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {getDuration(sim.started_at, sim.completed_at) || "—"}
                </td>
                <td className="px-4 py-3">
                  {sim.status === "completed" ? (
                    <Link
                      to={`/simulations/${sim.id}`}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      View Results
                    </Link>
                  ) : sim.status === "running" ? (
                    <Link
                      to={`/simulations/${sim.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Monitor
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SimulationHistory;
