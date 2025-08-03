import { describe, it, expect, beforeEach, vi } from "vitest";
import { ComfyApi } from "./client";

const makeFetchResponse = <T>(status: number, payload: T) => ({
  status,
  ok: status >= 200 && status < 300,
  statusText: status === 200 ? 'OK' : status === 500 ? 'Internal Server Error' : 'Unknown',
  json: vi.fn().mockResolvedValue(payload)
}) as unknown as Response;

describe("ComfyApi", () => {
  const host = "https://api.example.com";
  let api: ComfyApi;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;
    api = new ComfyApi(host);
  });

  it("fetchApi combines host and route", async () => {
    const res = makeFetchResponse(200, {});
    fetchSpy.mockResolvedValue(res);

    await api.fetchApi("/ping");

    expect(fetchSpy).toHaveBeenCalledWith(
      `${host}/ping`,
      {}
    );
  });

  it("queuePrompt sends request to /prompt and returns response", async () => {
    const res = makeFetchResponse(200, {
      prompt_id: "123"
    });
    fetchSpy.mockResolvedValue(res);

    const mockWorkflow = {
      "hello": "world"
    };

    const response = await api.queuePrompt(mockWorkflow);

    expect(fetchSpy).toHaveBeenCalledWith(
      `${host}/prompt`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: mockWorkflow })
      }
    );

    expect(response).toEqual({
      prompt_id: "123"
    });
  });

  it("queuePrompt throws if backend is not OK", async () => {
    fetchSpy.mockResolvedValue(makeFetchResponse(500, { message: "boom" }));

    await expect(api.queuePrompt({})).rejects.toThrow("Failed to queue prompt: 500");
  });

  it("getHistory fetches from /history/:promptId", async () => {
    const TEST_PROMPT_ID = "123";

    const res = makeFetchResponse(200, {
      [TEST_PROMPT_ID]: {
        status: {
          completed: true
        }
      }
    });

    fetchSpy.mockResolvedValue(res);

    const history = await api.getHistory(TEST_PROMPT_ID);

    expect(fetchSpy).toHaveBeenCalledWith(
      `${host}/history/${TEST_PROMPT_ID}`,
      {}
    );

    expect(history).toEqual({
      status: { completed: true }
    });
  });
});