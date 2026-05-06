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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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
    () => deviceList.find((d) => d.guid === selectedGuid),
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

            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTimestamp}
                    fontSize={11}
                    tickMargin={6}
                    interval="preserveStartEnd"
                  />
                  <YAxis fontSize={11} width={40} />
                  <Tooltip
                    labelFormatter={(label) => formatTimestamp(String(label))}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend iconSize={10} iconType="line" />
                  {displaySeries.map((series, i) => (
                    <Line
                      key={series}
                      type="monotone"
                      dataKey={series}
                      stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
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
    () => deviceList.find((d) => d.guid === deviceGuid),
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
            <h1 className="text-3xl font-bold tracking-tight">Compare History</h1>
            <p className="text-muted-foreground">
              Bandingkan telemetry dari 2 device berbeda
            </p>
          </div>
        </div>
      </div>

      {/* 2 Chart Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartPanel
          deviceList={deviceList}
          initialDeviceGuid={deviceGuid}
          initialDeviceSn={currentDevice?.serial_number}
          showDeviceSelector={true}
        />
        <ChartPanel
          deviceList={deviceList}
          showDeviceSelector={true}
        />
      </div>

      {/* Info */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            Bandingkan hingga 2 device secara side-by-side. Setiap chart punya kontrol waktu dan field yang independent.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
