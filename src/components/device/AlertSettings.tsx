"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { thresholdApi, CreateThresholdRequest, UpdateThresholdRequest } from "@/lib/api/thresholds";
import { alarmApi } from "@/lib/api/alarms";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Plus, Trash2, AlertTriangle, Info, AlertCircle, CheckCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AlertSettingsProps {
  deviceGuid: string;
  availableParameters: string[];
}

export function AlertSettings({ deviceGuid, availableParameters }: AlertSettingsProps) {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<any>(null);
  
  // New threshold form state
  const [newThreshold, setNewThreshold] = useState<Partial<CreateThresholdRequest>>({
    parameter_name: "",
    severity: "warning",
    is_active: true,
  });

  const { data: thresholds, isLoading: thresholdsLoading } = useQuery({
    queryKey: ["thresholds", deviceGuid],
    queryFn: () => thresholdApi.listByDevice(deviceGuid),
  });

  const { data: activeAlarms } = useQuery({
    queryKey: ["active-alarms", deviceGuid],
    queryFn: () => alarmApi.listActive(deviceGuid),
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateThresholdRequest) => thresholdApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thresholds", deviceGuid] });
      setIsAddOpen(false);
      toast.success("Threshold created");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create threshold");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ guid, data }: { guid: string; data: UpdateThresholdRequest }) => 
      thresholdApi.update(guid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thresholds", deviceGuid] });
      setIsEditOpen(false);
      toast.success("Threshold updated");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update threshold");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (guid: string) => thresholdApi.delete(guid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thresholds", deviceGuid] });
      toast.success("Threshold deleted");
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (guid: string) => alarmApi.acknowledge(guid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-alarms", deviceGuid] });
      toast.success("Alarm acknowledged");
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (guid: string) => alarmApi.resolve(guid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-alarms", deviceGuid] });
      toast.success("Alarm resolved");
    },
  });

  const handleAddThreshold = () => {
    if (!newThreshold.parameter_name) {
      toast.error("Please select a parameter");
      return;
    }
    createMutation.mutate({
      ...newThreshold,
      device_guid: deviceGuid,
    } as CreateThresholdRequest);
  };

  const handleEditClick = (threshold: any) => {
    setEditingThreshold({ ...threshold });
    setIsEditOpen(true);
  };

  const handleUpdateThreshold = () => {
    if (!editingThreshold) return;
    updateMutation.mutate({
      guid: editingThreshold.guid,
      data: {
        parameter_name: editingThreshold.parameter_name,
        min_value: editingThreshold.min_value,
        max_value: editingThreshold.max_value,
        severity: editingThreshold.severity,
        is_active: editingThreshold.is_active,
      }
    });
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Critical</Badge>;
      case "warning": return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none gap-1"><AlertTriangle className="h-3 w-3" /> Warning</Badge>;
      default: return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none gap-1"><Info className="h-3 w-3" /> Info</Badge>;
    }
  };

  const alarmsData = (activeAlarms as any)?.data?.data || [];
  const thresholdsData = (thresholds as any)?.data?.data || [];

  return (
    <div className="space-y-6">
      {/* Active Alarms Section */}
      <Card className="border-red-100 bg-red-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Bell className="h-5 w-5" />
            Active Alarms
          </CardTitle>
          <CardDescription>Current active alerts for this device</CardDescription>
        </CardHeader>
        <CardContent>
          {alarmsData.length > 0 ? (
            <div className="space-y-4">
              {alarmsData.map((alarm: any) => (
                <div key={alarm.guid} className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-100 shadow-sm">
                  <div className="flex gap-4">
                    <div className={cn(
                      "p-2 rounded-full",
                      alarm.severity === "critical" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"
                    )}>
                      {alarm.severity === "critical" ? <AlertCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>
                    <div>
                      <h4 className="font-semibold capitalize">{alarm.parameter_name} Alert</h4>
                      <p className="text-sm text-muted-foreground">
                        Triggered value: <span className="font-mono font-medium">{alarm.triggered_value.toFixed(2)}</span> at {new Date(alarm.triggered_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {alarm.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => acknowledgeMutation.mutate(alarm.guid)}>
                        Acknowledge
                      </Button>
                    )}
                    <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => resolveMutation.mutate(alarm.guid)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
              <p>No active alarms. Everything looks good!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Thresholds Management Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Threshold Settings</CardTitle>
            <CardDescription>Manage parameter limits to trigger alarms</CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Add Threshold
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Threshold</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Parameter</Label>
                  <Select value={newThreshold.parameter_name} onValueChange={(v) => setNewThreshold({ ...newThreshold, parameter_name: v || "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parameter" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableParameters.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Min Value</Label>
                    <Input type="number" placeholder="Optional" onChange={(e) => setNewThreshold({ ...newThreshold, min_value: e.target.value ? parseFloat(e.target.value) : null })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Max Value</Label>
                    <Input type="number" placeholder="Optional" onChange={(e) => setNewThreshold({ ...newThreshold, max_value: e.target.value ? parseFloat(e.target.value) : null })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Severity</Label>
                  <Select value={newThreshold.severity} onValueChange={(v) => setNewThreshold({ ...newThreshold, severity: (v as any) || "warning" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAddThreshold} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Threshold"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Min Limit</TableHead>
                <TableHead>Max Limit</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {thresholdsData.length > 0 ? (
                thresholdsData.map((t: any) => (
                  <TableRow key={t.guid}>
                    <TableCell className="font-medium capitalize">{t.parameter_name}</TableCell>
                    <TableCell className="font-mono text-xs">{t.min_value ?? "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{t.max_value ?? "-"}</TableCell>
                    <TableCell>{getSeverityBadge(t.severity)}</TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? "default" : "secondary"}>
                        {t.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => handleEditClick(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteMutation.mutate(t.guid)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No thresholds configured.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Threshold</DialogTitle>
          </DialogHeader>
          {editingThreshold && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Parameter</Label>
                <Input value={editingThreshold.parameter_name} disabled />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Min Value</Label>
                  <Input 
                    type="number" 
                    value={editingThreshold.min_value ?? ""} 
                    onChange={(e) => setEditingThreshold({ ...editingThreshold, min_value: e.target.value ? parseFloat(e.target.value) : null })} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Max Value</Label>
                  <Input 
                    type="number" 
                    value={editingThreshold.max_value ?? ""} 
                    onChange={(e) => setEditingThreshold({ ...editingThreshold, max_value: e.target.value ? parseFloat(e.target.value) : null })} 
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Severity</Label>
                <Select value={editingThreshold.severity} onValueChange={(v) => setEditingThreshold({ ...editingThreshold, severity: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="is_active_edit"
                  checked={editingThreshold.is_active} 
                  onChange={(e) => setEditingThreshold({ ...editingThreshold, is_active: e.target.checked })} 
                />
                <Label htmlFor="is_active_edit">Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateThreshold} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Threshold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
