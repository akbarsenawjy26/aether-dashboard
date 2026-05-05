import { redirect } from "next/navigation";

export default function HistoryIndexPage() {
  // Requires device_sn param, redirect to realtime as fallback
  redirect("/dashboard/realtime");
}
