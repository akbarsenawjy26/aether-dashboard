/**
 * SSE Client using fetch() + ReadableStream
 * 
 * Unlike EventSource, fetch() CAN set custom headers like Authorization.
 * This allows us to securely send JWT tokens without exposing them in URLs.
 * 
 * Uses the same interface as the legacy SSEClient for easy migration.
 */

export interface SSEDeviceData {
  device_sn: string;
  device_type: string;
  device_name?: string;
  readings: Record<string, number>;
  timestamp: string;
}

export type SSEEventType = "connected" | "device_data" | "error" | "heartbeat";

export interface SSEMessage {
  event: SSEEventType;
  data: SSEDeviceData | { message: string } | { count: number };
  timestamp?: string;
}

type SSECallback = (data: SSEDeviceData) => void;
type SSEErrorCallback = (error: string) => void;
type SSEConnectedCallback = (count: number) => void;

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 3000;
const KEEPALIVE_INTERVAL = 30000; // 30s keepalive ping

export class SSEReadableClient {
  private abortController: AbortController | null = null;
  private url: string;
  private deviceSn?: string;
  private onDeviceData?: SSECallback;
  private onError?: SSEErrorCallback;
  private onConnected?: SSEConnectedCallback;
  private retryCount = 0;
  private retryTimeout?: ReturnType<typeof setTimeout>;
  private isConnecting = false;
  private isManualStop = false;
  private keepaliveInterval?: ReturnType<typeof setInterval>;
  private lastActivityTime = 0;

  constructor(url: string, deviceSn?: string) {
    this.url = url;
    this.deviceSn = deviceSn;
  }

  setCallbacks(callbacks: {
    onDeviceData?: SSECallback;
    onError?: SSEErrorCallback;
    onConnected?: SSEConnectedCallback;
  }) {
    this.onDeviceData = callbacks.onDeviceData;
    this.onError = callbacks.onError;
    this.onConnected = callbacks.onConnected;
  }

  connect() {
    if (this.isConnecting || this.abortController) {
      return;
    }

    this.isConnecting = true;
    this.isManualStop = false;

    const fullUrl = this.deviceSn
      ? `${this.url}/${this.deviceSn}`
      : this.url;

    // Get token from localStorage and set in Authorization header
    const token = localStorage.getItem("access_token");

    this.abortController = new AbortController();

    const headers: HeadersInit = {
      "Accept": "text/event-stream",
      "Cache-Control": "no-cache",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    fetch(fullUrl, {
      method: "GET",
      headers,
      signal: this.abortController.signal,
    })
      .then((response) => {
        this.isConnecting = false;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("Response body is null");
        }

        // Success - start reading the stream
        this.lastActivityTime = Date.now();
        this.retryCount = 0;
        this.startKeepalive();
        this.readStream(response.body);
      })
      .catch((err) => {
        this.isConnecting = false;

        if (err.name === "AbortError" || this.isManualStop) {
          // Manual abort or stop - not an error
          return;
        }

        // Network or HTTP error
        this.handleError(err.message || "Connection failed");
      });
  }

  private readStream(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const read = () => {
      reader
        .read()
        .then(({ done, value }) => {
          if (done || this.isManualStop) {
            if (!this.isManualStop) {
              this.handleError("Stream ended unexpectedly");
            }
            return;
          }

          this.lastActivityTime = Date.now();
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            this.processSSELine(line);
          }

          // Continue reading
          read();
        })
        .catch((err) => {
          if (!this.isManualStop) {
            this.handleError(err.message || "Read error");
          }
        });
    };

    read();
  }

  private processSSELine(line: string) {
    // SSE format: "data: <json>" or "event: <event_type>" or ": <comment>"
    if (line.startsWith("data:")) {
      const data = line.slice(5).trim();
      if (data) {
        this.handleDataEvent(data);
      }
    } else if (line.startsWith("event:")) {
      const eventType = line.slice(6).trim();
      // Store event type for the next data line
      this.currentEventType = eventType as SSEEventType;
    } else if (line.startsWith(":")) {
      // Comment (keepalive), ignore
    }
  }

  private currentEventType: SSEEventType = "device_data";

  private handleDataEvent(data: string) {
    try {
      const json = JSON.parse(data);

      switch (this.currentEventType) {
        case "connected":
          this.onConnected?.(json.count ?? 0);
          break;
        case "device_data":
          this.onDeviceData?.(json as SSEDeviceData);
          break;
        case "error":
          this.onError?.(json.message ?? "SSE error");
          break;
        case "heartbeat":
          // heartbeat - connection is alive
          break;
        default:
          // Handle unknown event types as device_data
          if (typeof json === "object" && json !== null && "device_sn" in json) {
            this.onDeviceData?.(json as SSEDeviceData);
          }
      }
    } catch {
      // JSON parse error - ignore
    }
  }

  private handleError(message: string) {
    this.cleanup();
    this.onError?.(message);

    // Auto-reconnect with exponential backoff
    if (!this.isManualStop && this.retryCount < MAX_RETRIES) {
      const delay = BASE_RETRY_DELAY * Math.pow(2, this.retryCount);
      this.retryCount++;
      this.retryTimeout = setTimeout(() => this.connect(), delay);
    } else if (!this.isManualStop) {
      this.onError?.("Max reconnection attempts reached");
    }
  }

  private startKeepalive() {
    this.keepaliveInterval = setInterval(() => {
      // If no activity for a while, trigger reconnection
      const idleTime = Date.now() - this.lastActivityTime;
      if (idleTime > KEEPALIVE_INTERVAL * 2) {
        // Connection seems stale, reconnect
        this.cleanup();
        this.connect();
      }
    }, KEEPALIVE_INTERVAL);
  }

  private cleanup() {
    this.abortController = null;
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = undefined;
    }
  }

  disconnect() {
    this.isManualStop = true;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = undefined;
    }
    this.cleanup();
    this.onError = undefined;
    this.onConnected = undefined;
    this.onDeviceData = undefined;
  }

  get isConnected() {
    return this.abortController !== null && !this.isConnecting;
  }
}
