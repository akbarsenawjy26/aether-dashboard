"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { SSEReadableClient, SSEDeviceData } from "@/lib/sse/sseClientFetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { telemetryApi } from "@/lib/api/telemetry";
import { deviceApi } from "@/lib/api/devices";
import dynamic from "next/dynamic";
import { ArrowLeft, ChevronLeft, ChevronRight, Wifi, WifiOff, Clock, Radio } from "lucide-react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
// SSE endpoint: /telemetry/stream for all devices
// or /telemetry/stream/:device_sn for single device
const SSE_BASE = `${API_BASE}/telemetry/stream`;

// Helper to build SSE URL for specific device
// /telemetry/stream -> all devices
// /telemetry/stream/:device_sn -> specific device
export const getSSEUrl = (deviceSn?: string) =>
  deviceSn ? `${SSE_BASE}/${deviceSn}` : SSE_BASE;

const TIME_PRESETS = [
  { label: "1 Jam", hours: 1 },
  { label: "6 Jam", hours: 6 },
  { label: "24 Jam", hours: 24 },
  { label: "7 Hari", hours: 168 },
];

interface DeviceCardData extends SSEDeviceData {
  lastSeen: Date;
  isStale: boolean;
}

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceGuid = params.guid as string;

  // Fetch device info to get device_sn for SSE
  const { data: deviceInfo } = useQuery({
    queryKey: ["device", deviceGuid],
    queryFn: () => deviceApi.get(deviceGuid!),
    enabled: !!deviceGuid,
  });

  const deviceSn = useMemo(
    () => deviceInfo?.data?.data?.serial_number,
    [deviceInfo?.data?.data?.serial_number]
  );

  // Real-time state
  const [deviceData, setDeviceData] = useState<DeviceCardData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const sseClientRef = useRef<SSEReadableClient | null>(null);

  // History state
  const [selectedPreset, setSelectedPreset] = useState(24);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const STALE_THRESHOLD_MS = 30_000;

  // Connect to SSE for real-time data
  // deviceSn comes from deviceInfo query (serial_number), not from route param (guid)
  useEffect(() => {
    if (!deviceSn) return;

    const client = new SSEReadableClient(getSSEUrl(deviceSn));
    sseClientRef.current = client;

    client.setCallbacks({
      onDeviceData: (data) => {
        setConnectionStatus("connected");
        setDeviceData({
          ...data,
          lastSeen: new Date(),
          isStale: false,
        });
      },
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
  }, [deviceSn]);

  // Stale detection
  useEffect(() => {
    const interval = setInterval(() => {
      setDeviceData((prev) => {
        if (!prev) return prev;
        const age = Date.now() - prev.lastSeen.getTime();
        if (age > STALE_THRESHOLD_MS && !prev.isStale) {
          return { ...prev, isStale: true };
        }
        return prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Fetch history with TanStack Query
  const end = new Date();
  const start = new Date(end.getTime() - selectedPreset * 60 * 60 * 1000);

  const { isLoading: historyLoading, data: historyResponse } = useQuery({
    queryKey: ["telemetry-history", deviceSn, selectedPreset, historyPage, limit],
    queryFn: () =>
      telemetryApi.history(deviceSn!, {
        start: start.toISOString(),
        stop: end.toISOString(),
        limit: limit,
        order: "desc",
        page: historyPage,
      }),
    enabled: !!deviceSn,
  });

  // Transform history response to chart data
  const historyRecords = historyResponse?.data?.data ?? [];

  // Derived state using useMemo (no setState in effect)
  const tableData = useMemo(() => historyRecords, [historyRecords]);

  const chartData = useMemo(() => {
    if (historyRecords.length === 0) return [];
    return historyRecords
      .map((record) => ({
        timestamp: record.timestamp,
        ...record.fields,
      }))
      .reverse();
  }, [historyRecords]);

  const availableSeries = useMemo(() => {
    if (historyRecords.length === 0) return [];
    const fieldKeys = new Set<string>();
    historyRecords.forEach((record) => {
      Object.keys(record.fields).forEach((key) => fieldKeys.add(key));
    });
    return Array.from(fieldKeys);
  }, [historyRecords]);

  // Reset selected series when history changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting selection when time range changes is intentional
    // setSelectedSeries([]);
  }, [historyRecords]);

  // Update hasMore
  const hasMore = historyResponse?.data?.pagination?.has_more ?? false;

  const toggleSeries = (series: string) => {
    setSelectedSeries((prev) =>
      prev.includes(series)
        ? prev.filter((s) => s !== series)
        : [...prev, series]
    );
  };

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(String(ts)).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(ts);
    }
  };

  const VIBRANT_COLORS = [
    "#FF5722", // Deep Orange
    "#2196F3", // Blue
    "#4CAF50", // Green
    "#FFC107", // Amber
    "#9C27B0", // Purple
    "#00BCD4", // Cyan
    "#E91E63", // Pink
    "#FF9800", // Orange
  ];

  const getSeriesColor = (name: string, index: number) => {
    const n = name.toLowerCase();
    const safeIndex = Math.max(0, index);
    if (n.includes("temp")) return "#FF5722";
    if (n.includes("humi")) return "#2196F3";
    if (n.includes("press")) return "#4CAF50";
    if (n.includes("volt")) return "#FFC107";
    if (n.includes("curr")) return "#9C27B0";
    if (n.includes("batt")) return "#4CAF50";
    return VIBRANT_COLORS[safeIndex % VIBRANT_COLORS.length] || VIBRANT_COLORS[0];
  };

  const chartSeries = availableSeries
    .filter((s) => selectedSeries.length === 0 || selectedSeries.includes(s))
    .map((series) => ({
      name: series,
      data: chartData.map((d: any) => ({
        x: new Date(d.timestamp).getTime(),
        y: d[series]
      }))
    }));

  const readingEntries = deviceData ? Object.entries(deviceData.readings) : [];

  const handlePresetChange = (hours: number) => {
    setSelectedPreset(hours);
    setHistoryPage(1); // reset page when changing time range
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Device Detail</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="font-mono">{deviceSn?? "-"}</Badge>
              {deviceData ? (
                <Badge variant={deviceData.isStale ? "secondary" : "default"}>
                  {deviceData.isStale ? "Stale" : "Live"}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 px-3 py-1",
              connectionStatus === "connected" && "text-green-500",
              connectionStatus === "connecting" && "text-yellow-500",
              connectionStatus === "disconnected" && "text-red-500"
            )}
          >
            {connectionStatus === "connected" ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            {connectionStatus === "connected" ? "Terhubung" : 
             connectionStatus === "connecting" ? "Menghubungkan..." : "Terputus"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Real-time Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Realtime
            </CardTitle>
            <CardDescription>Data terakhir dari device</CardDescription>
          </CardHeader>
          <CardContent>
            {deviceData ? (
              <div className="space-y-4">
                {/* Readings */}
                <div className="space-y-2">
                  {readingEntries.length > 0 ? (
                    readingEntries.map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground capitalize">{key}</span>
                        <span className="text-lg font-mono font-medium">
                          {typeof value === "number" ? value.toFixed(2) : value}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No readings</p>
                  )}
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {deviceData.lastSeen.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* History Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>
              {chartData.length > 0 ? `${chartData.length} data points` : "Pilih rentang waktu"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex gap-2">
                {TIME_PRESETS.map((preset) => (
                  <Button
                    key={preset.hours}
                    variant={selectedPreset === preset.hours ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetChange(preset.hours)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Series Toggle */}
            {availableSeries.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {availableSeries.map((series) => (
                  <Button
                    key={series}
                    variant={selectedSeries.includes(series) || selectedSeries.length === 0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSeries(series)}
                    className="text-xs"
                  >
                    {series}
                  </Button>
                ))}
              </div>
            )}

            {/* Chart */}
            {historyLoading ? (
              <Skeleton className="h-64 sm:h-80 w-full" />
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 sm:h-80 text-center">
                <p className="text-muted-foreground">Tidak ada data untuk rentang waktu ini</p>
              </div>
            ) : (
              <div className="h-64 sm:h-80 overflow-hidden">
                <Chart
                  type="area"
                  height="100%"
                  series={chartSeries}
                  options={{
                    chart: {
                      id: "telemetry-chart",
                      toolbar: { show: false },
                      zoom: { enabled: false },
                      fontFamily: 'inherit',
                    },
                    colors: availableSeries.filter((s) => selectedSeries.length === 0 || selectedSeries.includes(s)).length > 0
                      ? availableSeries
                          .filter((s) => selectedSeries.length === 0 || selectedSeries.includes(s))
                          .map((s, i) => getSeriesColor(s, availableSeries.indexOf(s) >= 0 ? availableSeries.indexOf(s) : i))
                      : VIBRANT_COLORS,
                    dataLabels: { enabled: false },
                    stroke: { curve: 'smooth', width: 3 },
                    fill: {
                      type: 'gradient',
                      gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.6,
                        opacityTo: 0.05,
                        stops: [20, 100]
                      }
                    },
                    xaxis: {
                      type: 'datetime',
                      labels: {
                        style: { fontSize: '11px', colors: '#94a3b8' },
                        datetimeUTC: false,
                      },
                      axisBorder: { show: false },
                      axisTicks: { show: false },
                    },
                    yaxis: {
                      labels: {
                        style: { fontSize: '11px', colors: '#94a3b8' },
                      },
                    },
                    tooltip: {
                      x: { format: 'dd MMM, HH:mm' },
                      theme: 'light',
                    },
                    grid: {
                      borderColor: 'rgba(0,0,0,0.05)',
                      strokeDashArray: 4,
                    },
                    legend: {
                      show: true,
                      position: 'top',
                      horizontalAlign: 'right',
                      fontSize: '11px',
                    },
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Data Table</CardTitle>
                <CardDescription>
                  {tableData.length > 0
                    ? `${tableData.length} records · Halaman ${historyPage}`
                    : "Tidak ada data"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : tableData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <p className="text-muted-foreground">Tidak ada data untuk rentang waktu ini</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden border-none shadow-none">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-muted/50 border-none">
                      <tr>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Timestamp
                        </th>
                        {availableSeries.map((key) => (
                          <th key={key} className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-none">
                      {tableData.map((record, i) => (
                        <tr key={i} className="hover:bg-muted/50 even:bg-muted/30 transition-colors h-16 border-none">
                          <td className="px-6 py-4 text-center font-mono text-xs">
                            {formatTimestamp(record.timestamp)}
                          </td>
                          {availableSeries.map((key) => {
                            const val = record.fields[key];
                            return (
                              <td key={key} className="px-6 py-4 text-center font-mono text-xs">
                                {val !== undefined
                                  ? typeof val === "number"
                                    ? val.toFixed(4)
                                    : String(val)
                                  : "-"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination below table */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Tampilkan</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setHistoryPage(1);
                      }}
                      className="h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm outline-none focus:ring-1 focus:ring-primary"
                    >
                      {[10, 20, 50, 100].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-muted-foreground">baris</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Sebelumnya
                    </Button>
                    <div className="flex items-center gap-1 px-2 text-xs font-medium">
                      <span>Hal. {historyPage}</span>
                      {hasMore && <span className="text-muted-foreground">...</span>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => setHistoryPage((p) => p + 1)}
                      disabled={!hasMore}
                    >
                      Selanjutnya
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
