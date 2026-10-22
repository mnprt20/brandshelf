export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

export type AgentResponse = 
  | { text: string; toolCalls?: never }
  | { toolCalls: ToolCall[]; text?: string };

export interface IModelAdapter {
  generate(systemPrompt: string, messages: { role: string; content: string }[], toolSchemas: ToolSchema[]): Promise<AgentResponse>;
}
