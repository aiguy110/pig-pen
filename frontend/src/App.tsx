import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { Arena } from "./components/Arena";
import { BotDocumentation } from "./components/BotDocumentation";
import { Rules } from "./components/Rules";
import SimulationHistory from "./components/SimulationHistory";
import { SimulationDetails } from "./components/SimulationDetails";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<Arena />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/docs" element={<BotDocumentation />} />
          <Route
            path="/history"
            element={
              <div className="container mx-auto px-4">
                <SimulationHistory />
              </div>
            }
          />
          <Route path="/simulations/:id" element={<SimulationDetails />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
