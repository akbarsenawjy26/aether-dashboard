"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deviceApi } from "@/lib/api/devices";
import { telemetryApi } from "@/lib/api/telemetry";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const TIME_PRESETS = [
  { label: "1 Jam", hours: 1 },
  { label: "6 Jam", hours: 6 },
  { label: "24 Jam", hours: 24 },
  { label: "7 Hari", hours: 168 },
];

const PAGE_SIZE = 100;
const SERIES_COLORS = ["#10392d", "#3b82f6", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];

interface ChartPanelProps {
  deviceList: Array<{ guid: string; serial_number: string; name: string }>;
  initialDeviceGuid?: string;
  initialDeviceSn?: string;
  showDeviceSelector?: boolean;
}

function ChartPanel({ deviceList, initialDeviceGuid, initialDeviceSn, showDeviceSelector = true }: ChartPanelProps) {
  const [selectedGuid, setSelectedGuid] = useState(initialDeviceGuid || deviceList[0]?.guid);
  const [selectedPreset, setSelectedPreset] = useState(24);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);

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
      return telemetryApi
        .history(currentDevice.serial_number, {
          start: start.toISOString(),
          stop: end.toISOString(),
          limit: PAGE_SIZE,
          order: "desc",
        })
        .then((r) => r.data);
    },
    enabled: !!currentDevice?.serial_number,
  });

  const historyData = historyResult?.data ?? [];

  const chartData = useMemo(
    () =>
      historyData
        .map((record) => ({
          timestamp: record.timestamp,
          ...record.fields,
        }))
        .reverse(),
    [historyData]
  );

  const availableSeries = useMemo(() => {
    if (!historyData.length) return [];
    const keys = new Set<string>();
    historyData.forEach((r) => Object.keys(r.fields).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [historyData]);

  const toggleSeries = useCallback((series: string) => {
    setSelectedSeries((prev) =>
      prev.includes(series) ? prev.filter((s) => s !== series) : [...prev, series]
    );
  }, []);

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return ts;
    }
  };

  const displaySeries = selectedSeries.length > 0 ? selectedSeries : availableSeries;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {showDeviceSelector ? (
              <Select value={selectedGuid} onValueChange={(v) => v && setSelectedGuid(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Pilih device" />
                </SelectTrigger>
                <SelectContent>
                  {deviceList.map((d) => (
                    <SelectItem key={d.guid} value={d.guid}>
                      {d.name} ({d.serial_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <CardTitle>{currentDevice?.name || "Loading..."}</CardTitle>
            )}
          </div>
          <Badge variant="outline">{currentDevice?.serial_number}</Badge>
        </div>

        {/* Time preset */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Rentang:</span>
          {TIME_PRESETS.map((preset) => (
            <Button
              key={preset.hours}
              variant={selectedPreset === preset.hours ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPreset(preset.hours)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 sm:h-80 w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 sm:h-80 text-center">
            <p className="text-muted-foreground">Tidak ada data</p>
            <p className="text-xs text-muted-foreground mt-1">
              Coba pilih rentang waktu lain
            </p>
          </div>
        ) : (
          <>
            {/* Series toggle */}
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

            <div className="h-64 sm:h-80 overflow-hidden">
              <Chart
                type="area"
                height="100%"
                series={displaySeries.map((series) => ({
                  name: series,
                  data: chartData.map((d: any) => ({
                    x: new Date(d.timestamp).getTime(),
                    y: d[series]
                  }))
                }))}
                options={{
                  chart: {
                    id: "telemetry-chart",
                    toolbar: { show: false },
                    zoom: { enabled: false },
                    fontFamily: 'inherit',
                  },
                  dataLabels: { enabled: false },
                  stroke: { curve: 'smooth', width: 2 },
                  colors: SERIES_COLORS,
                  fill: {
                    type: 'gradient',
                    gradient: {
                      shadeIntensity: 1,
                      opacityFrom: 0.45,
                      opacityTo: 0.05,
                      stops: [20, 100, 100, 100]
                    }
                  },
                  xaxis: {
                    type: 'datetime',
                    labels: {
                      style: { fontSize: '11px', colors: '#64748b' },
                      datetimeUTC: false,
                    },
                    axisBorder: { show: false },
                    axisTicks: { show: false },
                  },
                  yaxis: {
                    labels: {
                      style: { fontSize: '11px', colors: '#64748b' },
                    },
                  },
                  tooltip: {
                    x: { format: 'dd MMM, HH:mm' },
                    theme: 'light',
                  },
                  grid: {
                    borderColor: '#f1f5f9',
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
            <p className="text-xs text-muted-foreground text-center mt-2">
              {chartData.length} data points
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();
  const deviceGuid = params.guid as string;

  // Fetch all devices for the dropdown selectors
  const { data: deviceListData } = useQuery({
    queryKey: ["devices-all"],
    queryFn: () => deviceApi.list({ limit: 100 }).then((r) => r.items),
  });

  const deviceList = deviceListData ?? [];

  // Get current device info from URL
  const currentDevice = useMemo(
    () => (Array.isArray(deviceList) ? deviceList.find((d) => d.guid === deviceGuid) : null),
    [deviceList, deviceGuid]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Detail History</h1>
            <p className="text-muted-foreground">
              {currentDevice?.name || "Loading..."} - {currentDevice?.serial_number}
            </p>
          </div>
        </div>
      </div>

      {/* Single Chart */}
      <ChartPanel
        deviceList={deviceList}
        initialDeviceGuid={deviceGuid}
        initialDeviceSn={currentDevice?.serial_number}
        showDeviceSelector={false}
      />
    </div>
  );
}
