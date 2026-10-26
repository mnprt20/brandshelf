import { IModelAdapter, ToolSchema, AgentResponse } from "./types";

export class GeminiAdapter implements IModelAdapter {
  constructor() {}

  async generate(systemPrompt: string, messages: { role: string; content: string }[], toolSchemas: ToolSchema[]): Promise<AgentResponse> {
    const lastMsg = messages[messages.length - 1]?.content || "";

    // Natural Language Rule-Based Fallback for Prototype Mode:
    const lower = lastMsg.toLowerCase();

    // Check for price proposal request
    // e.g. "change price of sourdough to 300"
    const priceMatch = lower.match(/(?:price|rate)\s+(?:of\s+)?(.+?)\s+to\s+(?:₹|rs\.?|inr)?\s*(\d+)/i) ||
      lower.match(/increase\s+(?:the\s+)?(.+?)\s+price\s+to\s+(?:₹|rs\.?|inr)?\s*(\d+)/i);
    if (priceMatch) {
      return {
        toolCalls: [{
          name: "search_products",
          args: { query: priceMatch[1].trim() }
        }]
      };
    }

    // Check for stock proposal
    const stockMatch = lower.match(/stock\s+(?:of\s+)?(.+?)\s+to\s+(\d+)/i);
    if (stockMatch) {
      return {
        toolCalls: [{
          name: "search_products",
          args: { query: stockMatch[1].trim() }
        }]
      };
    }

    // Check if tool result was just passed back in conversation
    if (lastMsg.includes("<<<TOOL_RESULT_START>>>")) {
      try {
        const rawJson = lastMsg.substring(
          lastMsg.indexOf("<<<TOOL_RESULT_START>>>") + 23,
          lastMsg.indexOf("<<<TOOL_RESULT_END>>>")
        ).trim();
        const data = JSON.parse(rawJson);

        if (data.products && data.products.length > 0) {
          const target = data.products[0];
          // Determine if previous user message wanted price or stock change
          const prevUserMsg = messages[messages.length - 3]?.content || "";
          const priceCheck = prevUserMsg.match(/to\s+(?:₹|rs\.?|inr)?\s*(\d+)/i);
          if (priceCheck) {
            const rupees = parseInt(priceCheck[1], 10);
            return {
              toolCalls: [{
                name: "propose_price_change",
                args: { productId: target.id, newPricePaise: rupees * 100 }
              }]
            };
          }
          return {
            text: `Found ${target.name} (${target.price}, current stock: ${target.stock ?? 'unlimited'}). Would you like to adjust price or stock?`
          };
        }

        if (data.status === "pending_confirmation") {
          return {
            text: `I have prepared your request: "${data.summary}". Please review and click Confirm in the pending actions panel above to apply.`
          };
        }

        if (data.orders) {
          return {
            text: `Found ${data.count} recent orders. The latest is ${data.orders[0]?.orderNumber || 'none'} (${data.orders[0]?.total || ''}).`
          };
        }

        if (data.totalRevenue) {
          return {
            text: `Sales Summary: Total revenue is ${data.totalRevenue} across ${data.totalOrders} completed/active orders (${data.totalUnits} items).`
          };
        }
      } catch {
        // Continue
      }
    }

    if (lower.includes("sales") || lower.includes("summary") || lower.includes("revenue")) {
      return {
        toolCalls: [{
          name: "sales_summary",
          args: {}
        }]
      };
    }

    if (lower.includes("order")) {
      return {
        toolCalls: [{
          name: "list_orders",
          args: { limit: 5 }
        }]
      };
    }

    if (lower.includes("low stock") || lower.includes("out of stock")) {
      return {
        toolCalls: [{
          name: "low_stock",
          args: { threshold: 5 }
        }]
      };
    }

    return {
      text: "Namaste! I can help you search products, review orders, check low stock, or prepare price and catalog updates. What would you like to do?"
    };
  }
}
