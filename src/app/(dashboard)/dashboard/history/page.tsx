"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deviceApi } from "@/lib/api/devices";
import { telemetryApi } from "@/lib/api/telemetry";
import { History, Search, HardDrive, ArrowRight, Calendar, Layers, Settings2 } from "lucide-react";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function HistoryListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  const { data: devices, isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: () => deviceApi.list({ limit: 1000 }),
  });

  const filteredDevices = (devices?.items ?? []).filter((device) => {
    const deviceName = device.name || device.alias || "";
    const serialNumber = device.serial_number || "";
    const matchesSearch =
      search === "" ||
      deviceName.toLowerCase().includes(search.toLowerCase()) ||
      serialNumber.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === "all" || device.type === selectedType;
    return matchesSearch && matchesType;
  });

  const deviceTypes = Array.from(
    new Set((devices?.items ?? []).map((d) => d.type).filter(Boolean))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <h3 className="text-muted-foreground">
          Pilih device untuk melihat data telemetry historis
        </h3>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari device..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("all")}
                className="gap-2"
              >
                <Layers className="h-4 w-4" />
                Semua
              </Button>
              {deviceTypes.map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  className="gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  {type}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="h-32 animate-pulse" />
          ))}
        </div>
      ) : filteredDevices?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <HardDrive className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Tidak ada device</h3>
            <h3 className="text-muted-foreground text-sm">
              {search ? "Tidak ada device yang cocok dengan pencarian" : "Belum ada device yang terdaftar"}
            </h3>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDevices?.map((device) => (
            <Card
              key={device.guid}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => router.push(`/dashboard/history/${device.guid}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm truncate">{device.name}</CardTitle>
                    <h3 className="text-xs text-muted-foreground font-mono mt-1">
                      {device.serial_number}
                    </h3>
                  </div>
                    <Badge variant="outline" className="ml-2 shrink-0 capitalize">
                    {device.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <History className="h-3 w-3" />
                    <span>Telemetry history</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Compare History Section */}
      <div className="pt-8 border-t">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Compare History</h2>
          <p className="text-muted-foreground text-sm">
            Bandingkan telemetry dari 2 device berbeda secara side-by-side
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartPanel deviceList={devices?.items ?? []} />
          <ChartPanel deviceList={devices?.items ?? []} />
        </div>
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

  const { data: historyResult, isLoading } = useQuery({
    queryKey: ["telemetry-history", currentDevice?.serial_number, selectedPreset],
    queryFn: () => {
      if (!currentDevice?.serial_number) return null;
      const end = new Date();
      const start = new Date(end.getTime() - selectedPreset * 60 * 60 * 1000);
      return telemetryApi.history(currentDevice.serial_number, {
        start: start.toISOString(),
        stop: end.toISOString(),
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
                 deviceList.find((d) => d.guid === selectedGuid)?.name || 
                 "Pilih device"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-[200px] z-[9999]">
              {deviceList.map((d) => (
                <SelectItem key={d.guid} value={d.guid}>
                  {d.alias || d.name || d.serial_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="rounded-lg">{currentDevice?.serial_number || "-"}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1 mt-3">
          {TIME_PRESETS.map((p) => (
            <Button
              key={p.hours}
              variant={selectedPreset === p.hours ? "default" : "outline"}
              size="xs"
              onClick={() => setSelectedPreset(p.hours)}
            >
              {p.label}
            </Button>
          ))}
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