import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./AppShell.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import StandardSearch from "./pages/StandardSearch.jsx";
import Login from "./pages/Login.jsx";
import { getHealth } from "./services/api.js";
import { AuthProvider, useAuth } from "./AuthContext.jsx";

function AppContent({ health }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <AppShell health={health}>
      <Routes>
        <Route path="/" element={<Dashboard health={health} />} />
        <Route path="/search" element={<StandardSearch />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: "down", db: "error", embedding_model: "all-MiniLM-L6-v2" }));
  }, []);

  return (
    <AuthProvider>
      <AppContent health={health} />
    </AuthProvider>
  );
}
