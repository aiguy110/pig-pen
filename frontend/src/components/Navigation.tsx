import React from "react";
import { NavLink } from "react-router-dom";

export const Navigation: React.FC = () => {
  return (
    <nav className="bg-white shadow-lg mb-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-2">
            <img src="/favicon.ico" alt="Pig-Pen logo" className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-gray-900">Pig-Pen</h1>
          </div>

          <div className="flex space-x-6">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-700 hover:bg-indigo-100"
                }`
              }
            >
              Arena
            </NavLink>
            <NavLink
              to="/rules"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-700 hover:bg-indigo-100"
                }`
              }
            >
              Rules
            </NavLink>
            <NavLink
              to="/docs"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-700 hover:bg-indigo-100"
                }`
              }
            >
              Build a Bot
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-700 hover:bg-indigo-100"
                }`
              }
            >
              History
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
};
