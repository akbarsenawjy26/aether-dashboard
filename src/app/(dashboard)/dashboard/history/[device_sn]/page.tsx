"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { deviceApi } from "@/lib/api/devices";
import { telemetryApi } from "@/lib/api/telemetry";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ArrowLeft, Download, Calendar } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const TIME_PRESETS = [
  { label: "1 Jam", hours: 1 },
  { label: "6 Jam", hours: 6 },
  { label: "24 Jam", hours: 24 },
  { label: "7 Hari", hours: 168 },
];

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();
  const deviceSn = params.device_sn as string;

  const [selectedPreset, setSelectedPreset] = useState(24);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);

  const { data: deviceData } = useQuery({
    queryKey: ["device", deviceSn],
    queryFn: () => deviceApi.get(deviceSn).then((r) => r.data.data),
    enabled: !!deviceSn,
  });

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["telemetry-history", deviceSn, selectedPreset],
    queryFn: () => {
      const end = new Date();
      const start = new Date(end.getTime() - selectedPreset * 60 * 60 * 1000);
      return telemetryApi
        .history(deviceSn, {
          start: start.toISOString(),
          stop: end.toISOString(),
          limit: 500,
          order: "desc",
        })
        .then((r) => r.data.data); // backend: { success, data: HistoryResponse }
    },
    enabled: !!deviceSn,
    staleTime: 30000,
  });

  // Transform InfluxDB response to chart format
  const chartData = historyData
    ? historyData.values.map((row) => {
        const obj: Record<string, unknown> = {};
        historyData.columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      }).reverse()
    : [];

  const availableSeries = historyData?.columns.filter(
    (c) => c !== "timestamp" && c !== "device_sn"
  ) ?? [];

  const toggleSeries = (series: string) => {
    setSelectedSeries((prev) =>
      prev.includes(series)
        ? prev.filter((s) => s !== series)
        : [...prev, series]
    );
  };

  const handleExportCSV = () => {
    if (!historyData) return;
    const header = historyData.columns.join(",");
    const rows = historyData.values.map((row) => row.join(",")).join("\n");
    const csv = `${header}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `telemetry_${deviceSn}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const seriesColors = ["#517E68", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">History</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              {deviceData ? (
                <>
                  <Badge variant="outline">{deviceSn}</Badge>
                  {deviceData.name}
                </>
              ) : (
                <Skeleton className="h-4 w-48" />
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!historyData}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Rentang waktu:</span>
          </div>
          <div className="flex gap-2">
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
          <Select
            value={String(selectedPreset)}
            onValueChange={(v) => setSelectedPreset(Number(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PRESETS.map((preset) => (
                <SelectItem key={preset.hours} value={String(preset.hours)}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Grafik Telemetry</CardTitle>
          <CardDescription>
            {historyData ? `${historyData.row_count} data points` : "Memuat..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-center">
              <p className="text-muted-foreground">Tidak ada data untuk rentang waktu ini</p>
            </div>
          ) : (
            <>
              {/* Series toggle */}
              <div className="flex flex-wrap gap-2 mb-4">
                {availableSeries.map((series, i) => (
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

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatTimestamp}
                      fontSize={12}
                      tickMargin={8}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip
                      labelFormatter={(label) => formatTimestamp(String(label))}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend />
                    {(selectedSeries.length > 0 ? selectedSeries : availableSeries).map((series, i) => (
                      <Line
                        key={series}
                        type="monotone"
                        dataKey={series}
                        stroke={seriesColors[i % seriesColors.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      {historyData && historyData.row_count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Table</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {historyData.columns.map((col) => (
                    <th key={col} className="px-4 py-2 text-left font-medium text-muted-foreground">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyData.values.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-2 font-mono text-xs">
                        {typeof cell === "number" ? cell.toFixed(4) : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {historyData.row_count > 50 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Menampilkan 50 dari {historyData.row_count} data points. Export CSV untuk semua data.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}