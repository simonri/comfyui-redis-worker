import type { HistoryEntry, HistoryResponse, QueuePromptResponse } from "./types";

export class ComfyApi {
  public apiHost: string;

  constructor(host: string) {
    this.apiHost = host;
  }

  private apiURL(route: string): string {
    return `${this.apiHost}${route}`;
  }

  public async fetchApi(route: string, options?: RequestInit): Promise<Response> {
    if (!options) {
      options = {};
    }

    return fetch(this.apiURL(route), options);
  }

  async queuePrompt(workflow: object): Promise<QueuePromptResponse> {
    const body = {
      prompt: workflow
    };

    try {
      const response = await this.fetchApi("/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to queue prompt: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<QueuePromptResponse>;
    } catch (e) {
      console.error("Cannot queue prompt", e);
      throw e;
    }
  }

  async getHistory(promptId: string): Promise<HistoryEntry | undefined> {
    const response = await this.fetchApi(`/history/${promptId}`);
    const history: HistoryResponse = await response.json() as HistoryResponse;
    return history[promptId];
  }
}