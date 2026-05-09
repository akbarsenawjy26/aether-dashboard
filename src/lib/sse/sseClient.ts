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

export class SSEClient {
  private eventSource: EventSource | null = null;
  private url: string;
  private deviceSn?: string;
  private onDeviceData?: SSECallback;
  private onError?: SSEErrorCallback;
  private onConnected?: SSEConnectedCallback;
  private retryCount = 0;
  private retryTimeout?: ReturnType<typeof setTimeout>;
  private isConnecting = false;
  private isManualStop = false;

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
    if (this.isConnecting || (this.eventSource && this.eventSource.readyState === EventSource.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.isManualStop = false;

    const fullUrl = this.deviceSn
      ? `${this.url}/${this.deviceSn}`
      : this.url;

    const token = localStorage.getItem("access_token");
    const finalUrl = token ? `${fullUrl}?token=${encodeURIComponent(token)}` : fullUrl;

    try {
      this.eventSource = new EventSource(finalUrl, { withCredentials: true });
    } catch {
      this.isConnecting = false;
      this.onError?.("Failed to create EventSource");
      return;
    }

    this.eventSource.onopen = () => {
      this.isConnecting = false;
      this.retryCount = 0;
    };

    this.eventSource.addEventListener("connected", (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onConnected?.(data.count ?? 0);
      } catch {
        this.onConnected?.(0);
      }
    });

    this.eventSource.addEventListener("device_data", (event) => {
      try {
        const data = JSON.parse(event.data) as SSEDeviceData;
        this.onDeviceData?.(data);
      } catch {
        // ignore parse errors
      }
    });

    this.eventSource.addEventListener("error", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        this.onError?.(data.message ?? "SSE error");
      } catch {
        this.onError?.("SSE connection error");
      }
    });

    this.eventSource.addEventListener("heartbeat", () => {
      // heartbeat received — connection is alive
    });

    this.eventSource.onerror = () => {
      this.isConnecting = false;
      this.eventSource?.close();
      this.eventSource = null;

      if (!this.isManualStop && this.retryCount < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY * Math.pow(2, this.retryCount);
        this.retryCount++;
        this.retryTimeout = setTimeout(() => this.connect(), delay);
      } else if (!this.isManualStop) {
        this.onError?.("Max reconnection attempts reached");
      }
    };
  }

  disconnect() {
    this.isManualStop = true;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  get isConnected() {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}