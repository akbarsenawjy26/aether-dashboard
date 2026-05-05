"use client";

import { useEffect, useState, useCallback } from "react";
import { SSEClient, SSEDeviceData } from "@/lib/sse/sseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, Wifi, WifiOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const SSE_URL = `${API_BASE}/telemetry/stream`;

interface DeviceCardData extends SSEDeviceData {
  lastSeen: Date;
  isStale: boolean;
}

const STALE_THRESHOLD_MS = 30_000; // 30 seconds

export default function RealtimePage() {
  const [devices, setDevices] = useState<Map<string, DeviceCardData>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [deviceCount, setDeviceCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const sseClientRef = { current: null as SSEClient | null };
  const pausedDataRef = { current: new Map<string, DeviceCardData>() };

  const handleDeviceData = useCallback((data: SSEDeviceData) => {
    if (isPaused) {
      // Store in paused buffer but don't update UI
      pausedDataRef.current.set(data.device_sn, {
        ...data,
        lastSeen: new Date(),
        isStale: false,
      });
      return;
    }

    setDevices((prev) => {
      const next = new Map(prev);
      next.set(data.device_sn, {
        ...data,
        lastSeen: new Date(),
        isStale: false,
      });
      return next;
    });
  }, [isPaused]);

  useEffect(() => {
    const client = new SSEClient(SSE_URL);
    sseClientRef.current = client;

    client.setCallbacks({
      onDeviceData: handleDeviceData,
      onConnected: (count) => {
        setConnectionStatus("connected");
        setDeviceCount(count);
      },
      onError: () => {
        setConnectionStatus("disconnected");
      },
    });

    client.connect();

    return () => {
      client.disconnect();
    };
  }, [handleDeviceData]);

  // Mark stale devices every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setDevices((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [sn, data] of next) {
          const age = now - data.lastSeen.getTime();
          if (age > STALE_THRESHOLD_MS && !data.isStale) {
            next.set(sn, { ...data, isStale: true });
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleResume = () => {
    // Flush paused data
    for (const [sn, data] of pausedDataRef.current) {
      setDevices((prev) => {
        const next = new Map(prev);
        next.set(sn, data);
        return next;
      });
    }
    pausedDataRef.current.clear();
    setIsPaused(false);
  };

  const statusConfig = {
    connecting: {
      label: "Menghubungkan...",
      color: "text-yellow-500",
      icon: <Wifi className="h-4 w-4" />,
    },
    connected: {
      label: `Terhubung (${deviceCount} devices)`,
      color: "text-green-500",
      icon: <Wifi className="h-4 w-4" />,
    },
    disconnected: {
      label: "Terputus",
      color: "text-red-500",
      icon: <WifiOff className="h-4 w-4" />,
    },
  };

  const status = statusConfig[connectionStatus];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Realtime</h1>
          <p className="text-muted-foreground">
            Monitoring data telemetry secara real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn("gap-1.5 px-3 py-1", status.color)}>
            {status.icon}
            {status.label}
          </Badge>
          <Button
            variant={isPaused ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPaused((p) => !p)}
          >
            {isPaused ? "Lanjut" : "Pause"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Device Grid */}
      {connectionStatus === "connecting" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : devices.size === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Tidak ada data</p>
            <p className="text-muted-foreground text-sm">
              Pastikan device sedang mengirim telemetry data
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from(devices.entries()).map(([sn, data]) => (
            <DeviceCard key={sn} data={data} />
          ))}
        </div>
      )}

      {/* Paused indicator */}
      {isPaused && (
        <div className="fixed bottom-6 right-6 z-50">
          <Card className="bg-primary text-primary-foreground shadow-lg">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                Stream paused — {pausedDataRef.current.size} data points buffering
              </span>
              <Button size="sm" variant="secondary" onClick={handleResume}>
                Lanjut
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function DeviceCard({ data }: { data: DeviceCardData }) {
  const formatTime = (date: Date) =>
    date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const readingEntries = Object.entries(data.readings);

  return (
    <Card className={cn("transition-colors", data.isStale && "opacity-60")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex flex-col gap-0.5">
          <CardTitle className="text-sm font-medium truncate max-w-[160px]">
            {data.device_name ?? data.device_sn}
          </CardTitle>
          <p className="text-xs text-muted-foreground font-mono">{data.device_sn}</p>
        </div>
        <Badge variant={data.isStale ? "secondary" : "default"} className="ml-auto">
          {data.isStale ? "Stale" : "Live"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Readings */}
        <div className="space-y-2">
          {readingEntries.length > 0 ? (
            readingEntries.slice(0, 4).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground capitalize">{key}</span>
                <span className="text-sm font-mono font-medium">
                  {typeof value === "number" ? value.toFixed(2) : value}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">No readings</p>
          )}
          {readingEntries.length > 4 && (
            <p className="text-xs text-muted-foreground text-center">
              +{readingEntries.length - 4} more
            </p>
          )}
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-border">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatTime(data.lastSeen)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}