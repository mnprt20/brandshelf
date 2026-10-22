import React, { useEffect, useState } from "react";
import { runAllDiagnostics, TestResult } from "../diagnostics/testSuite";
import { seedDemoData } from "../services/seedData";
import { defaultRepository } from "../repository/storage";

interface Props {
  onNavigate: (route: string) => void;
}

export const DiagnosticsPage: React.FC<Props> = ({ onNavigate }) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const res = await runAllDiagnostics();
      setResults(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const handleResetData = async () => {
    try {
      await seedDemoData(defaultRepository, true);
      setResetMessage("Demo data has been reset to default state.");
      setTimeout(() => setResetMessage(null), 4000);
    } catch (err: any) {
      setResetMessage("Reset failed: " + err.message);
    }
  };

  const passCount = results.filter(r => r.passed).length;
  const failCount = results.filter(r => !r.passed).length;

  return (
    <div style={{ maxWidth: "960px", margin: "40px auto", padding: "0 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <button onClick={() => onNavigate("#/")} style={{ background: "none", color: "var(--color-forest)", fontWeight: 600, fontSize: "14px", marginBottom: "8px" }}>
            ← Back to Home
          </button>
          <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "32px", margin: 0 }}>System Self-Test Diagnostics</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "14px", marginTop: "4px" }}>
            Runs isolated in-memory verification against all architectural, tenant, and security boundaries.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={runTests}
            disabled={isRunning}
            style={{ padding: "10px 18px", borderRadius: "9999px", background: "var(--color-forest)", color: "#FFFFFF", fontWeight: 600, fontSize: "14px" }}
          >
            {isRunning ? "Running..." : "Re-run Tests"}
          </button>
          <button
            onClick={handleResetData}
            style={{ padding: "10px 18px", borderRadius: "9999px", background: "#FFFFFF", border: "1px solid #DCE3D6", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
          >
            Reset demo data
          </button>
        </div>
      </div>

      {resetMessage && (
        <div style={{ padding: "12px 16px", borderRadius: "12px", background: "var(--color-mint)", color: "var(--color-forest)", marginBottom: "20px", fontWeight: 600 }}>
          {resetMessage}
        </div>
      )}

      {/* Summary Banner */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <div style={{ flex: 1, background: "#FFFFFF", padding: "20px", borderRadius: "16px", border: "1px solid #E5EADF" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Total Tests</div>
          <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px" }}>{results.length}</div>
        </div>
        <div style={{ flex: 1, background: "#FFFFFF", padding: "20px", borderRadius: "16px", border: "1px solid #E5EADF" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Passed</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#166534", marginTop: "4px" }}>{passCount}</div>
        </div>
        <div style={{ flex: 1, background: "#FFFFFF", padding: "20px", borderRadius: "16px", border: "1px solid #E5EADF" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Failed</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: failCount > 0 ? "#DC2626" : "var(--color-muted)", marginTop: "4px" }}>{failCount}</div>
        </div>
      </div>

      {/* Test Items Table */}
      <div style={{ background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5EADF", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5EADF", fontWeight: 700, fontSize: "14px" }}>
          Diagnostic Assertion List
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {results.map((r, i) => (
            <div key={i} style={{ padding: "16px 20px", borderBottom: i < results.length - 1 ? "1px solid #F0F4EC" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: "14px" }}>{r.name}</span>
                {r.message && <div style={{ fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>{r.message}</div>}
              </div>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: 700,
                  backgroundColor: r.passed ? "#DCFCE7" : "#FEE2E2",
                  color: r.passed ? "#166534" : "#991B1B"
                }}
              >
                {r.passed ? "PASS" : "FAIL"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
