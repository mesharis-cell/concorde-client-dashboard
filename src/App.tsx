import { useEffect, useMemo, useState } from "react";
import Dashboard from "./components/Dashboard";
import LoginForm from "./components/LoginForm";
import { AdminUser, loginAdmin } from "./lib/api";

const STORAGE_KEY = "black_client_dashboard_session_v1";

type Session = {
  token: string;
  user: AdminUser;
  selectedEventId: string;
};

const DEFAULT_API_BASE_URL = "https://concorde-api-production.up.railway.app";

function readSession(): Session | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.token || !parsed?.user || !parsed?.selectedEventId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistSession(session: Session | null) {
  if (!session) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export default function App() {
  const apiBaseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
    [],
  );

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = readSession();
    if (existing) {
      setSession(existing);
    }
  }, []);

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError("");

    try {
      const result = await loginAdmin(apiBaseUrl, values);
      const user = result.data.user;
      const firstEvent = user.events[0];

      if (!firstEvent) {
        throw new Error("No events are assigned to this admin user");
      }

      const nextSession: Session = {
        token: result.data.accessToken,
        user,
        selectedEventId: firstEvent.id,
      };

      setSession(nextSession);
      persistSession(nextSession);
    } catch (loginError: unknown) {
      const message =
        loginError instanceof Error ? loginError.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setError("");
    persistSession(null);
  };

  if (!session) {
    return <LoginForm onSubmit={handleLogin} loading={loading} error={error} />;
  }

  return (
    <Dashboard
      apiBaseUrl={apiBaseUrl}
      token={session.token}
      user={session.user}
      events={session.user.events}
      selectedEventId={session.selectedEventId}
      onLogout={handleLogout}
    />
  );
}
