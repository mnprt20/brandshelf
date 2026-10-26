import React, { useState } from "react";
import { AuthService } from "../services/authService";
import { defaultRepository } from "../repository/storage";
import { SessionContext } from "../types";
import { apiMerchantLogin } from "../services/apiClient";

interface Props {
  onNavigate: (route: string) => void;
  onLoginSuccess: (session: SessionContext) => void;
}

export const LoginPage: React.FC<Props> = ({ onNavigate, onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      try {
        const session = await apiMerchantLogin(username, password);
        onLoginSuccess(session);
        onNavigate("#/dashboard/overview");
      } catch (apiErr: any) {
        // Fall back to local service if server unreachable
        const auth = new AuthService(defaultRepository);
        const { user, memberships } = await auth.login(username, password);
        const target = memberships[0];
        onLoginSuccess({
          userId: user.id,
          storeId: target.storeId,
          role: target.role
        });
        onNavigate("#/dashboard/overview");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "var(--color-bg)" }}>
      <div style={{ width: "100%", maxWidth: "400px", background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", padding: "36px 32px" }}>
        <button onClick={() => onNavigate("#/")} style={{ background: "none", color: "var(--color-forest)", fontWeight: 600, fontSize: "14px", marginBottom: "16px" }}>
          ← Back
        </button>
        <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "28px", margin: "0 0 8px" }}>Log in to shop</h1>
        <p style={{ color: "var(--color-muted)", fontSize: "14px", margin: "0 0 24px" }}>Enter owner or staff credentials.</p>

        {error && (
          <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: "12px", fontSize: "13px", marginBottom: "16px", fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Username</label>
            <input
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. bakery_owner"
              style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #DCE3D6", fontSize: "14px" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #DCE3D6", fontSize: "14px" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: "10px", width: "100%", padding: "14px", borderRadius: "9999px", background: "var(--color-forest)", color: "#FFFFFF", fontWeight: 700, fontSize: "15px" }}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center", fontSize: "13px", color: "var(--color-muted)" }}>
          Don't have a shop?{" "}
          <button onClick={() => onNavigate("#/signup")} style={{ background: "none", color: "var(--color-forest)", fontWeight: 700 }}>
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
};
