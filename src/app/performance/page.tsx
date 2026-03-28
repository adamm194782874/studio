"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart2, 
  TrendingUp, 
  Activity,
  History
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const detailedProgress = [
  { week: 'Week 1', squat: 225, bench: 155, deadlift: 275, volume: 10500 },
  { week: 'Week 2', squat: 235, bench: 160, deadlift: 285, volume: 11200 },
  { week: 'Week 3', squat: 245, bench: 165, deadlift: 300, volume: 11800 },
  { week: 'Week 4', squat: 255, bench: 175, deadlift: 315, volume: 12500 },
  { week: 'Week 5', squat: 265, bench: 180, deadlift: 330, volume: 13100 },
];

export default function Performance() {
  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
          <BarChart2 className="text-primary w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-headline font-bold">Performance Analytics</h1>
          <p className="text-muted-foreground">Deep dive into your training progression</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Strength Progression */}
        <Card className="border-none bg-card/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Strength Progression
            </CardTitle>
            <CardDescription>Estimated 1RM growth per lift</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ChartContainer config={{
              squat: { label: "Squat", color: "hsl(var(--accent))" },
              bench: { label: "Bench", color: "hsl(var(--chart-2))" },
              deadlift: { label: "Deadlift", color: "hsl(var(--chart-3))" }
            }}>
              <AreaChart data={detailedProgress}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="week" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="squat" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.1} />
                <Area type="monotone" dataKey="bench" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.1} />
                <Area type="monotone" dataKey="deadlift" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.1} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Training Volume */}
        <Card className="border-none bg-card/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Total Training Volume
            </CardTitle>
            <CardDescription>Cumulative weight lifted (lbs) per week</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ChartContainer config={{
              volume: { label: "Volume", color: "hsl(var(--chart-3))" }
            }}>
              <BarChart data={detailedProgress}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="week" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="volume" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Lift Distribution */}
        <Card className="lg:col-span-2 border-none bg-card/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-500" />
              Strength Balance
            </CardTitle>
            <CardDescription>Relative strength ratios between Squat, Bench, and Deadlift</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ChartContainer config={{
              squat: { label: "Squat", color: "hsl(var(--accent))" },
              bench: { label: "Bench", color: "hsl(var(--chart-2))" },
              deadlift: { label: "Deadlift", color: "hsl(var(--chart-3))" }
            }}>
              <BarChart data={detailedProgress} layout="vertical">
                <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" hide />
                <YAxis dataKey="week" type="category" axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="squat" stackId="a" fill="hsl(var(--accent))" />
                <Bar dataKey="bench" stackId="a" fill="hsl(var(--chart-2))" />
                <Bar dataKey="deadlift" stackId="a" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
