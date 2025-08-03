# ComfyUI Redis Worker

### Request Format

Jobs are submitted to the worker via Redis. A request may look like this:

```json
{
  "jobId": "123",
  "workflow": {
    "1": {
      "inputs": {},
      "class_type": "LoadImage"
    }
  },
  "images": [
    {
      "name": "test.jpg",
      "imageBase64": "base64data"
    }
  ],
  "outputNode": "4"
}
```

### Webhook Endpoint

The worker will call the `POST ${COMPLETE_WEBHOOK_URL}` endpoint with the following payload when the job is complete:

```json
{
  "jobId": "123",
  "videoKey": "s3-key"
}
```

The `videoKey` is the key of the video in the S3 bucket.

### Environment Variables

The following table lists the available environment variables and their default values.

| Variable              | Default Value  | Description         |
| --------------------- | -------------- | ------------------- |
| COMFYUI_API_URL       |          | The URL of the ComfyUI API.                       |
| COMPLETE_WEBHOOK_URL  |          | The URL of the webhook to call when the job is complete.    |
| REDIS_URL             |          | The URL of the Redis server.                      |
| QUEUE_NAME            |          | The name of the queue to use.                     |
| JOB_NAME              |          | The name of the job to process.                   |
| MAX_RETRIES           | 60 * 20  | The maximum number of retries to attempt.        |
| POLL_INTERVAL_SEC     | 1        | The interval in seconds to poll the job status.  |
| S3_ACCESS_KEY_ID      |          | The AWS access key ID.                 |
| S3_SECRET_ACCESS_KEY  |          | The AWS secret access key.                       |
| S3_BUCKET             |          | The AWS S3 bucket to use.                        |
| S3_ENDPOINT           |          | The AWS S3 endpoint to use.                      |
| COMFYUI_OUTPUT_PATH   | /comfyui/output | The path to the ComfyUI output directory |