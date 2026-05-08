"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SSEReadableClient, SSEDeviceData } from "@/lib/sse/sseClientFetch";
import { deviceApi } from "@/lib/api/devices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Radio, 
  Wifi, 
  WifiOff, 
  Play, 
  Pause, 
  RotateCw, 
  Clock, 
  LayoutGrid, 
  Table2, 
  ChevronDown, 
  ChevronRight, 
  ArrowRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
// SSE endpoint: /telemetry/stream for all devices
// or /telemetry/stream/:device_sn for single device
const SSE_URL = `${API_BASE}/telemetry/stream`;

// Module-level mapping: device_sn -> guid (populated after devices load)
const snToGuid = new Map<string, string>();

interface DeviceCardData extends SSEDeviceData {
  lastSeen: Date;
  isStale: boolean;
}

type ViewMode = "card" | "table";

interface DeviceGroup {
  deviceType: string;
  devices: DeviceCardData[];
  viewMode: ViewMode;
  isOpen: boolean;
}

const STALE_THRESHOLD_MS = 30_000; // 30 seconds

export default function RealtimePage() {
  const router = useRouter();
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [isPaused, setIsPaused] = useState(false);
  const [pausedDataCount, setPausedDataCount] = useState(0);
  const sseClientRef = useRef<SSEReadableClient | null>(null);
  const pausedDataRef = useRef(new Map<string, DeviceCardData>());

  // Build device_sn -> guid mapping for navigation
  const { data: devicesData, refetch: refetchDevices } = useQuery({
    queryKey: ["devices-all"],
    queryFn: () => deviceApi.list({ limit: 1000 }),
  });

  // Force refresh on mount (especially useful when coming back from detail page)
  useEffect(() => {
    refetchDevices();
  }, [refetchDevices]);

  useEffect(() => {
    if (devicesData?.items) {
      devicesData.items.forEach((d) => snToGuid.set(d.serial_number, d.guid));
    }
  }, [devicesData]);

  const handleDeviceData = useCallback((data: SSEDeviceData) => {
    if (isPaused) {
      pausedDataRef.current.set(data.device_sn, {
        ...data,
        lastSeen: new Date(),
        isStale: false,
      });
      setPausedDataCount(pausedDataRef.current.size);
      return;
    }

    setDeviceGroups((prevGroups) => {
      // Find or create group for this device type
      const deviceType = data.device_type || "unknown";
      const existingGroup = prevGroups.find((g) => g.deviceType === deviceType);
      
      if (existingGroup) {
        return prevGroups.map((group) => {
          if (group.deviceType !== deviceType) return group;
          
          const next = new Map(group.devices.map((d) => [d.device_sn, d]));
          next.set(data.device_sn, {
            ...data,
            lastSeen: new Date(data.timestamp),
            isStale: data.is_stale || false,
          });
          
          return {
            ...group,
            devices: Array.from(next.values()),
          };
        });
      } else {
        // New group
        return [...prevGroups, {
          deviceType,
          devices: [{
            ...data,
            lastSeen: new Date(data.timestamp),
            isStale: data.is_stale || false,
          }],
          viewMode: "card" as ViewMode,
          isOpen: true,
        }];
      }
    });
  }, [isPaused]);

  useEffect(() => {
    const client = new SSEReadableClient(SSE_URL);
    sseClientRef.current = client;

    client.setCallbacks({
      onDeviceData: handleDeviceData,
      onConnected: () => {
        setConnectionStatus("connected");
      },
      onError: () => {
        setConnectionStatus("disconnected");
      },
    });

    client.connect();

    return () => {
      client.disconnect();
    };
  }, []);

  // Mark stale devices every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      setDeviceGroups((prevGroups) =>
        prevGroups.map((group) => ({
          ...group,
          devices: group.devices.map((device) => {
            const age = now - device.lastSeen.getTime();
            if (age > STALE_THRESHOLD_MS && !device.isStale) {
              return { ...device, isStale: true };
            }
            return device;
          }),
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleResume = () => {
    // Flush paused data
    for (const [, data] of pausedDataRef.current) {
      handleDeviceData(data);
    }
    pausedDataRef.current.clear();
    setPausedDataCount(0);
    setIsPaused(false);
  };

  const toggleGroupViewMode = (deviceType: string) => {
    setDeviceGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.deviceType !== deviceType) return group;
        return {
          ...group,
          viewMode: group.viewMode === "card" ? "table" : "card",
        };
      })
    );
  };

  const toggleGroupOpen = (deviceType: string) => {
    setDeviceGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.deviceType !== deviceType) return group;
        return {
          ...group,
          isOpen: !group.isOpen,
        };
      })
    );
  };

  const totalDevices = deviceGroups.reduce((sum, g) => sum + g.devices.length, 0);

  const statusConfig = {
    connecting: {
      label: "Menghubungkan...",
      color: "text-yellow-500",
      icon: <Wifi className="h-4 w-4" />,
    },
    connected: {
      label: `Terhubung (${totalDevices} devices)`,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Realtime</h1>
          <p className="text-sm text-muted-foreground">
            Monitoring data telemetry secara real-time
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge variant="outline" className={cn("gap-1.5 px-2 sm:px-3 py-1 text-[10px] sm:text-xs", status.color)}>
            {status.icon}
            <span className={cn(connectionStatus === "connected" ? "hidden xs:inline" : "inline")}>{status.label}</span>
          </Badge>
          <div className="flex items-center gap-2">
            <Button
              variant={isPaused ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPaused((p) => !p)}
              className="gap-2 h-8 sm:h-9"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              <span className="hidden xs:inline">{isPaused ? "Lanjut" : "Pause"}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="gap-2 h-8 sm:h-9"
            >
              <RotateCw className="h-4 w-4" />
              <span className="hidden xs:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Device Groups */}
      {connectionStatus === "connecting" ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-32 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : deviceGroups.length === 0 ? (
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
        <div className="space-y-4">
          {deviceGroups.map((group) => (
            <DeviceGroupCard
              key={group.deviceType}
              group={group}
              onToggleView={() => toggleGroupViewMode(group.deviceType)}
              onToggleOpen={() => toggleGroupOpen(group.deviceType)}
            />
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
                Stream paused — {pausedDataCount} data points buffering
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

function DeviceGroupCard({
  group,
  onToggleView,
  onToggleOpen,
}: {
  group: DeviceGroup;
  onToggleView: () => void;
  onToggleOpen: () => void;
}) {
  const { deviceType, devices, viewMode, isOpen } = group;
  const deviceLabel = deviceType.charAt(0).toUpperCase() + deviceType.slice(1).replace(/-/g, " ");

  return (
    <Collapsible open={isOpen} onOpenChange={onToggleOpen}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onToggleOpen} className="p-0 h-auto">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
              <div>
                <CardTitle className="text-base sm:text-lg">{deviceLabel}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {devices.length} device{devices.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Badge variant={devices.some((d) => d.isStale) ? "secondary" : "default"} className="text-[10px] px-2 py-0">
                {devices.filter((d) => !d.isStale).length} online
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleView();
                }}
              >
                {viewMode === "card" ? (
                  <Table2 className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                )}
                {viewMode === "card" ? "Table" : "Card"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            {viewMode === "card" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {devices.map((device) => (
                  <DeviceCard key={device.device_sn} data={device} />
                ))}
              </div>
            ) : (
              <DeviceTable devices={devices} />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function DeviceCard({ data }: { data: DeviceCardData }) {
  const router = useRouter();
  const formatTime = (date: Date) =>
    date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const readingEntries = Object.entries(data.readings);

  return (
    <Card className={cn(
      "transition-all duration-400 relative hover:shadow-2xl border-none group hover:-translate-y-1.5",
      "bg-white shadow-sm dark:bg-[#222222] dark:shadow-none dark:ring-1 dark:ring-white/5",
      data.isStale && "opacity-60"
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-1">
          <CardTitle className="text-base font-bold truncate text-foreground/90 group-hover:text-primary transition-colors">
            {data.device_name || "Sensor Node"}
          </CardTitle>
          <Badge 
            variant={data.isStale ? "secondary" : "default"} 
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter",
              !data.isStale && "bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-200"
            )}
          >
            {data.isStale ? "Offline" : "Live"}
          </Badge>
        </div>
        <div className="flex items-center">
          <span className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-wider truncate">
            {data.device_sn}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Readings - Show all */}
        <div className="space-y-2">
          {readingEntries.length > 0 ? (
            readingEntries.map(([key, value]) => (
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
        </div>

        {/* Timestamp */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {formatTime(data.lastSeen)}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold border-primary/20 hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 shadow-sm"
            onClick={() => router.push(`/dashboard/device/${snToGuid.get(data.device_sn)}`)}
          >
            Lihat Detail
            <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DeviceTable({ devices }: { devices: DeviceCardData[] }) {
  const router = useRouter();
  // Collect all unique reading keys across all devices
  const allReadingKeys = Array.from(
    devices.reduce<Set<string>>((keys, device) => {
      Object.keys(device.readings).forEach((key) => keys.add(key));
      return keys;
    }, new Set())
  ).sort();

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className="rounded-2xl overflow-hidden border border-border/50 bg-card/30 backdrop-blur-md shadow-xl">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm border-collapse min-w-[1000px]">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="sticky left-0 z-20 bg-muted/95 backdrop-blur-sm px-3 py-4 text-left font-bold text-muted-foreground uppercase tracking-widest text-[9px] border-r border-border/50 w-[120px] min-w-[120px]">Device Name</th>
              <th className="px-6 py-4 text-center font-bold text-muted-foreground uppercase tracking-widest text-[9px]">Device SN</th>
              <th className="px-6 py-4 text-center font-bold text-muted-foreground uppercase tracking-widest text-[9px]">Status</th>
              {allReadingKeys.map((key) => (
                <th key={key} className="px-6 py-4 text-center font-bold text-muted-foreground uppercase tracking-widest text-[9px] capitalize min-w-[100px]">
                  {key}
                </th>
              ))}
              <th className="px-6 py-4 text-center font-bold text-muted-foreground uppercase tracking-widest text-[9px]">Last Seen</th>
              <th className="px-6 py-4 text-center font-bold text-muted-foreground uppercase tracking-widest text-[9px]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {devices.map((device) => (
              <tr key={device.device_sn} className={cn("hover:bg-primary/5 even:bg-muted/5 transition-colors h-16", device.isStale && "opacity-60")}>
                <td className="sticky left-0 z-10 bg-card/95 backdrop-blur-sm px-3 py-4 text-left font-semibold border-r border-border/50 whitespace-nowrap text-[10px] sm:text-sm">
                  {device.device_name || "Sensor Node"}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="font-mono text-[10px] bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-wider">
                    {device.device_sn}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <Badge 
                    variant={device.isStale ? "secondary" : "default"} 
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter",
                      !device.isStale && "bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-200"
                    )}
                  >
                    {device.isStale ? "Offline" : "Live"}
                  </Badge>
                </td>
                {allReadingKeys.map((key) => (
                  <td key={key} className="px-6 py-4 text-center font-mono font-medium whitespace-nowrap">
                    <span className="px-2 py-1 rounded-md bg-muted/20">
                      {device.readings[key] !== undefined
                        ? typeof device.readings[key] === "number"
                          ? device.readings[key].toFixed(2)
                          : device.readings[key]
                        : "-"}
                    </span>
                  </td>
                ))}
                <td className="px-6 py-4 text-center text-muted-foreground font-mono text-[10px] whitespace-nowrap">
                  {formatTime(device.lastSeen)}
                </td>
                <td className="px-6 py-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary transition-all"
                    onClick={() => router.push(`/dashboard/device/${snToGuid.get(device.device_sn)}`)}
                    title="View Detail"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}