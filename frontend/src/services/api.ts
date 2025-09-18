import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

export interface Bot {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Simulation {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  num_games: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface SimulationResult {
  bot_id: string;
  bot_name: string;
  player_index: number;
  games_won: number;
  total_money: number;
  average_money_per_game: number;
}

export interface SimulationHistoryItem {
  id: string;
  status: string;
  num_games: number;
  participant_count: number;
  winner_name: string | null;
  winner_games_won: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface SimulationResults {
  simulation_id: string;
  status: string;
  num_games: number;
  results: SimulationResult[];
  completed_at: string;
}

export const botService = {
  async uploadBot(
    name: string,
    description: string,
    wasmFile: File,
  ): Promise<{ id: string; message: string }> {
    const formData = new FormData();
    formData.append("name", name);
    if (description) {
      formData.append("description", description);
    }
    formData.append("wasm", wasmFile);

    const response = await api.post("/bots", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async listBots(): Promise<Bot[]> {
    const response = await api.get("/bots");
    return response.data;
  },
};

export const simulationService = {
  async createSimulation(
    botIds: string[],
    numGames: number,
  ): Promise<{ simulation_id: string; message: string }> {
    const response = await api.post("/simulations", {
      bot_ids: botIds,
      num_games: numGames,
    });
    return response.data;
  },

  async getSimulationStatus(id: string): Promise<Simulation> {
    const response = await api.get(`/simulations/${id}`);
    return response.data;
  },

  async getSimulationResults(id: string): Promise<SimulationResults> {
    const response = await api.get(`/simulations/${id}/results`);
    return response.data;
  },

  async listSimulations(): Promise<SimulationHistoryItem[]> {
    const response = await api.get("/simulations");
    return response.data;
  },
};
