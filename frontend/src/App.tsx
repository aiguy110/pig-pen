import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { Arena } from "./components/Arena";
import { BotDocumentation } from "./components/BotDocumentation";
import { Rules } from "./components/Rules";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<Arena />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/docs" element={<BotDocumentation />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
