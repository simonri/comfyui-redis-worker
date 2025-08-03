import nock from "nock";

export function mockWebhooks() {
  let capturedWebhookBody: any = null;

  const webhook = nock("http://api.example.com")
    .persist()
    .post("/webhook", (body) => {
      capturedWebhookBody = body;
      return true;
    })
    .reply(200, { success: true });

  return {
    webhook,
    getWebhookBody: () => capturedWebhookBody,
  };
}