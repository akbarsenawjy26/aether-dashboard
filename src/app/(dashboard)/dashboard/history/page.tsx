"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deviceApi } from "@/lib/api/devices";
import { telemetryApi } from "@/lib/api/telemetry";
import { HardDrive } from "lucide-react";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function HistoryListPage() {
  const { data: devices } = useQuery({
    queryKey: ["devices"],
    queryFn: () => deviceApi.list({ limit: 1000 }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compare History</h1>
        <p className="text-muted-foreground">
          Bandingkan telemetry dari beberapa device secara side-by-side
        </p>
      </div>

      {/* Compare History Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartPanel deviceList={devices?.items ?? []} />
        <ChartPanel deviceList={devices?.items ?? []} />
      </div>
    </div>
  );
}

const TIME_PRESETS = [
  { label: "1 Jam", hours: 1 },
  { label: "6 Jam", hours: 6 },
  { label: "24 Jam", hours: 24 },
  { label: "7 Hari", hours: 168 },
];

const SERIES_COLORS = ["#10392d", "#3b82f6", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];

function ChartPanel({ deviceList }: { deviceList: any[] }) {
  const [selectedGuid, setSelectedGuid] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState(24);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);

  // Automatically select the first device once the list is loaded
  useMemo(() => {
    if (!selectedGuid && deviceList.length > 0) {
      setSelectedGuid(deviceList[0].guid);
    }
  }, [deviceList, selectedGuid]);

  const currentDevice = useMemo(
    () => (Array.isArray(deviceList) ? deviceList.find((d) => d.guid === selectedGuid) : null),
    [deviceList, selectedGuid]
  );

  const { data: historyResult, isLoading, refetch } = useQuery({
    queryKey: ["telemetry-history", currentDevice?.serial_number, selectedPreset, customStart, customEnd],
    queryFn: () => {
      if (!currentDevice?.serial_number) return null;

      let start: string;
      let stop: string;

      if (selectedPreset === -1) {
        start = customStart ? new Date(customStart).toISOString() : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        stop = customEnd ? new Date(customEnd).toISOString() : new Date().toISOString();
      } else {
        const endDt = new Date();
        const startDt = new Date(endDt.getTime() - selectedPreset * 60 * 60 * 1000);
        start = startDt.toISOString();
        stop = endDt.toISOString();
      }

      return telemetryApi.history(currentDevice.serial_number, {
        start,
        stop,
        limit: 100,
        order: "desc",
      }).then(r => r.data);
    },
    enabled: !!currentDevice?.serial_number,
  });

  const chartData = useMemo(() => {
    return (historyResult?.data ?? []).map((record: any) => ({
      timestamp: record.timestamp,
      ...record.fields,
    })).reverse();
  }, [historyResult]);

  const availableSeries = useMemo(() => {
    if (!chartData.length) return [];
    const keys = new Set<string>();
    chartData.forEach((r: any) => Object.keys(r).forEach(k => k !== 'timestamp' && keys.add(k)));
    return Array.from(keys);
  }, [chartData]);

  const toggleSeries = useCallback((series: string) => {
    setSelectedSeries((prev) =>
      prev.includes(series) ? prev.filter((s) => s !== series) : [...prev, series]
    );
  }, []);

  const displaySeries = selectedSeries.length > 0 ? selectedSeries : availableSeries;

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

  const seriesData = displaySeries.map((series) => ({
    name: series,
    data: chartData.map((d: any) => ({
      x: new Date(d.timestamp).getTime(),
      y: d[series]
    }))
  }));

  return (
    <Card className="rounded-3xl shadow-md border-none overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Select value={selectedGuid} onValueChange={(v) => v && setSelectedGuid(v)}>
            <SelectTrigger className="w-[200px] rounded-xl border-none bg-muted/50">
              <SelectValue placeholder="Pilih device">
                {deviceList.find((d) => d.guid === selectedGuid)?.alias || 
                 deviceList.find((d) => d.guid === selectedGuid)?.serial_number || 
                 "Pilih device"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-[200px] z-[9999]">
              {deviceList.map((d) => (
                <SelectItem key={d.guid} value={d.guid}>
                  {d.alias || d.serial_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="rounded-lg">{currentDevice?.serial_number || "-"}</Badge>
        </div>
        <div className="space-y-4 mt-3">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {TIME_PRESETS.map((p) => (
              <Button
                key={p.hours}
                variant={selectedPreset === p.hours ? "default" : "outline"}
                size="xs"
                onClick={() => setSelectedPreset(p.hours)}
                className="rounded-lg h-7 text-[10px] px-2 sm:px-3"
              >
                {p.label}
              </Button>
            ))}
            <Button
              variant={selectedPreset === -1 ? "default" : "outline"}
              size="xs"
              onClick={() => setSelectedPreset(-1)}
              className="rounded-lg h-7 text-[10px]"
            >
              Custom
            </Button>
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
                    className="bg-transparent border-none text-[11px] focus:ring-0 outline-none w-full min-w-0"
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
                    className="bg-transparent border-none text-[11px] focus:ring-0 outline-none w-full min-w-0"
                  />
                </div>
              </div>
              <Button 
                size="xs" 
                className="h-9 sm:h-10 rounded-lg text-[10px] px-4 font-bold shadow-md shadow-primary/20 w-full lg:w-auto"
                onClick={() => refetch()}
              >
                Terapkan
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-60 w-full rounded-2xl" />
        ) : chartData.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center text-muted-foreground text-xs text-center">
            <HardDrive className="h-8 w-8 mb-2 opacity-20" />
            <p>Tidak ada data</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1">
              {availableSeries.map((series, idx) => {
                const isActive = selectedSeries.includes(series) || selectedSeries.length === 0;
                const color = getSeriesColor(series, idx);
                return (
                  <Button
                    key={series}
                    variant={isActive ? "default" : "outline"}
                    size="xs"
                    onClick={() => toggleSeries(series)}
                    style={{
                      backgroundColor: isActive ? color : undefined,
                      borderColor: color,
                      color: isActive ? "#fff" : color,
                    }}
                    className="gap-1"
                  >
                    <div 
                      className="h-1.5 w-1.5 rounded-full" 
                      style={{ backgroundColor: isActive ? "#fff" : color }}
                    />
                    {series}
                  </Button>
                );
              })}
            </div>
            <div className="h-64">
              <Chart
                type="area"
                height="100%"
                series={seriesData}
                options={{
                  chart: {
                    id: "telemetry-chart",
                    toolbar: { show: false },
                    zoom: { enabled: false },
                    fontFamily: 'inherit',
                  },
                  colors: displaySeries.length > 0 
                    ? displaySeries.map((s, i) => getSeriesColor(s, availableSeries.indexOf(s) >= 0 ? availableSeries.indexOf(s) : i))
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
                      style: { fontSize: '10px', colors: '#94a3b8' },
                      datetimeUTC: false,
                    },
                    axisBorder: { show: false },
                    axisTicks: { show: false },
                  },
                  yaxis: {
                    labels: {
                      style: { fontSize: '10px', colors: '#94a3b8' },
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
                  legend: { show: false }
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}