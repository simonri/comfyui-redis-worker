import nock from "nock";
import testWorkflow from "./test-workflow.json";
import type { Workflow } from "../src/api";

export function mockWebhooks() {
  let capturedWebhookBody: any = null;

  const webhook = nock("http://api.example.com")
    .post("/webhook", (body) => {
      capturedWebhookBody = body;
      return true;
    })
    .reply(200, { success: true });

  const workflowResponse: Workflow = {
    id: "123",
    outputNode: "4",
    data: testWorkflow,
  };

  const workflow = nock("http://api.example.com")
    .get("/workflow/123")
    .reply(200, workflowResponse);

  return {
    webhook,
    workflow,
    getWebhookBody: () => capturedWebhookBody
  };
}