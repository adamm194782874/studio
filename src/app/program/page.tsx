"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CalendarDays, 
  TrendingUp, 
  Dumbbell, 
  Plus, 
  Trash2, 
  Calculator,
  Save,
  Info
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { WeightUnit } from '@/lib/workout-utils';

type LiftType = 'squat' | 'bench' | 'deadlift' | 'custom';

interface ProgramExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  percentage: string;
  refLift: LiftType;
  customMax?: string;
}

interface DayProgram {
  title: string;
  exercises: ProgramExercise[];
}

const progressionData = [
  { week: 'Week 1', intensity: 70 },
  { week: 'Week 2', intensity: 75 },
  { week: 'Week 3', intensity: 80 },
  { week: 'Week 4', intensity: 85 },
  { week: 'Week 5', intensity: 90 },
  { week: 'Week 6', intensity: 60 },
];

export default function ProgrammingPage() {
  const [unit, setUnit] = useState<WeightUnit>('lbs');
  const [prs, setPrs] = useState({
    squat: '265',
    bench: '180',
    deadlift: '330'
  });

  const [program, setProgram] = useState<Record<string, DayProgram>>({
    day1: {
      title: "Day 1: Intensity",
      exercises: [
        { id: '1', name: 'Competition Squat', sets: '3', reps: '5', percentage: '75', refLift: 'squat' },
        { id: '2', name: 'Competition Bench', sets: '3', reps: '5', percentage: '75', refLift: 'bench' },
      ]
    },
    day2: {
      title: "Day 2: Deadlift Focus",
      exercises: [
        { id: '3', name: 'Competition Deadlift', sets: '3', reps: '3', percentage: '80', refLift: 'deadlift' },
      ]
    },
    day3: {
      title: "Day 3: Volume",
      exercises: [
        { id: '4', name: 'Pause Squat', sets: '4', reps: '6', percentage: '65', refLift: 'squat' },
        { id: '5', name: 'Spoto Press', sets: '4', reps: '6', percentage: '65', refLift: 'bench' },
      ]
    }
  });

  const addExercise = (day: string) => {
    const newEx: ProgramExercise = {
      id: Date.now().toString(),
      name: 'New Exercise',
      sets: '3',
      reps: '8',
      percentage: '70',
      refLift: 'squat'
    };
    setProgram({
      ...program,
      [day]: { ...program[day], exercises: [...program[day].exercises, newEx] }
    });
  };

  const removeExercise = (day: string, id: string) => {
    setProgram({
      ...program,
      [day]: { ...program[day], exercises: program[day].exercises.filter(ex => ex.id !== id) }
    });
  };

  const updateExercise = (day: string, id: string, field: keyof ProgramExercise, value: string) => {
    setProgram({
      ...program,
      [day]: {
        ...program[day],
        exercises: program[day].exercises.map(ex => ex.id === id ? { ...ex, [field]: value } : ex)
      }
    });
  };

  const calculateWeight = (ex: ProgramExercise) => {
    const max = ex.refLift === 'custom' 
      ? parseFloat(ex.customMax || '0') 
      : parseFloat(prs[ex.refLift as keyof typeof prs] || '0');
    const pct = parseFloat(ex.percentage) / 100;
    const weight = max * pct;
    if (isNaN(weight)) return 0;
    
    // Round to nearest logical jump
    const jump = unit === 'kg' ? 2.5 : 5;
    return Math.round(weight / jump) * jump;
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <CalendarDays className="text-primary w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-headline font-bold">Custom Programming</h1>
            <p className="text-muted-foreground">Build your 3-day split with automated 1RM calculations</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={unit} onValueChange={(v) => setUnit(v as WeightUnit)}>
            <SelectTrigger className="w-24 bg-secondary border-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lbs">LBS</SelectItem>
              <SelectItem value="kg">KG</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-accent text-background hover:bg-accent/90">
            <Save className="w-4 h-4 mr-2" />
            Save Program
          </Button>
        </div>
      </div>

      <Card className="border-none bg-secondary/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-accent" />
            Reference 1-Rep Maxes ({unit})
          </CardTitle>
          <CardDescription>Enter your maxes to automatically calculate target weights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['squat', 'bench', 'deadlift'] as const).map((lift) => (
              <div key={lift} className="space-y-2">
                <Label htmlFor={lift} className="capitalize">{lift} 1RM ({unit})</Label>
                <Input 
                  id={lift}
                  type="number"
                  value={prs[lift]}
                  onChange={(e) => setPrs({...prs, [lift]: e.target.value})}
                  className="bg-background border-none text-lg font-bold"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none bg-card/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Cycle Intensity Projection
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ChartContainer config={{
              intensity: { label: "Intensity (%)", color: "hsl(var(--accent))" }
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

        <Card className="border-none bg-accent/5">
          <CardHeader>
            <CardTitle className="text-lg">Programming Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 text-sm text-muted-foreground">
              <Info className="w-5 h-5 text-accent shrink-0" />
              <p>Percentages usually range from 65% (volume) to 90%+ (peaking).</p>
            </div>
            <div className="p-4 bg-background rounded-lg border border-accent/20">
              <p className="text-xs italic">
                Calculated weights round to the nearest {unit === 'kg' ? '2.5kg' : '5lbs'}.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <Tabs defaultValue="day1" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 h-14 bg-secondary/50 p-1">
              <TabsTrigger value="day1" className="text-base font-bold">Session A</TabsTrigger>
              <TabsTrigger value="day2" className="text-base font-bold">Session B</TabsTrigger>
              <TabsTrigger value="day3" className="text-base font-bold">Session C</TabsTrigger>
            </TabsList>

            {(Object.keys(program) as Array<keyof typeof program>).map((dayKey) => (
              <TabsContent key={dayKey} value={dayKey} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <Input 
                      value={program[dayKey].title}
                      onChange={(e) => setProgram({...program, [dayKey]: {...program[dayKey], title: e.target.value}})}
                      className="bg-transparent border-none text-2xl font-headline font-bold p-0 w-auto focus-visible:ring-0"
                    />
                    <Button onClick={() => addExercise(dayKey)} variant="outline" size="sm" className="border-accent text-accent">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Exercise
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {program[dayKey].exercises.map((ex) => (
                      <Card key={ex.id} className="border-none bg-card/40 hover:bg-card/60 transition-colors">
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                            <div className="md:col-span-3 space-y-2">
                              <Label className="text-xs uppercase font-bold text-muted-foreground">Exercise</Label>
                              <Input 
                                value={ex.name} 
                                onChange={(e) => updateExercise(dayKey, ex.id, 'name', e.target.value)}
                                className="bg-secondary/50 border-none font-bold"
                              />
                            </div>

                            <div className="md:col-span-2 grid grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Sets</Label>
                                <Input 
                                  value={ex.sets} 
                                  onChange={(e) => updateExercise(dayKey, ex.id, 'sets', e.target.value)}
                                  className="bg-secondary/50 border-none text-center font-mono"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Reps</Label>
                                <Input 
                                  value={ex.reps} 
                                  onChange={(e) => updateExercise(dayKey, ex.id, 'reps', e.target.value)}
                                  className="bg-secondary/50 border-none text-center font-mono"
                                />
                              </div>
                            </div>

                            <div className="md:col-span-3 grid grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Basis</Label>
                                <Select 
                                  value={ex.refLift} 
                                  onValueChange={(val) => updateExercise(dayKey, ex.id, 'refLift', val)}
                                >
                                  <SelectTrigger className="bg-secondary/50 border-none">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="squat">Squat</SelectItem>
                                    <SelectItem value="bench">Bench</SelectItem>
                                    <SelectItem value="deadlift">Deadlift</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Target %</Label>
                                <div className="relative">
                                  <Input 
                                    value={ex.percentage} 
                                    onChange={(e) => updateExercise(dayKey, ex.id, 'percentage', e.target.value)}
                                    className="bg-secondary/50 border-none text-center font-mono pr-6"
                                  />
                                  <span className="absolute right-2 top-2 text-xs text-muted-foreground">%</span>
                                </div>
                              </div>
                            </div>

                            <div className="md:col-span-3 space-y-2">
                              {ex.refLift === 'custom' && (
                                <div className="mb-2">
                                  <Label className="text-xs uppercase font-bold text-muted-foreground">Custom Max ({unit})</Label>
                                  <Input 
                                    value={ex.customMax || ''} 
                                    placeholder="Enter max"
                                    onChange={(e) => updateExercise(dayKey, ex.id, 'customMax', e.target.value)}
                                    className="bg-secondary/50 border-none h-8 text-xs"
                                  />
                                </div>
                              )}
                              <div className="p-3 bg-accent/10 rounded-lg text-center border border-accent/20">
                                <p className="text-[10px] uppercase font-bold text-accent mb-1">Target Weight</p>
                                <p className="text-xl font-headline font-bold text-accent">{calculateWeight(ex)} {unit}</p>
                              </div>
                            </div>

                            <div className="md:col-span-1 flex justify-end">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeExercise(dayKey, ex.id)}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
