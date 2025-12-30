"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminStats } from "@/api/model/adminStats"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface StatsProps {
    stats: AdminStats
    isLoading: boolean
}

export function Stats({ stats, isLoading }: StatsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="h-20 bg-gray-100 dark:bg-gray-800" />
                        <CardContent className="h-24 bg-gray-50 dark:bg-gray-900" />
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-8 mb-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-black/10 shadow-sm rounded-xl bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-black">{stats.totalSessions}</div>
                    </CardContent>
                </Card>
                <Card className="border border-black/10 shadow-sm rounded-xl bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-green-600">
                            {stats.completedSessions}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {((stats.completedSessions / (stats.totalSessions || 1)) * 100).toFixed(1)}% success rate
                        </p>
                    </CardContent>
                </Card>
                <Card className="border border-black/10 shadow-sm rounded-xl bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Photos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-blue-600">{stats.totalPhotos}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border border-black/10 shadow-sm rounded-xl bg-white">
                    <CardHeader>
                        <CardTitle>Sessions by Hour</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.sessionsByHour}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="hour"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="currentColor"
                                    radius={[4, 4, 0, 0]}
                                    className="fill-primary"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border border-black/10 shadow-sm rounded-xl bg-white">
                    <CardHeader>
                        <CardTitle>Sessions by Day</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.sessionsByDay}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    strokeWidth={2}
                                    activeDot={{ r: 6 }}
                                    className="stroke-primary"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
