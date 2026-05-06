"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deviceApi } from "@/lib/api/devices";
import { History, Search, HardDrive, ArrowRight } from "lucide-react";

export default function HistoryListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  const { data: devices, isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: () => deviceApi.list({ limit: 1000 }),
  });

  const filteredDevices = (devices?.items ?? []).filter((device) => {
    const matchesSearch =
      search === "" ||
      device.name.toLowerCase().includes(search.toLowerCase()) ||
      device.serial_number.toLowerCase().includes(search.toLowerCase());
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
        <p className="text-muted-foreground">
          Pilih device untuk melihat data telemetry historis
        </p>
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
              >
                Semua
              </Button>
              {deviceTypes.map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                >
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
            <p className="text-lg font-medium">Tidak ada device</p>
            <p className="text-muted-foreground text-sm">
              {search ? "Tidak ada device yang cocok dengan pencarian" : "Belum ada device yang terdaftar"}
            </p>
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
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {device.serial_number}
                    </p>
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
    </div>
  );
}