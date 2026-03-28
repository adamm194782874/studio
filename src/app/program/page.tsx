"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CalendarDays, 
  TrendingUp, 
  Dumbbell, 
  Info,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const progressionData = [
  { week: 'Week 1', intensity: 70, volume: 8000 },
  { week: 'Week 2', intensity: 75, volume: 8500 },
  { week: 'Week 3', intensity: 80, volume: 9000 },
  { week: 'Week 4', intensity: 85, volume: 9500 },
  { week: 'Week 5', intensity: 90, volume: 7000 }, // Peak
  { week: 'Week 6', intensity: 60, volume: 5000 }, // Deload
];

const program = {
  day1: {
    title: "Day 1: Squat & Bench Intensity",
    exercises: [
      { name: "Competition Squat", sets: "3", reps: "5", intensity: "75% 1RM" },
      { name: "Competition Bench", sets: "3", reps: "5", intensity: "75% 1RM" },
      { name: "RDL", sets: "3", reps: "8-10", intensity: "Moderate" },
      { name: "Pull-ups", sets: "3", reps: "AMRAP", intensity: "Bodyweight" },
    ]
  },
  day2: {
    title: "Day 2: Deadlift & Accessory",
    exercises: [
      { name: "Competition Deadlift", sets: "3", reps: "3", intensity: "80% 1RM" },
      { name: "Overhead Press", sets: "3", reps: "8", intensity: "Moderate" },
      { name: "Barbell Rows", sets: "4", reps: "10", intensity: "Heavy" },
      { name: "Face Pulls", sets: "3", reps: "15", intensity: "Light" },
    ]
  },
  day3: {
    title: "Day 3: Squat & Bench Volume",
    exercises: [
      { name: "Pause Squat", sets: "4", reps: "6", intensity: "65% 1RM" },
      { name: "Spoto Press", sets: "4", reps: "6", intensity: "65% 1RM" },
      { name: "Leg Press", sets: "3", reps: "12", intensity: "Moderate" },
      { name: "Dips", sets: "3", reps: "10-12", intensity: "Bodyweight" },
    ]
  }
};

export default function ProgrammingPage() {
  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
          <CalendarDays className="text-primary w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-headline font-bold">Training Program</h1>
          <p className="text-muted-foreground">Standard 3-Day Powerlifting Split (Linear Periodization)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progression Overview */}
        <Card className="lg:col-span-2 border-none bg-card/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              6-Week Intensity Projection
            </CardTitle>
            <CardDescription>Planned percentage of 1RM per week</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={{
              intensity: { label: "Intensity (%)", color: "hsl(var(--accent))" },
              volume: { label: "Volume (lbs)", color: "hsl(var(--chart-2))" }
            }}>
              <LineChart data={progressionData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="week" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="intensity" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "hsl(var(--accent))" }} 
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Program Highlights */}
        <Card className="border-none bg-accent/5">
          <CardHeader>
            <CardTitle className="text-lg">Cycle Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
              <p className="text-sm">Increase main lift intensity by 2.5% weekly.</p>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
              <p className="text-sm">Build work capacity through Day 3 volume sessions.</p>
            </div>
            <div className="flex gap-3">
              <Clock className="w-5 h-5 text-accent shrink-0" />
              <p className="text-sm">Mandatory Week 6 deload to prevent CNS fatigue.</p>
            </div>
            <div className="mt-6 p-4 bg-background rounded-lg border border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-accent" />
                <span className="text-xs font-bold uppercase tracking-wider">Note</span>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Percentages are based on your current PRs logged in the Dashboard.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Workout Split Tabs */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="day1" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 h-14 bg-secondary/50">
              <TabsTrigger value="day1" className="text-base font-bold">Monday</TabsTrigger>
              <TabsTrigger value="day2" className="text-base font-bold">Wednesday</TabsTrigger>
              <TabsTrigger value="day3" className="text-base font-bold">Friday</TabsTrigger>
            </TabsList>

            {(Object.keys(program) as Array<keyof typeof program>).map((dayKey) => (
              <TabsContent key={dayKey} value={dayKey} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="border-none bg-card/40">
                  <CardHeader>
                    <CardTitle className="text-2xl font-headline text-primary">{program[dayKey].title}</CardTitle>
                    <CardDescription>Primary session focus</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {program[dayKey].exercises.map((ex, i) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-secondary/30 rounded-2xl border border-white/5 hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Dumbbell className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-bold text-lg">{ex.name}</p>
                              <p className="text-sm text-muted-foreground">{ex.sets} sets x {ex.reps} reps</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase font-bold">Target</p>
                            <p className="font-mono text-accent font-bold">{ex.intensity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
