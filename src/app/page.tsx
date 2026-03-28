"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlateVisualizer } from '@/components/plate-visualizer';
import { 
  TrendingUp, 
  Dumbbell, 
  Calendar, 
  Scale, 
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const weeklyProgress = [
  { week: 'W1', squat: 225, bench: 155, deadlift: 275 },
  { week: 'W2', squat: 235, bench: 160, deadlift: 285 },
  { week: 'W3', squat: 245, bench: 165, deadlift: 300 },
  { week: 'W4', squat: 255, bench: 175, deadlift: 315 },
  { week: 'W5', squat: 265, bench: 180, deadlift: 330 },
];

export default function Dashboard() {
  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold mb-2">Welcome back, Athlete</h1>
          <p className="text-muted-foreground">Here is your training overview for the week.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-secondary p-3 rounded-lg flex items-center gap-3">
            <Scale className="text-accent w-5 h-5" />
            <div>
              <p className="text-xs text-muted-foreground">Current BW</p>
              <p className="font-bold">184.5 lbs</p>
            </div>
          </div>
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            New Workout
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              SQUAT MAX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">265 lbs</div>
            <div className="flex items-center text-accent text-sm mt-1">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +10 lbs this week
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              BENCH MAX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">180 lbs</div>
            <div className="flex items-center text-accent text-sm mt-1">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +5 lbs this week
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              DEADLIFT MAX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">330 lbs</div>
            <div className="flex items-center text-accent text-sm mt-1">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +15 lbs this week
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Progress Chart */}
        <Card className="col-span-1 lg:col-span-2 border-none bg-card/40">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Lift Progression</CardTitle>
            <CardDescription>Estimated 1RM trends over the last 5 weeks</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            <ChartContainer config={{
              squat: { label: "Squat", color: "hsl(var(--accent))" },
              bench: { label: "Bench", color: "hsl(var(--chart-2))" },
              deadlift: { label: "Deadlift", color: "hsl(var(--chart-3))" }
            }}>
              <AreaChart data={weeklyProgress}>
                <defs>
                  <linearGradient id="colorSquat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis 
                  dataKey="week" 
                  stroke="rgba(0,0,0,0.3)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="rgba(0,0,0,0.3)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `${value}lb`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area 
                  type="monotone" 
                  dataKey="squat" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSquat)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="bench" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  fillOpacity={0.1}
                  fill="hsl(var(--chart-2))" 
                />
                <Area 
                  type="monotone" 
                  dataKey="deadlift" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  fillOpacity={0.1}
                  fill="hsl(var(--chart-3))" 
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Plate Visualization Demo */}
        <Card className="border-none bg-card/40">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Plate Visualizer</CardTitle>
            <CardDescription>Setup for your next set (265 lbs)</CardDescription>
          </CardHeader>
          <CardContent>
            <PlateVisualizer weight={265} />
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card className="border-none bg-card/40">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Recent Activity</CardTitle>
            <CardDescription>Your last training sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { type: 'Heavy Squat Day', date: 'Yesterday', volume: '12,450 lbs', rating: 5 },
              { type: 'Bench Accessory', date: 'Oct 23', volume: '8,200 lbs', rating: 4 },
              { type: 'Deadlift Intensity', date: 'Oct 21', volume: '14,100 lbs', rating: 4 },
            ].map((session, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-bold">{session.type}</p>
                    <p className="text-xs text-muted-foreground">{session.date} • Volume: {session.volume}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
