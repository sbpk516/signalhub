Scenario: Happy path
Given the desktop app is running with backend warm
And a short < 15s clip previously produced an empty transcript
When the analyst clicks "Retry short clip" in the fallback panel
Then the UI transitions the fallback store to `queued`
And within 5 seconds an SSE update flips the status to `succeeded`
And the transcript detail view renders regenerated text without page reload

Scenario: Error/edge
Given the fallback pipeline cannot locate the normalized audio file on disk
When the analyst retries the short clip
Then the API responds with `ok=false` and `status="failed"` inside 300ms
And the UI surfaces "Retry failed" with the backend-provided `errorMessage`
And automated tests assert the store returns to `idle` once the error banner dismisses
