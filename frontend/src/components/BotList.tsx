import React, { useState, useEffect } from "react";
import { CpuChipIcon, ClockIcon } from "@heroicons/react/24/outline";
import { botService, Bot } from "../services/api";

interface BotListProps {
  selectedBots: string[];
  onBotAdd: (botId: string) => void;
  onBotRemove: (botId: string) => void;
  refreshTrigger: number;
}

export const BotList: React.FC<BotListProps> = ({
  selectedBots,
  onBotAdd,
  onBotRemove,
  refreshTrigger,
}) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBots = async () => {
    try {
      setLoading(true);
      const data = await botService.listBots();
      setBots(data);
      setError(null);
    } catch (err) {
      setError("Failed to load bots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBots();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Available Bots
      </h2>

      {bots.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No bots uploaded yet. Upload your first bot to get started!
        </p>
      ) : (
        <div className="space-y-3">
          {bots.map((bot) => {
            const count = selectedBots.filter((id) => id === bot.id).length;
            return (
              <div
                key={bot.id}
                className={`border rounded-lg p-4 transition-all ${
                  count > 0
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <CpuChipIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <h3 className="text-sm font-medium text-gray-900">
                        {bot.name}
                      </h3>
                      {count > 0 && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          {count}x Selected
                        </span>
                      )}
                    </div>
                    {bot.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {bot.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center text-xs text-gray-400">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {new Date(bot.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onBotRemove(bot.id)}
                      className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={count === 0}
                    >
                      -
                    </button>
                    <span className="text-sm font-medium text-gray-700 w-8 text-center">
                      {count}
                    </span>
                    <button
                      onClick={() => onBotAdd(bot.id)}
                      className="px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {bots.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Select 2 or more bot instances to run a simulation. You can add
          multiple instances of the same bot.
        </div>
      )}
    </div>
  );
};
