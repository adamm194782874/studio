"use client"

import React, { useMemo } from 'react';
import { calculatePlates, WeightUnit } from '@/lib/workout-utils';
import { cn } from '@/lib/utils';

interface PlateVisualizerProps {
  weight: number;
  unit?: WeightUnit;
  barWeight?: number;
  className?: string;
}

const lbsPlateColors: Record<number, string> = {
  45: 'bg-red-600',
  35: 'bg-blue-600',
  25: 'bg-yellow-500',
  10: 'bg-green-600',
  5: 'bg-white text-black',
  2.5: 'bg-gray-400 text-black',
};

const getPlateColor = (p: number, unit: WeightUnit) => {
  if (unit === 'kg') {
    if (p === 25) return 'bg-red-600';
    if (p === 20) return 'bg-blue-600';
    if (p === 15) return 'bg-yellow-500';
    if (p === 10) return 'bg-green-600';
    if (p === 5) return 'bg-white text-black';
    if (p === 2.5) return 'bg-black text-white';
    if (p === 1.25) return 'bg-gray-300 text-black';
  }
  return lbsPlateColors[p] || 'bg-gray-200';
};

const plateHeights: Record<number, string> = {
  45: 'h-32',
  35: 'h-28',
  25: 'h-24',
  10: 'h-16',
  5: 'h-12',
  2.5: 'h-10',
  // KG
  20: 'h-28',
  15: 'h-24',
  1.25: 'h-8',
};

export function PlateVisualizer({ weight, unit = 'lbs', barWeight = 45, className }: PlateVisualizerProps) {
  const plates = useMemo(() => calculatePlates(weight, unit, barWeight), [weight, unit, barWeight]);

  return (
    <div className={cn("flex flex-col items-center gap-4 py-8", className)}>
      <div className="text-center">
        <span className="text-4xl font-headline font-bold text-accent">{weight}</span>
        <span className="text-muted-foreground ml-2">{unit}</span>
      </div>
      
      <div className="relative flex items-center justify-center w-full max-w-md h-40">
        <div className="absolute w-full h-3 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full z-0" />
        <div className="absolute left-0 w-2 h-6 bg-gray-500 rounded-sm" />
        <div className="absolute right-0 w-2 h-6 bg-gray-500 rounded-sm" />

        <div className="flex items-center gap-0.5 z-10">
          {plates.map((plateSet, setIdx) => (
            Array.from({ length: plateSet.count }).map((_, idx) => (
              <div
                key={`${plateSet.weight}-${setIdx}-${idx}`}
                className={cn(
                  "plate w-3 rounded-md flex flex-col items-center justify-center border border-black/20 shadow-lg relative",
                  getPlateColor(plateSet.weight, unit),
                  plateHeights[plateSet.weight] || 'h-20'
                )}
              >
                <div className="w-1 h-full bg-black/10 absolute" />
                <span className="text-[8px] font-bold select-none rotate-90 whitespace-nowrap">
                  {plateSet.weight}
                </span>
              </div>
            ))
          ))}
          <div className="w-2 h-10 bg-gray-400 border-x border-gray-500 ml-1" />
        </div>
      </div>
      
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {plates.length === 0 && weight > barWeight && <p className="text-xs text-muted-foreground italic">Weight too low for standard plates</p>}
        {plates.map((p) => (
          <div key={p.weight} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-xs border border-border">
            <span className={cn("w-2 h-2 rounded-full", getPlateColor(p.weight, unit))} />
            <span className="font-medium">{p.count}x {p.weight}{unit}</span>
          </div>
        ))}
        <div className="w-full text-center mt-2">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Bar: {barWeight}{unit}</p>
        </div>
      </div>
    </div>
  );
}
