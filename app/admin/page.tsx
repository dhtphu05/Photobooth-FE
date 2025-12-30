"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useGetAdminStats, useGetAdminSessions } from "@/api/endpoints/admin/admin"
import { AdminStats } from "@/api/model/adminStats"
import { Session } from "@/api/model/session"
import { Stats } from "./components/Stats"
import { AdminFilters } from "./components/AdminFilters"
import { SessionList } from "./components/SessionList"
import { DateRange } from "react-day-picker"
import { socket } from "@/lib/socket"
import { useQueryClient } from "@tanstack/react-query"
import { isWithinInterval, startOfDay, endOfDay, format } from "date-fns"

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  // Use Admin Stats API (still fetch it in case it starts working or has some data)
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useGetAdminStats({
    query: {
      refetchInterval: 30000
    }
  });

  // Use Admin Sessions API
  const { data: sessionsData, isLoading: isSessionsLoading, refetch: refetchSessions } = useGetAdminSessions(
    { page: 1, limit: 1000 }, // Fetch large limit for client-side stats
    {
      query: {
        refetchInterval: 10000
      }
    }
  );

  const sessions = ((sessionsData?.data as unknown as any)?.data as Session[]) || [];
  // Handle fallback if data is direct array
  const actualSessions = Array.isArray(sessionsData?.data) ? sessionsData?.data as unknown as Session[] : sessions;

  // Filter Sessions Client-Side (Moved up to filter first)
  const filteredSessions = useMemo(() => {
    if (!actualSessions) return [];

    return actualSessions.filter(session => {
      // Status Filter
      if (statusFilter !== "ALL" && session.status !== statusFilter) {
        return false;
      }

      // Date Range Filter
      if (dateRange?.from) {
        const sessionDate = new Date(session.createdAt);
        const start = startOfDay(dateRange.from);
        const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

        if (!isWithinInterval(sessionDate, { start, end })) {
          return false;
        }
      }

      return true;
    });
  }, [actualSessions, statusFilter, dateRange]);

  // --- CLIENT-SIDE STATS CALCULATION (Now depends on filteredSessions) ---
  const computedStats = useMemo(() => {
    // If no filtered sessions, return zeroed stats? 
    // Or should we fallback to ALL sessions if no filter is active? 
    // Actually, if we filter, we want stats FOR the filter. 
    // So using filteredSessions is correct.

    // However, if filteredSessions is empty because of a filter, stats should be 0.
    // If it's empty because data is loading, that's different.

    const sessionsToAnalyze = filteredSessions;

    const byDay = new Map<string, number>();
    const byHour = new Map<string, number>();
    let completed = 0;

    sessionsToAnalyze.forEach(session => {
      if (session.status === 'COMPLETED') completed++;

      const date = new Date(session.createdAt);
      if (isNaN(date.getTime())) return;

      const dayKey = format(date, 'yyyy-MM-dd');
      const hourKey = format(date, 'HH:00');

      byDay.set(dayKey, (byDay.get(dayKey) || 0) + 1);
      byHour.set(hourKey, (byHour.get(hourKey) || 0) + 1);
    });

    // Sort by date
    const sessionsByDay = Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Sort by hour
    const sessionsByHour = Array.from(byHour.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    return {
      completedSessions: completed,
      sessionsByDay,
      sessionsByHour,
      totalSessions: sessionsToAnalyze.length,
      totalPhotos: sessionsToAnalyze.reduce((acc, s) => acc + (s.medias?.length || 0), 0)
    };
  }, [filteredSessions]);


  // Merge API stats with Computed Stats
  const rawStats = statsData?.data as any;
  const stats: AdminStats = useMemo(() => {
    // Always favor computed stats for dynamic filtering experience
    // But strictly speaking, the user expects "Admin Dashboard" to show TOTALS normally,
    // and filtered stats only when filtering.
    // Since we don't have separate "Filtered Stats" UI, replacing the main stats 
    // with filtered data is the standard pattern for dashboards.

    if (computedStats) {
      return {
        totalSessions: computedStats.totalSessions,
        totalPhotos: computedStats.totalPhotos,
        completedSessions: computedStats.completedSessions,
        sessionsByDay: computedStats.sessionsByDay,
        sessionsByHour: computedStats.sessionsByHour
      };
    }

    // Fallback to API data if something fails (shouldn't happen with valid list)
    return {
      totalSessions: rawStats?.totalSessions ?? 0,
      totalPhotos: rawStats?.totalPhotos ?? 0,
      completedSessions: rawStats?.completedSessions ?? 0,
      sessionsByDay: [],
      sessionsByHour: []
    };
  }, [rawStats, computedStats]);


  // Real-time updates via Socket.IO
  useEffect(() => {
    socket.connect();

    // Define explicit any for event handlers to bypass strict typing issues with generated socket types
    const onSessionCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sessions'] });
    };

    const onSessionUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sessions'] });
    }

    // @ts-ignore
    socket.on('session_created', onSessionCreated);
    // @ts-ignore
    socket.on('session_update', onSessionUpdate);

    return () => {
      // @ts-ignore
      socket.off('session_created', onSessionCreated);
      // @ts-ignore
      socket.off('session_update', onSessionUpdate);
    };
  }, [queryClient]);


  const handleRefresh = () => {
    refetchStats();
    refetchSessions();
  }

  return (
    <div className="min-h-screen bg-gray-50/50 text-black font-sans">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/5">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">Manage your photobooth sessions</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={handleRefresh}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Stats stats={stats} isLoading={isStatsLoading && !computedStats} />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Sessions</h2>
            <div className="text-sm text-muted-foreground">
              Showing {filteredSessions.length} sessions
            </div>
          </div>

          <AdminFilters
            dateRange={dateRange}
            setDateRange={setDateRange}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />

          <SessionList sessions={filteredSessions} isLoading={isSessionsLoading} />
        </div>
      </div>
    </div>
  )
}
