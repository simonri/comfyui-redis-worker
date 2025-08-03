import nock from "nock";
import testWorkflow from "./test-workflow.json";
import type { Workflow } from "../src/api";

export function mockWebhooks() {
  let capturedWebhookBody: any = null;

  const webhook = nock("http://api.example.com")
    .persist()
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
    .persist()
    .get(/\/workflow\/\d+/)
    .reply(200, (uri) => {
      const workflowId = uri.split('/').pop();
      console.log(`Workflow requested for ID: ${workflowId}`);
      return {
        ...workflowResponse,
        id: workflowId,
      };
    });

  return {
    webhook,
    workflow,
    getWebhookBody: () => capturedWebhookBody,
  };
}