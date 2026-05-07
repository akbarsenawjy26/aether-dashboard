"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { alarmApi, ListAlarmParams } from "@/lib/api/alarms";
import { deviceApi } from "@/lib/api/devices";
import { locationApi } from "@/lib/api/locations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Search, Filter, RotateCcw, AlertTriangle, Info, AlertCircle, CheckCircle, ExternalLink, MapPin, CheckCircle2, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
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

  const { data: alarms, isLoading: alarmsLoading } = useQuery({
    queryKey: ["alarms", params],
    queryFn: () => alarmApi.listHistory(params),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Filter className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">ALARM HISTORY</CardTitle>
                <CardDescription className="font-medium">Filter and browse all device alerts</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Device:</span>
                <div className="w-full md:w-64">
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
                    <SelectTrigger className="h-11 bg-muted/50 border-input rounded-xl focus:ring-primary/20 transition-all">
                      <SelectValue>
                        {params.device_guid 
                          ? devicesList.find(d => d.guid === params.device_guid)?.alias || 
                            devicesList.find(d => d.guid === params.device_guid)?.serial_number || 
                            "Unknown Device"
                          : "All Devices"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl">
                      <SelectItem value="all">All Devices</SelectItem>
                      {devicesList.map((d) => (
                        <SelectItem key={d.guid} value={d.guid} className="focus:bg-primary/10 focus:text-primary">
                          {d.alias || d.serial_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Location:</span>
                <div className="w-full md:w-56">
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
                    <SelectTrigger className="h-11 bg-muted/50 border-input rounded-xl focus:ring-primary/20 transition-all">
                      <SelectValue>
                        {params.location_guid 
                          ? locationsList.find(l => l.guid === params.location_guid)?.name || "Unknown Location"
                          : "All Locations"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl">
                      <SelectItem value="all">All Locations</SelectItem>
                      {locationsList.map((l) => (
                        <SelectItem key={l.guid} value={l.guid} className="focus:bg-primary/10 focus:text-primary">
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Status:</span>
                <div className="w-full md:w-48">
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
                    <SelectTrigger className="h-11 bg-muted/50 border-input rounded-xl focus:ring-primary/20 transition-all">
                      <SelectValue>
                        {params.status 
                          ? params.status.charAt(0).toUpperCase() + params.status.slice(1)
                          : "All Status"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active" className="focus:bg-red-500/10 focus:text-red-500">Active</SelectItem>
                      <SelectItem value="acknowledged" className="focus:bg-yellow-500/10 focus:text-yellow-600">Acknowledged</SelectItem>
                      <SelectItem value="resolved" className="focus:bg-green-500/10 focus:text-green-600">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleReset} 
                title="Reset Filters" 
                className="h-11 w-11 border-input bg-muted/50 hover:bg-muted rounded-xl transition-all"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 border-none hover:bg-muted/30">
                  <TableHead className="px-6 py-5 text-center text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Time</TableHead>
                  <TableHead className="px-6 py-5 text-center text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Location</TableHead>
                  <TableHead className="px-6 py-5 text-center text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Device</TableHead>
                  <TableHead className="px-6 py-5 text-center text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Parameter</TableHead>
                  <TableHead className="px-6 py-5 text-center text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Value</TableHead>
                  <TableHead className="px-6 py-5 text-center text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Severity</TableHead>
                  <TableHead className="px-6 py-5 text-center text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Status</TableHead>
                  <TableHead className="px-6 py-5 text-center text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alarmsLoading ? (
                  <TableRow className="border-none">
                    <TableCell colSpan={8} className="text-center py-24">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-lg shadow-primary/20" />
                        <span className="text-sm font-medium text-muted-foreground">Syncing alarm data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : alarmsData.length > 0 ? (
                  alarmsData.map((alarm: any) => (
                    <TableRow key={alarm.guid} className="border-border/40 hover:bg-muted/20 transition-colors group">
                      <TableCell className="px-6 py-4 text-center text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(alarm.triggered_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' })}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/5 text-blue-500/80 text-[10px] font-black uppercase tracking-wider">
                            <MapPin className="h-3 w-3" />
                            {alarm.location_name || "Factory Site"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-bold text-sm group-hover:text-primary transition-colors">
                            {alarm.device_alias || "Aether Device"}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wider">
                            SN: {alarm.device_sn}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <span className="px-2.5 py-1 rounded-md bg-muted text-foreground/80 text-xs font-bold capitalize border border-border">
                          {alarm.parameter_name}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <span className="font-mono text-base font-black text-primary tracking-tighter">
                          {alarm.triggered_value.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          {getSeverityBadge(alarm.severity)}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          {getStatusBadge(alarm.status)}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          {alarm.status === "active" && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => ackMutation.mutate(alarm.guid)}
                              disabled={ackMutation.isPending}
                              className="h-8 px-3 gap-1.5 text-[10px] font-black uppercase tracking-wider border-yellow-500/50 text-yellow-600 hover:bg-yellow-500 hover:text-white rounded-lg transition-all"
                            >
                              <UserCheck className="h-3.5 w-3.5" /> ACKNOWLEDGE
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
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="border-none">
                    <TableCell colSpan={8} className="text-center py-32 text-muted-foreground">
                      <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Bell className="h-10 w-10 opacity-20" />
                      </div>
                      <p className="text-xl font-bold opacity-30">No Alarms Detected</p>
                      <p className="text-sm opacity-10 mt-1 max-w-xs mx-auto">Adjust your filters or wait for incoming sensor telemetry.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-6 border-t border-border/50 bg-muted/10 gap-4">
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest order-2 sm:order-1">
                Page {params.page} of {pagination.total_pages}
              </div>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParams({ ...params, page: params.page! - 1 })}
                  disabled={params.page === 1}
                  className="rounded-xl border-border bg-background hover:bg-muted disabled:opacity-20 transition-all h-9 px-4 text-[10px] font-black uppercase tracking-wider"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParams({ ...params, page: params.page! + 1 })}
                  disabled={params.page === pagination.total_pages}
                  className="rounded-xl border-border bg-background hover:bg-muted disabled:opacity-20 transition-all h-9 px-4 text-[10px] font-black uppercase tracking-wider"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
