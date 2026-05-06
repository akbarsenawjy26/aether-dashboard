"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Calendar } from "lucide-react";
import { deviceApi } from "@/lib/api/devices";
import { telemetryApi } from "@/lib/api/telemetry";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const TIME_PRESETS = [
  { label: "1 Jam", hours: 1 },
  { label: "6 Jam", hours: 6 },
  { label: "24 Jam", hours: 24 },
  { label: "7 Hari", hours: 168 },
];

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();
  const deviceGuid = params.guid as string;

  const [selectedPreset, setSelectedPreset] = useState(24);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Fetch device info to get device_sn for telemetry history
  const { data: deviceData } = useQuery({
    queryKey: ["device", deviceGuid],
    queryFn: () => deviceApi.get(deviceGuid!).then((r) => r.data.data),
    enabled: !!deviceGuid,
  });

  const deviceSn = useMemo(
    () => deviceData?.serial_number,
    [deviceData?.serial_number]
  );

  const { data: historyResult, isLoading } = useQuery({
    queryKey: ["telemetry-history", deviceSn, selectedPreset, page],
    queryFn: () => {
      const end = new Date();
      const start = new Date(end.getTime() - selectedPreset * 60 * 60 * 1000);
      return telemetryApi
        .history(deviceSn!, {
          start: start.toISOString(),
          stop: end.toISOString(),
          limit: PAGE_SIZE,
          order: "desc",
          page: page,
        })
        .then((r) => r.data);
    },
    enabled: !!deviceSn,
  });

  const historyData = historyResult?.data ?? [];
  const hasMore = historyResult?.pagination?.has_more ?? false;

  // Transform TelemetryRecord[] to chart format
  const chartData = historyData
    ? historyData
        .map((record) => ({
          timestamp: record.timestamp,
          ...record.fields,
        }))
        .reverse()
    : [];

  // Collect all unique field keys as series
  const availableSeries = historyData
    ? Array.from(
        historyData.reduce<Set<string>>((keys, record) => {
          Object.keys(record.fields).forEach((k) => keys.add(k));
          return keys;
        }, new Set())
      )
    : [];

  const toggleSeries = (series: string) => {
    setSelectedSeries((prev) =>
      prev.includes(series)
        ? prev.filter((s) => s !== series)
        : [...prev, series]
    );
  };

  const handleExportCSV = () => {
    if (!historyData || historyData.length === 0) return;
    const header = ["timestamp", ...availableSeries];
    const rows = historyData
      .map((record) => {
        const values = [record.timestamp];
        availableSeries.forEach((key) => {
          const val = record.fields[key];
          values.push(val !== undefined ? String(val) : "");
        });
        return values.join(",");
      })
      .join("\n");
    const csv = `${header.join(",")}\n${rows}`;
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

  const seriesColors = ["#10392d", "#3b82f6", "#f59e0b", "#ef4444", "", "#06b6d4"];

  const handlePresetChange = (hours: number) => {
    setSelectedPreset(hours);
    setPage(1); // reset page when changing time range
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
            <h1 className="text-3xl font-bold tracking-tight">History</h1>
            <h3 className="text-muted-foreground flex items-center gap-2">
              {deviceData ? (
                <>
                  <Badge variant="outline">{deviceSn}</Badge>
                  {deviceData.name}
                </>
              ) : (
                <Skeleton className="h-4 w-48" />
              )}
            </h3>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!historyData}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-4">
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
                  onClick={() => handlePresetChange(preset.hours)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Halaman <strong>{page}</strong>
              {hasMore && " →"}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Grafik Telemetry</CardTitle>
          <CardDescription>
            {historyData ? `${chartData.length} data points` : "Memuat..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 sm:h-80 w-full" />
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 sm:h-80 text-center">
              <h3 className="text-muted-foreground">Tidak ada data untuk rentang waktu ini</h3>
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
              <h3 className="text-xs text-muted-foreground text-center mt-2">
                {chartData.length} data points · Halaman {page}
                {hasMore && " (ada lebih banyak)"}
              </h3>
            </>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      {historyData && historyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Table</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    timestamp
                  </th>
                  {availableSeries.map((col) => (
                    <th key={col} className="px-4 py-2 text-left font-medium text-muted-foreground">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyData.slice(0, 50).map((record, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-4 py-2 font-mono text-xs">
                      {record.timestamp}
                    </td>
                    {availableSeries.map((key) => {
                      const val = record.fields[key];
                      return (
                        <td key={key} className="px-4 py-2 font-mono text-xs">
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
            {historyData.length > 50 && (
              <h3 className="text-xs text-muted-foreground text-center py-2">
                Menampilkan 50 dari {historyData.length} data points. Export CSV untuk semua data.
              </h3>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}