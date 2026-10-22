import React, { useState, useEffect, useRef } from "react";
import { SessionContext, Store, AiMessage, PendingAction } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { CatalogService } from "../../services/catalogService";
import { OrderService } from "../../services/orderService";
import { ReportService } from "../../services/reportService";
import { AgentService } from "../../agent/agentLoop";
import { GeminiAdapter } from "../../agent/geminiAdapter";
import { PLANS } from "../../config/constants";

interface Props {
  session: SessionContext;
}

export const AiAssistantTab: React.FC<Props> = ({ session }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [quotaCount, setQuotaCount] = useState<number>(0);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const catalogService = new CatalogService(defaultRepository);
  const orderService = new OrderService(defaultRepository);
  const reportService = new ReportService(defaultRepository);
  const adapter = new GeminiAdapter();
  const agentService = new AgentService(defaultRepository, adapter, catalogService, orderService, reportService);

  const loadData = async () => {
    const s = await defaultRepository.getStoreById(session.storeId);
    setStore(s);
    const msgs = await defaultRepository.getAiMessages(session.storeId, session.userId);
    setMessages(msgs);
    const acts = await defaultRepository.getPendingActions(session.storeId);
    setPendingActions(acts.filter(a => a.status === "pending"));

    const todayStr = new Date().toISOString().split("T")[0];
    const usage = await defaultRepository.getAiUsage(session.storeId, todayStr);
    setQuotaCount(usage?.count || 0);
  };

  useEffect(() => {
    loadData();
  }, [session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = async (textToSend?: string) => {
    const content = (textToSend || input).trim();
    if (!content || isSending) return;

    setInput("");
    setIsSending(true);

    try {
      await agentService.handleUserMessage(session, content);
      await loadData();
    } catch (err: any) {
      alert("Error sending message: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmAction = async (actionId: string) => {
    try {
      await agentService.confirmPendingAction(session, actionId);
      alert("Action confirmed and applied to your shop!");
      await loadData();
    } catch (err: any) {
      alert("Failed to confirm action: " + err.message);
    }
  };

  const handleCancelAction = async (actionId: string) => {
    try {
      await agentService.cancelPendingAction(session, actionId);
      await loadData();
    } catch (err: any) {
      alert("Failed to cancel action: " + err.message);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Clear message history?")) return;
    await defaultRepository.clearAiMessages(session.storeId, session.userId);
    loadData();
  };

  if (!store) return <div>Loading Assistant...</div>;

  const plan = PLANS[store.planSlug];

  return (
    <div style={{ maxWidth: "860px", display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "32px", margin: 0 }}>Shop AI Assistant</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "14px", marginTop: "4px" }}>
            Safe, human-confirmed AI copilot for your shop catalog, orders, and sales queries.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Daily Quota</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: store.brandColor }}>
              {quotaCount} / {plan.aiDailyQuota} used
            </div>
          </div>
          <button
            onClick={handleClearHistory}
            style={{ padding: "6px 12px", borderRadius: "8px", background: "#F0F4EC", fontSize: "12px", fontWeight: 600 }}
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Pending Actions Confirmation Gate Panel */}
      {pendingActions.length > 0 && (
        <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: "18px", padding: "16px 20px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span style={{ fontSize: "18px" }}>⚠️</span>
            <span style={{ fontWeight: 800, fontSize: "14px", color: "#92400E" }}>
              Action Requires Your Confirmation ({pendingActions.length})
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "#B45309", margin: "0 0 12px" }}>
            The assistant has prepared changes but will never write to your catalogue without your explicit approval.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pendingActions.map(action => (
              <div key={action.id} style={{ background: "#FFFFFF", borderRadius: "12px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>{action.summary}</div>
                  <div style={{ fontSize: "11px", color: "var(--color-muted)" }}>Tool: {action.toolName}</div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => handleConfirmAction(action.id)}
                    style={{ padding: "6px 14px", borderRadius: "9999px", background: "var(--color-forest)", color: "#FFFFFF", fontWeight: 700, fontSize: "12px" }}
                  >
                    Confirm & Apply
                  </button>
                  <button
                    onClick={() => handleCancelAction(action.id)}
                    style={{ padding: "6px 14px", borderRadius: "9999px", background: "#F0F4EC", color: "var(--color-ink)", fontWeight: 600, fontSize: "12px" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages Log */}
      <div style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
        {messages.length === 0 ? (
          <div style={{ margin: "auto", textAlign: "center", color: "var(--color-muted)", maxWidth: "420px" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🌿</div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-ink)", margin: "0 0 6px" }}>How can I help your shop today?</h3>
            <p style={{ fontSize: "13px", lineHeight: "20px" }}>
              Ask me to look up items, check inventory, review sales numbers, or prepare a price update.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "75%",
                backgroundColor: msg.role === "user" ? store.brandColor : "#F5F8EF",
                color: msg.role === "user" ? "#FFFFFF" : "var(--color-ink)",
                padding: "12px 18px",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                fontSize: "14px",
                lineHeight: "22px",
                whiteSpace: "pre-wrap"
              }}
            >
              {msg.content}
            </div>
          ))
        )}

        {isSending && (
          <div style={{ alignSelf: "flex-start", background: "#F5F8EF", padding: "10px 16px", borderRadius: "18px 18px 18px 4px", fontSize: "13px", color: "var(--color-muted)" }}>
            Assistant is thinking and verifying tools...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "10px 0" }}>
        {[
          "Which items are low on stock?",
          "Can you increase the sourdough bread price to ₹300?",
          "Show my recent orders",
          "Give me a sales summary for today"
        ].map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            style={{
              padding: "6px 12px",
              borderRadius: "9999px",
              background: "#FFFFFF",
              border: "1px solid #DCE3D6",
              fontSize: "12px",
              color: "var(--color-ink)",
              whiteSpace: "nowrap"
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={e => { e.preventDefault(); handleSend(); }} style={{ display: "flex", gap: "10px" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask your assistant anything in English, Hindi, or Punjabi..."
          style={{ flex: 1, padding: "14px 18px", borderRadius: "9999px", border: "1px solid #DCE3D6", fontSize: "14px" }}
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          style={{ padding: "14px 28px", borderRadius: "9999px", background: store.brandColor, color: "#FFFFFF", fontWeight: 700, fontSize: "14px" }}
        >
          Send
        </button>
      </form>
    </div>
  );
};
