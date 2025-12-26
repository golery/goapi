# Node Chat API Guideline

This document provides documentation for implementing a chat widget that communicates with node content using streaming LLM responses.

## 1. Endpoint Information

**Method:** `POST`  
**Path:** `/api/pencil/chat`

### Authentication & Headers
All requests must include the following headers:

| Header | Type | Description |
|--------|------|-------------|
| `Authorization` | string | Bearer token (obtained from login/signup) |
| `appId` | string | Application ID |
| `Content-Type` | string | `application/json` |

---

### Body Parameters
```typescript
{
  "question": string,           // Required: The user's prompt
  "nodeTree"?: Array<number>,   // Optional: List of node IDs. All descendants included.
  "chatHistory"?: Array<{       // Optional: Previous messages for context
    "role": "user" | "assistant",
    "content": string
  }>
}
```

---

## 3. Response Structure (Streaming)

The API uses **Server-Sent Events (SSE)**. You will receive chunks of data in real-time.

**Response Headers:**
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`

### SSE Event Format
Data is sent as a JSON string prefixed with `data: `.

1.  **Chunk Event** (Partial text):
    `data: {"chunk": "Hello"}`
2.  **Completion Event** (Stream finished):
    `data: {"done": true}`
3.  **Error Event**:
    `data: {"error": "Description of error"}`

---

## 4. Implementation Example (React/JavaScript)

Since `EventSource` does not support `POST` requests, use the `fetch` API with a reader to handle the stream:

```javascript
async function chatWithNodes(nodeIds, question, chatHistory, authToken, appId, onChunk) {
  const response = await fetch(`/api/pencil/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'appId': appId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, chatHistory, nodeTree: nodeIds }),
  });

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.chunk) onChunk(data.chunk); // Update UI with chunk
          if (data.done) return;
          if (data.error) throw new Error(data.error);
        } catch (e) {
          // Ignore partial JSON parsing errors
        }
      }
    }
  }
}
```

---

## 5. Potential Error Status Codes

| Status | Description |
|--------|-------------|
| `400` | Invalid request format |
| `404` | Node not found |
| `503` | AI Service currently unavailable |
| `500` | Internal server error |

---

## 6. Best Practices
*   **Context**: For follow-up questions, always append the previous `user` and `assistant` messages to the `chatHistory` array to keep the AI "in the loop."
*   **UI Feedback**: Show a "typing" state immediately after sending the request and before the first chunk arrives.
*   **Aborting**: Use an `AbortController` if you want to allow the user to stop the generation mid-stream.
