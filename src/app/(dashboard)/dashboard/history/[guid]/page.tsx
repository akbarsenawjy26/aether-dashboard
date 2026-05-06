"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Calendar, BarChart3 } from "lucide-react";
import { deviceApi } from "@/lib/api/devices";
import { telemetryApi } from "@/lib/api/telemetry";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { cn } from "@/lib/utils";

const TIME_PRESETS = [
  { label: "1 Jam", hours: 1 },
  { label: "6 Jam", hours: 6 },
  { label: "24 Jam", hours: 24 },
  { label: "7 Hari", hours: 168 },
];

const PAGE_SIZE = 100;

interface ChartConfig {
  timePreset: number;
  selectedField: string;
  deviceGuid: string;
  deviceSn: string;
}

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();
  const deviceGuid = params.guid as string;

  // Device list for cross-device comparison
  const { data: allDevicesData } = useQuery({
    queryKey: ["devices-all"],
    queryFn: () => deviceApi.list({ limit: 1000 }),
  });

  // Fetch current device info
  const { data: currentDevice } = useQuery({
    queryKey: ["device", deviceGuid],
    queryFn: () => deviceApi.get(deviceGuid!).then((r) => r.data.data),
    enabled: !!deviceGuid,
  });

  const currentDeviceSn = useMemo(
    () => currentDevice?.serial_number,
    [currentDevice?.serial_number]
  );

  // Two independent chart configs
  const [chart1Config, setChart1Config] = useState<ChartConfig>({
    timePreset: 24,
    selectedField: "",
    deviceGuid,
    deviceSn: currentDeviceSn ?? "",
  });

  const [chart2Config, setChart2Config] = useState<ChartConfig>({
    timePreset: 24,
    selectedField: "",
    deviceGuid,
    deviceSn: currentDeviceSn ?? "",
  });

  // Sync deviceGuid when page loads/changes
  useMemo(() => {
    if (currentDeviceSn && chart1Config.deviceGuid === deviceGuid) {
      setChart1Config((c) => ({ ...c, deviceSn: currentDeviceSn }));
    }
  }, [currentDeviceSn, deviceGuid]);

  // Query for chart 1
  const { data: chart1Data, isLoading: chart1Loading } = useQuery({
    queryKey: ["history-chart", chart1Config.deviceSn, chart1Config.timePreset],
    queryFn: () => {
      const end = new Date();
      const start = new Date(end.getTime() - chart1Config.timePreset * 60 * 60 * 1000);
      return telemetryApi
        .history(chart1Config.deviceSn, {
          start: start.toISOString(),
          stop: end.toISOString(),
          limit: PAGE_SIZE,
          order: "desc",
          page: 1,
        })
        .then((r) => r.data);
    },
    enabled: !!chart1Config.deviceSn,
  });

  // Query for chart 2
  const { data: chart2Data, isLoading: chart2Loading } = useQuery({
    queryKey: ["history-chart-2", chart2Config.deviceSn, chart2Config.timePreset],
    queryFn: () => {
      const end = new Date();
      const start = new Date(end.getTime() - chart2Config.timePreset * 60 * 60 * 1000);
      return telemetryApi
        .history(chart2Config.deviceSn, {
          start: start.toISOString(),
          stop: end.toISOString(),
          limit: PAGE_SIZE,
          order: "desc",
          page: 1,
        })
        .then((r) => r.data);
    },
    enabled: !!chart2Config.deviceSn,
  });

  // All available fields from both charts
  const allFields = useMemo(() => {
    const fields = new Set<string>();
    chart1Data?.data?.forEach((r) => Object.keys(r.fields).forEach((k) => fields.add(k)));
    chart2Data?.data?.forEach((r) => Object.keys(r.fields).forEach((k) => fields.add(k)));
    return Array.from(fields);
  }, [chart1Data, chart2Data]);

  const transformData = (data: typeof chart1Data) =>
    data?.data
      ? data.data
          .map((record) => ({
            timestamp: record.timestamp,
            ...record.fields,
          }))
          .reverse()
      : [];

  const chart1Series = useMemo(
    () => transformData(chart1Data),
    [chart1Data]
  );

  const chart2Series = useMemo(
    () => transformData(chart2Data),
    [chart2Data]
  );

  const seriesColors = ["#10392d", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

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

  const getDeviceName = (guid: string) => {
    const dev = allDevicesData?.items?.find((d) => d.guid === guid);
    return dev ? `${dev.name} (${dev.serial_number})` : guid;
  };

  const getDeviceSn = (guid: string) => {
    return allDevicesData?.items?.find((d) => d.guid === guid)?.serial_number ?? "";
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
            <h1 className="text-3xl font-bold tracking-tight">History Compare</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              {currentDevice ? (
                <>
                  <Badge variant="outline">{currentDeviceSn}</Badge>
                  {currentDevice.name}
                </>
              ) : (
                <Skeleton className="h-4 w-48" />
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 2 Chart Panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart 1 */}
        <ChartPanel
          title="Chart 1"
          config={chart1Config}
          setConfig={setChart1Config}
          data={chart1Series}
          allFields={allFields}
          allDevices={allDevicesData?.items ?? []}
          isLoading={chart1Loading}
          seriesColors={seriesColors}
          formatTimestamp={formatTimestamp}
          getDeviceName={getDeviceName}
          getDeviceSn={getDeviceSn}
        />

        {/* Chart 2 */}
        <ChartPanel
          title="Chart 2"
          config={chart2Config}
          setConfig={setChart2Config}
          data={chart2Series}
          allFields={allFields}
          allDevices={allDevicesData?.items ?? []}
          isLoading={chart2Loading}
          seriesColors={seriesColors}
          formatTimestamp={formatTimestamp}
          getDeviceName={getDeviceName}
          getDeviceSn={getDeviceSn}
        />
      </div>
    </div>
  );
}

// ─── Chart Panel Component ───────────────────────────────────────────────
interface ChartPanelProps {
  title: string;
  config: ChartConfig;
  setConfig: React.Dispatch<React.SetStateAction<ChartConfig>>;
  data: Array<Record<string, unknown>>;
  allFields: string[];
  allDevices: Array<{ guid: string; name: string; serial_number: string }>;
  isLoading: boolean;
  seriesColors: string[];
  formatTimestamp: (ts: string) => string;
  getDeviceName: (guid: string) => string;
  getDeviceSn: (guid: string) => string;
}

function ChartPanel({
  title,
  config,
  setConfig,
  data,
  allFields,
  allDevices,
  isLoading,
  seriesColors,
  formatTimestamp,
  getDeviceName,
  getDeviceSn,
}: ChartPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {config.deviceSn ? (
            <span className="font-mono text-xs">{getDeviceName(config.deviceGuid)}</span>
          ) : (
            "Pilih device"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters Row */}
        <div className="flex flex-wrap gap-2">
          {/* Device selector */}
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={config.deviceGuid}
            onChange={(e) => {
              const newGuid = e.target.value;
              const newSn = getDeviceSn(newGuid);
              setConfig((c) => ({ ...c, deviceGuid: newGuid, deviceSn: newSn }));
            }}
          >
            {allDevices.map((d) => (
              <option key={d.guid} value={d.guid}>
                {d.name} ({d.serial_number})
              </option>
            ))}
          </select>

          {/* Time range */}
          {TIME_PRESETS.map((preset) => (
            <Button
              key={preset.hours}
              variant={config.timePreset === preset.hours ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() =>
                setConfig((c) => ({ ...c, timePreset: preset.hours }))
              }
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Field selector */}
        {allFields.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allFields.map((field) => (
              <Button
                key={field}
                variant={config.selectedField === field ? "default" : "secondary"}
                size="sm"
                className="h-7 text-xs"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    selectedField: c.selectedField === field ? "" : field,
                  }))
                }
              >
                {field}
              </Button>
            ))}
          </div>
        )}

        {/* Chart */}
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground text-sm">Tidak ada data</p>
          </div>
        ) : (
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTimestamp}
                  fontSize={10}
                  tickMargin={6}
                  interval="preserveStartEnd"
                />
                <YAxis fontSize={10} width={40} />
                <Tooltip
                  labelFormatter={(label) => formatTimestamp(String(label))}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: "11px",
                  }}
                />
                <Legend iconSize={8} iconType="line" />
                {(
                  config.selectedField
                    ? [config.selectedField]
                    : allFields
                ).map((field, i) => (
                  <Line
                    key={field}
                    type="monotone"
                    dataKey={field}
                    stroke={seriesColors[i % seriesColors.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center">
          {data.length} data points
        </p>
      </CardContent>
    </Card>
  );
}