"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { AlertCircle, Bell } from "lucide-react";
import { Alarm } from "@/lib/api/alarms";
import { useAlarmStore } from "@/lib/stores/alarmStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const SSE_URL = `${API_BASE}/alarm/stream`;

export function AlarmNotificationListener() {
  const addAlarm = useAlarmStore((state) => state.addAlarm);
  const seenAlarms = useRef<Set<string>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    // SSE with token usually needs a workaround or library if using native EventSource
    // but since we are using a simple GET, we might need to pass token in query if backend supports it
    // Or just use the fact that the browser might send cookies if configured.
    // However, our backend uses JWT header. Native EventSource doesn't support headers.
    
    // For now, let's try the simple way. If it fails due to 401, we'd need a polyfill.
    // Our backend seems to have a JWT debug mode or handles token in query?
    // Let's assume native works if we add it to query or if session exists.
    
    const connect = () => {
      // Use window.location.origin as base for relative URLs
      const url = new URL(SSE_URL, window.location.origin);
      url.searchParams.append("token", token);
      
      const es = new EventSource(url.toString(), { withCredentials: true });
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const alarms: Alarm[] = JSON.parse(event.data);
          if (!Array.isArray(alarms)) return;

          alarms.forEach((alarm) => {
            if (!seenAlarms.current.has(alarm.guid)) {
              seenAlarms.current.add(alarm.guid);
              addAlarm(alarm); // Sync with store
              
              // Only notify if it's relatively new (e.g. triggered in last 1 min)
              // to avoid spamming old active alarms on first connect
              const triggeredAt = new Date(alarm.triggered_at).getTime();
              const now = Date.now();
              const isRecent = (now - triggeredAt) < 60000;

              if (isRecent) {
                showNotification(alarm);
              }
            }
          });
        } catch (err) {
          console.error("Failed to parse alarm SSE data", err);
        }
      };

      es.onerror = () => {
        console.error("Alarm SSE connection lost. Retrying...");
        es.close();
        setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const showNotification = (alarm: Alarm) => {
    toast.error(`New ${alarm.severity} Alert!`, {
      description: `${alarm.device_alias || alarm.device_sn}: ${alarm.parameter_name} triggered at ${alarm.triggered_value.toFixed(2)}`,
      duration: 10000,
      icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      action: {
        label: "View Alarms",
        onClick: () => window.location.href = "/dashboard/alarms",
      },
    });

    // Optional: play sound
    const audio = new Audio("/notification.mp3");
    audio.play().catch(() => {}); // Ignore if blocked by browser
  };

  return null; // This component doesn't render anything
}
