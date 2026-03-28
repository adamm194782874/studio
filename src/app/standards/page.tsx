"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy, Info, ChevronRight } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

const standards = [
  { lift: 'Squat', current: 265, levels: { novice: 185, intermediate: 275, advanced: 365, elite: 455 } },
  { lift: 'Bench Press', current: 180, levels: { novice: 135, intermediate: 185, advanced: 245, elite: 315 } },
  { lift: 'Deadlift', current: 330, levels: { novice: 225, intermediate: 330, advanced: 445, elite: 550 } },
];

export default function Standards() {
  const getLevel = (lift: any) => {
    if (lift.current >= lift.levels.elite) return { label: 'Elite', progress: 100, color: 'text-purple-400' };
    if (lift.current >= lift.levels.advanced) return { label: 'Advanced', progress: 75, color: 'text-red-400' };
    if (lift.current >= lift.levels.intermediate) return { label: 'Intermediate', progress: 50, color: 'text-accent' };
    return { label: 'Novice', progress: 25, color: 'text-blue-400' };
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
          <Trophy className="text-accent w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-headline font-bold">Open Powerlifting Benchmarks</h1>
          <p className="text-muted-foreground">Comparative standards for 185lb Bodyweight Class</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {standards.map((lift) => {
          const levelInfo = getLevel(lift);
          return (
            <Card key={lift.lift} className="border-none bg-card/40 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-2xl font-headline">{lift.lift}</CardTitle>
                  <CardDescription>Current: {lift.current} lbs</CardDescription>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-headline font-bold uppercase tracking-wider ${levelInfo.color}`}>
                    {levelInfo.label}
                  </div>
                  <p className="text-xs text-muted-foreground">Standardized Level</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative pt-4">
                  <Progress value={levelInfo.progress} className="h-3 bg-secondary" />
                  <div className="flex justify-between mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                    <div className="text-center">
                      <p>Novice</p>
                      <p>{lift.levels.novice}</p>
                    </div>
                    <div className="text-center">
                      <p>Intermediate</p>
                      <p>{lift.levels.intermediate}</p>
                    </div>
                    <div className="text-center">
                      <p>Advanced</p>
                      <p>{lift.levels.advanced}</p>
                    </div>
                    <div className="text-center">
                      <p>Elite</p>
                      <p>{lift.levels.elite}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 bg-secondary/30 rounded-xl flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <ChevronRight className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Next Milestone</p>
                      <p className="font-bold">Reach {lift.levels.intermediate + 10} lbs for Advanced</p>
                    </div>
                  </div>
                  <div className="p-4 bg-secondary/30 rounded-xl flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-400/10 flex items-center justify-center">
                      <Info className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Top Percentile</p>
                      <p className="font-bold">Top 35% of lifters</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-none bg-accent/5">
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
          <Info className="w-8 h-8 text-accent shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            These standards are based on normalized data from Open Powerlifting for the 185lb drug-tested male weight class. Standards represent a cumulative score across various federations. Always consult a coach before attempting maximum effort lifts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
