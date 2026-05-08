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
import { ArrowLeft, ChevronLeft, ChevronRight, Wifi, WifiOff, Clock, Radio, Bell, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertSettings } from "@/components/device/AlertSettings";
import { toast } from "sonner";

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
  const { data: deviceInfo, refetch: refetchDevice } = useQuery({
    queryKey: ["device", deviceGuid],
    queryFn: () => deviceApi.get(deviceGuid!),
    enabled: !!deviceGuid,
    staleTime: 0,
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
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
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
  const { isLoading: historyLoading, data: historyResponse, refetch: refetchHistory } = useQuery({
    queryKey: ["telemetry-history", deviceSn, selectedPreset, customStart, customEnd, historyPage, limit],
    queryFn: () => {
      let start: string;
      let stop: string;

      if (selectedPreset === -1) {
        // Custom range
        start = customStart ? new Date(customStart).toISOString() : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        stop = customEnd ? new Date(customEnd).toISOString() : new Date().toISOString();
      } else {
        // Preset range
        const endDt = new Date();
        const startDt = new Date(endDt.getTime() - selectedPreset * 60 * 60 * 1000);
        start = startDt.toISOString();
        stop = endDt.toISOString();
      }

      return telemetryApi.history(deviceSn!, {
        start,
        stop,
        limit: limit,
        order: "desc",
        page: historyPage,
      });
    },
    enabled: !!deviceSn,
    staleTime: 0,
  });

  // Force refetch on mount
  useEffect(() => {
    if (deviceGuid) refetchDevice();
    if (deviceSn) refetchHistory();
  }, [deviceGuid, deviceSn, refetchDevice, refetchHistory]);

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

  const exportToCSV = () => {
    if (tableData.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    try {
      // Prepare headers
      const headers = ["Timestamp", ...availableSeries];
      
      // Prepare rows
      const rows = tableData.map(record => {
        const timestamp = new Date(record.timestamp).toLocaleString("id-ID");
        const values = availableSeries.map(key => {
          const val = record.fields[key];
          return val !== undefined ? val : "";
        });
        return [timestamp, ...values].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `telemetry_${deviceSn || "export"}_${new Date().getTime()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Data berhasil diekspor ke CSV");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Gagal mengekspor data");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="overflow-hidden">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight truncate">Device Detail</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline" className="font-mono text-[10px] sm:text-xs truncate">{deviceSn?? "-"}</Badge>
              {deviceData ? (
                <Badge variant={deviceData.isStale ? "secondary" : "default"} className="text-[10px] sm:text-xs">
                  {deviceData.isStale ? "Stale" : "Live"}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 px-3 py-1 text-xs",
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
            <span className="whitespace-nowrap">
              {connectionStatus === "connected" ? "Terhubung" : 
               connectionStatus === "connecting" ? "Menghubungkan..." : "Terputus"}
            </span>
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="sticky top-0 z-30 pt-2 pb-4 bg-background/80 backdrop-blur-sm">
          <Card className="shadow-lg border-primary/5 p-1">
            <TabsList className="w-full justify-start bg-muted/20 h-auto p-1 rounded-2xl flex-wrap">
              <TabsTrigger 
                value="overview" 
                className="flex-1 gap-2 sm:gap-3 py-3 sm:py-4 px-4 sm:px-12 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:bg-muted/50 hover:text-foreground rounded-2xl transition-all duration-300"
              >
                <Radio className="h-4 w-4 sm:h-5 sm:w-5" /> 
                <span className="font-bold tracking-wider text-[10px] sm:text-sm">OVERVIEW</span>
              </TabsTrigger>
              <TabsTrigger 
                value="alerts" 
                className="flex-1 gap-2 sm:gap-3 py-3 sm:py-4 px-4 sm:px-12 text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg hover:bg-muted/50 hover:text-foreground rounded-2xl transition-all duration-300"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" /> 
                <span className="font-bold tracking-wider text-[10px] sm:text-sm">ALERTS</span>
              </TabsTrigger>
            </TabsList>
          </Card>
        </div>

        <TabsContent value="overview" className="space-y-6 mt-0">
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
            <div className="space-y-4 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {TIME_PRESETS.map((preset) => (
                    <Button
                      key={preset.hours}
                      variant={selectedPreset === preset.hours ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePresetChange(preset.hours)}
                      className="text-[10px] sm:text-xs h-8 px-2 sm:px-3"
                    >
                      {preset.label}
                    </Button>
                  ))}
                  <Button
                    variant={selectedPreset === -1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetChange(-1)}
                    className="text-[10px] sm:text-xs h-8"
                  >
                    Custom
                  </Button>
                </div>
              </div>

              {selectedPreset === -1 && (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] items-end gap-2 p-2 sm:p-3 bg-muted/20 rounded-xl border border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Dari</label>
                    <div className="flex items-center gap-2 bg-background px-2 py-1.5 rounded-lg border border-border/50">
                      <input
                        type="datetime-local"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="bg-transparent border-none text-[11px] sm:text-xs focus:ring-0 outline-none w-full min-w-0"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Hingga</label>
                    <div className="flex items-center gap-2 bg-background px-2 py-1.5 rounded-lg border border-border/50">
                      <input
                        type="datetime-local"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="bg-transparent border-none text-[11px] sm:text-xs focus:ring-0 outline-none w-full min-w-0"
                      />
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="h-9 sm:h-10 rounded-lg text-xs px-4 font-bold shadow-md shadow-primary/20 w-full lg:w-auto"
                    onClick={() => refetchHistory()}
                  >
                    Terapkan
                  </Button>
                </div>
              )}
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
                        formatter: (val: number) => (val !== undefined ? val.toFixed(2) : ""),
                      },
                    },
                    tooltip: {
                      x: { format: 'dd MMM, HH:mm' },
                      y: {
                        formatter: (val: number) => (val !== undefined ? val.toFixed(2) : ""),
                      },
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
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg">Data Table</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs truncate">
                  {tableData.length > 0
                    ? `${tableData.length} records`
                    : "Tidak ada data"}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 h-8 font-bold border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm text-[10px] sm:text-xs px-2 sm:px-3"
                onClick={exportToCSV}
                disabled={tableData.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV</span>
              </Button>
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
                <div className="rounded-xl overflow-hidden border border-border/50 bg-card/50">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm border-collapse min-w-[600px]">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="sticky left-0 z-20 bg-muted/95 backdrop-blur-sm px-3 py-3 text-left text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-r border-border/50 w-[90px] min-w-[90px]">
                            Timestamp
                          </th>
                          {availableSeries.map((key) => (
                            <th key={key} className="px-6 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest min-w-[120px]">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {tableData.map((record, i) => (
                          <tr key={i} className="hover:bg-muted/50 even:bg-muted/10 transition-colors h-14">
                            <td className="sticky left-0 z-10 bg-card/95 backdrop-blur-sm px-3 py-3 text-left font-mono text-[9px] sm:text-xs border-r border-border/50 whitespace-nowrap">
                              {formatTimestamp(record.timestamp)}
                            </td>
                            {availableSeries.map((key) => {
                              const val = record.fields[key];
                              return (
                                <td key={key} className="px-6 py-3 text-center font-mono text-xs whitespace-nowrap">
                                  <span className={cn(
                                    "px-2 py-1 rounded-md bg-muted/30",
                                    typeof val === "number" && "text-primary font-bold"
                                  )}>
                                    {val !== undefined
                                      ? typeof val === "number"
                                        ? val.toFixed(2)
                                        : String(val)
                                      : "-"}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
        </TabsContent>

        <TabsContent value="alerts" className="mt-0">
          <AlertSettings deviceGuid={deviceGuid} availableParameters={availableSeries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
