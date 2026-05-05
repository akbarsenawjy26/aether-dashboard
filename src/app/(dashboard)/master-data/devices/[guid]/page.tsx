"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { deviceApi } from "@/lib/api/devices";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  HardDrive,
  MapPin,
  History,
  Radio,
} from "lucide-react";

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const guid = params.guid as string;

  const { data: device, isLoading } = useQuery({
    queryKey: ["device", guid],
    queryFn: () => deviceApi.get(guid).then((r) => r.data.data),
    enabled: !!guid,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <HardDrive className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Device Tidak Ditemukan</h2>
        <p className="text-muted-foreground mt-2">
          Device dengan GUID ini tidak ada di database.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>
    );
  }

  const statusColors = {
    online: "bg-green-500/10 text-green-600",
    offline: "bg-red-500/10 text-red-600",
    unknown: "bg-gray-500/10 text-gray-600",
  };

  const typeColors = {
    sensor: "bg-blue-500/10 text-blue-600",
    gateway: "bg-purple-500/10 text-purple-600",
    controller: "bg-amber-500/10 text-amber-600",
    other: "bg-gray-500/10 text-gray-600",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <HardDrive className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{device.name}</h1>
            <p className="text-muted-foreground font-mono text-sm">
              {device.serial_number}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={statusColors[device.status]}>
          {device.status}
        </Badge>
        <Badge variant="outline" className={typeColors[device.type]}>
          {device.type}
        </Badge>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Device Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">GUID</span>
              <code className="text-xs font-mono">{device.guid}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipe</span>
              <span>{device.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="capitalize">{device.status}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Lokasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {device.location_name ? (
              <>
                <p className="font-medium">{device.location_name}</p>
                <p className="text-muted-foreground text-xs">
                  GUID: {device.location_guid}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Belum ditetapkan</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Waktu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dibuat</span>
              <span>{formatDate(device.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diupdate</span>
              <span>{formatDate(device.updated_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/realtime?device=${device.serial_number}`)}
          >
            <Radio className="h-4 w-4 mr-2" />
            Lihat Realtime
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/history/${device.serial_number}`)}
          >
            <History className="h-4 w-4 mr-2" />
            Lihat History
          </Button>
        </CardContent>
      </Card>

      {/* Metadata */}
      {device.metadata && Object.keys(device.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-x-auto">
              {JSON.stringify(device.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}