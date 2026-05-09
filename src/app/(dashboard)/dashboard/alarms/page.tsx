"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { alarmApi, ListAlarmParams, type Alarm } from "@/lib/api/alarms";
import { deviceApi } from "@/lib/api/devices";
import { locationApi } from "@/lib/api/locations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Filter, RotateCcw, AlertCircle, CheckCircle, ExternalLink, MapPin, CheckCircle2, UserCheck, Clock } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import Link from "next/link";
import { toast } from "sonner";

export default function AlarmsPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<ListAlarmParams>({
    page: 1,
    limit: 10,
  });

  const ackMutation = useMutation({
    mutationFn: (guid: string) => alarmApi.acknowledge(guid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alarms"] });
      queryClient.invalidateQueries({ queryKey: ["alarm-stats"] });
      toast.success("Alarm acknowledged successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to acknowledge alarm");
    }
  });

  const resolveMutation = useMutation({
    mutationFn: (guid: string) => alarmApi.resolve(guid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alarms"] });
      queryClient.invalidateQueries({ queryKey: ["alarm-stats"] });
      toast.success("Alarm resolved successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to resolve alarm");
    }
  });

  const { data: alarms, isLoading: alarmsLoading, isFetching: alarmsFetching } = useQuery({
    queryKey: ["alarms", params],
    queryFn: () => alarmApi.listHistory(params),
  });

  const { data: stats } = useQuery({
    queryKey: ["alarm-stats", params.device_guid],
    queryFn: () => alarmApi.getStats(params.device_guid).then(r => (r as any).data.data),
  });

  const { data: devices } = useQuery({
    queryKey: ["devices"],
    queryFn: () => deviceApi.list({ limit: 100 }),
  });

  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: () => locationApi.list({ limit: 100 }),
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-wider">
          <div className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
          Critical
        </div>
      );
      case "warning": return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-wider">
          <div className="h-1 w-1 rounded-full bg-yellow-500" />
          Warning
        </div>
      );
      default: return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-wider">
          <div className="h-1 w-1 rounded-full bg-blue-500" />
          Info
        </div>
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20">
          Active
        </div>
      );
      case "acknowledged": return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-500/20">
          Acknowledged
        </div>
      );
      case "resolved": return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20">
          Resolved
        </div>
      );
      default: return <Badge variant="secondary" className="rounded-lg text-[10px] font-black uppercase">{status}</Badge>;
    }
  };

  const columns = useMemo<ColumnDef<Alarm>[]>(() => [
    {
      accessorKey: "triggered_at",
      header: "Time",
      cell: ({ row }) => (
        <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
          {new Date(row.original.triggered_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' })}
        </span>
      ),
    },
    {
      accessorKey: "location_name",
      header: "Location",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/5 text-blue-500/80 text-[10px] font-black uppercase tracking-wider justify-center">
          <MapPin className="h-3 w-3" />
          {row.original.location_name || "Factory Site"}
        </div>
      ),
    },
    {
      accessorKey: "device_alias",
      header: "Device",
      cell: ({ row }) => (
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-bold text-sm">
            {row.original.device_alias || "Aether Device"}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider">
            SN: {row.original.device_sn}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "parameter_name",
      header: "Parameter",
      cell: ({ row }) => (
        <span className="px-2.5 py-1 rounded-md bg-muted text-foreground/80 text-xs font-bold capitalize border border-border">
          {row.original.parameter_name}
        </span>
      ),
    },
    {
      accessorKey: "triggered_value",
      header: "Value",
      cell: ({ row }) => (
        <span className="font-mono text-base font-black text-primary tracking-tighter">
          {row.original.triggered_value.toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => getSeverityBadge(row.original.severity),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const alarm = row.original;
        return (
          <div className="flex justify-center gap-2">
            {alarm.status === "active" && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => ackMutation.mutate(alarm.guid)}
                disabled={ackMutation.isPending}
                className="h-8 px-3 gap-1.5 text-[10px] font-black uppercase tracking-wider border-yellow-500/50 text-yellow-600 hover:bg-yellow-500 hover:text-white rounded-lg transition-all"
              >
                <UserCheck className="h-3.5 w-3.5" /> ACK
              </Button>
            )}
            {alarm.status === "acknowledged" && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => resolveMutation.mutate(alarm.guid)}
                disabled={resolveMutation.isPending}
                className="h-8 px-3 gap-1.5 text-[10px] font-black uppercase tracking-wider border-green-500/50 text-green-600 hover:bg-green-500 hover:text-white rounded-lg transition-all"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> RESOLVE
              </Button>
            )}
            {alarm.status === "resolved" && (
              <Link href={`/dashboard/device/${alarm.device_guid}`}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-3 gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground/40 hover:text-foreground hover:bg-muted rounded-lg transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> DETAILS
                </Button>
              </Link>
            )}
          </div>
        );
      },
    },
  ], [ackMutation, resolveMutation]);

  const alarmsData = (alarms as any)?.data?.data || [];
  const pagination = (alarms as any)?.data?.pagination || { page: 1, limit: 10, total: 0, total_pages: 1 };
  const devicesList = devices?.items || [];
  const locationsList = locations?.items || [];

  const handleReset = () => {
    setParams({ page: 1, limit: 10 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Alarm Management</h1>
        <p className="text-muted-foreground font-medium">Monitor and manage industrial sensor alerts across all devices.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-none shadow-xl bg-card p-6 flex flex-col items-center justify-center gap-3 text-center transition-all hover:shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2">
            <Bell className="h-7 w-7" />
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">Total Alarms</p>
            <p className="text-3xl font-black">{stats?.total || 0}</p>
          </div>
        </Card>
        <Card className="rounded-3xl border-none shadow-xl bg-card p-6 flex flex-col items-center justify-center gap-3 text-center border-b-4 border-red-500 transition-all hover:shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div>
            <p className="text-red-500/60 text-[10px] font-black uppercase tracking-[0.2em]">Active</p>
            <p className="text-3xl font-black">{stats?.active || 0}</p>
          </div>
        </Card>
        <Card className="rounded-3xl border-none shadow-xl bg-card p-6 flex flex-col items-center justify-center gap-3 text-center border-b-4 border-yellow-500 transition-all hover:shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-2">
            <CheckCircle className="h-7 w-7" />
          </div>
          <div>
            <p className="text-yellow-600/60 text-[10px] font-black uppercase tracking-[0.2em]">Acknowledged</p>
            <p className="text-3xl font-black">{stats?.acknowledged || 0}</p>
          </div>
        </Card>
        <Card className="rounded-3xl border-none shadow-xl bg-card p-6 flex flex-col items-center justify-center gap-3 text-center border-b-4 border-green-500 transition-all hover:shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 mb-2">
            <CheckCircle className="h-7 w-7" />
          </div>
          <div>
            <p className="text-green-600/60 text-[10px] font-black uppercase tracking-[0.2em]">Resolved</p>
            <p className="text-3xl font-black">{stats?.resolved || 0}</p>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl border-none shadow-xl bg-card overflow-hidden transition-all">
        <CardHeader className="border-b border-border/50 pb-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Filter className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">ALARM HISTORY</CardTitle>
                <CardDescription className="font-medium">Filter and browse all device alerts</CardDescription>
              </div>
            </div>

            <div className="w-full space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-full sm:w-48 lg:w-64 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Device</span>
                  <Select 
                    value={params.device_guid || "all"} 
                    onValueChange={(v) => {
                      setParams({ 
                        ...params, 
                        device_guid: (v === "all" || !v) ? undefined : (v as string), 
                        page: 1 
                      });
                    }}
                  >
                    <SelectTrigger className="w-full h-10 bg-muted/50 border-input rounded-xl focus:ring-primary/20 transition-all">
                      <SelectValue>
                        {params.device_guid 
                          ? devicesList.find(d => d.guid === params.device_guid)?.alias || 
                            devicesList.find(d => d.guid === params.device_guid)?.serial_number || 
                            "Unknown Device"
                          : "All Devices"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl z-[100]">
                      <SelectItem value="all">All Devices</SelectItem>
                      {devicesList.map((d) => (
                        <SelectItem key={d.guid} value={d.guid} className="focus:bg-primary/10 focus:text-primary">
                          {d.alias || d.serial_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-48 lg:w-56 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location</span>
                  <Select 
                    value={params.location_guid || "all"} 
                    onValueChange={(v) => {
                      setParams({ 
                        ...params, 
                        location_guid: (v === "all" || !v) ? undefined : (v as string), 
                        page: 1 
                      });
                    }}
                  >
                    <SelectTrigger className="w-full h-10 bg-muted/50 border-input rounded-xl focus:ring-primary/20 transition-all">
                      <SelectValue>
                        {params.location_guid 
                          ? locationsList.find(l => l.guid === params.location_guid)?.name || "Unknown Location"
                          : "All Locations"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl z-[100]">
                      <SelectItem value="all">All Locations</SelectItem>
                      {locationsList.map((l) => (
                        <SelectItem key={l.guid} value={l.guid} className="focus:bg-primary/10 focus:text-primary">
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-48 lg:w-48 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Status</span>
                  <Select 
                    value={params.status || "all"} 
                    onValueChange={(v) => {
                      setParams({ 
                        ...params, 
                        status: (v === "all" || !v) ? undefined : (v as string), 
                        page: 1 
                      });
                    }}
                  >
                    <SelectTrigger className="w-full h-10 bg-muted/50 border-input rounded-xl focus:ring-primary/20 transition-all">
                      <SelectValue>
                        {params.status 
                          ? params.status.charAt(0).toUpperCase() + params.status.slice(1)
                          : "All Status"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl z-[100]">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active" className="focus:bg-red-500/10 focus:text-red-500">Active</SelectItem>
                      <SelectItem value="acknowledged" className="focus:bg-yellow-500/10 focus:text-yellow-600">Acknowledged</SelectItem>
                      <SelectItem value="resolved" className="focus:bg-green-500/10 focus:text-green-600">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="outline" 
                  onClick={handleReset} 
                  className="h-10 w-full sm:w-auto px-6 border-input bg-muted/50 hover:bg-muted rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] items-end gap-3 p-3 bg-muted/30 rounded-2xl border border-border/50">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Dari Tanggal</label>
                  <div className="bg-background px-3 py-2 rounded-xl border border-border/50 focus-within:border-primary/50 transition-colors">
                    <input
                      type="datetime-local"
                      value={params.start ? new Date(params.start).toISOString().slice(0, 16) : ""}
                      onChange={(e) => {
                        const iso = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                        setParams({ ...params, start: iso, page: 1 });
                      }}
                      className="bg-transparent border-none text-xs focus:ring-0 outline-none w-full min-w-0"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Hingga Tanggal</label>
                  <div className="bg-background px-3 py-2 rounded-xl border border-border/50 focus-within:border-primary/50 transition-colors">
                    <input
                      type="datetime-local"
                      value={params.stop ? new Date(params.stop).toISOString().slice(0, 16) : ""}
                      onChange={(e) => {
                        const iso = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                        setParams({ ...params, stop: iso, page: 1 });
                      }}
                      className="bg-transparent border-none text-xs focus:ring-0 outline-none w-full min-w-0"
                    />
                  </div>
                </div>
                <div className="flex items-center h-10 lg:h-11">
                  <Badge variant="outline" className="text-[9px] h-full flex items-center px-3 rounded-xl border-dashed opacity-60">
                    <Clock className="h-3 w-3 mr-1" /> Auto Sync
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={alarmsData}
            isLoading={alarmsLoading || alarmsFetching}
            pagination={{
              page: params.page!,
              limit: params.limit!,
              total: pagination.total,
              onPageChange: (p) => setParams({ ...params, page: p }),
              onLimitChange: (l) => setParams({ ...params, limit: l, page: 1 }),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
