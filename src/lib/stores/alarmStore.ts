import { create } from "zustand";
import { Alarm } from "@/lib/api/alarms";

interface AlarmState {
  unreadCount: number;
  recentAlarms: Alarm[];
  addAlarm: (alarm: Alarm) => void;
  markAllAsRead: () => void;
  clearRecent: () => void;
}

export const useAlarmStore = create<AlarmState>((set) => ({
  unreadCount: 0,
  recentAlarms: [],
  addAlarm: (alarm) =>
    set((state) => {
      // Avoid duplicates
      if (state.recentAlarms.some((a) => a.guid === alarm.guid)) {
        return state;
      }
      return {
        unreadCount: state.unreadCount + 1,
        recentAlarms: [alarm, ...state.recentAlarms].slice(0, 5), // Keep only 5 recent
      };
    }),
  markAllAsRead: () => set({ unreadCount: 0 }),
  clearRecent: () => set({ recentAlarms: [], unreadCount: 0 }),
}));
