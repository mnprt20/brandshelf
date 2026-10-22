import { IModelAdapter, ToolSchema, AgentResponse } from "./types";

export class FakeAdapter implements IModelAdapter {
  private script: AgentResponse[] = [];
  public callCount = 0;
  public loggedPrompts: string[] = [];

  setScript(responses: AgentResponse[]) {
    this.script = [...responses];
    this.callCount = 0;
  }

  async generate(systemPrompt: string, messages: { role: string; content: string }[], toolSchemas: ToolSchema[]): Promise<AgentResponse> {
    this.callCount++;
    this.loggedPrompts.push(messages[messages.length - 1]?.content || "");
    if (this.script.length > 0) {
      return this.script.shift()!;
    }
    return { text: "I am ready to assist with your shop catalogue and orders." };
  }
}
