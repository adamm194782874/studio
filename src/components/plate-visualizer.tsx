"use client"

import React, { useMemo } from 'react';
import { calculatePlates } from '@/lib/workout-utils';
import { cn } from '@/lib/utils';

interface PlateVisualizerProps {
  weight: number;
  className?: string;
}

const plateColors: Record<number, string> = {
  45: 'bg-red-600',
  35: 'bg-blue-600',
  25: 'bg-yellow-500',
  10: 'bg-green-600',
  5: 'bg-white text-black',
  2.5: 'bg-gray-400 text-black',
};

const plateHeights: Record<number, string> = {
  45: 'h-32',
  35: 'h-28',
  25: 'h-24',
  10: 'h-16',
  5: 'h-12',
  2.5: 'h-10',
};

export function PlateVisualizer({ weight, className }: PlateVisualizerProps) {
  const plates = useMemo(() => calculatePlates(weight), [weight]);

  return (
    <div className={cn("flex flex-col items-center gap-4 py-8", className)}>
      <div className="text-center">
        <span className="text-4xl font-headline font-bold text-accent">{weight}</span>
        <span className="text-muted-foreground ml-2">lbs</span>
      </div>
      
      <div className="relative flex items-center justify-center w-full max-w-md h-40">
        {/* Barbell Bar */}
        <div className="absolute w-full h-3 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full z-0" />
        
        {/* Barbell Sleeves ends (simplified visualization) */}
        <div className="absolute left-0 w-2 h-6 bg-gray-500 rounded-sm" />
        <div className="absolute right-0 w-2 h-6 bg-gray-500 rounded-sm" />

        {/* Plates Assembly */}
        <div className="flex items-center gap-0.5 z-10">
          {plates.map((plateSet, setIdx) => (
            Array.from({ length: plateSet.count }).map((_, idx) => (
              <div
                key={`${plateSet.weight}-${setIdx}-${idx}`}
                className={cn(
                  "plate w-3 rounded-md flex flex-col items-center justify-center border border-black/20 shadow-lg",
                  plateColors[plateSet.weight] || 'bg-gray-200',
                  plateHeights[plateSet.weight] || 'h-20'
                )}
              >
                <div className="w-1 h-full bg-black/10 absolute" />
                <span className="text-[8px] font-bold select-none rotate-90">
                  {plateSet.weight}
                </span>
              </div>
            ))
          ))}
          {/* Barbell Sleeve Inner Stop */}
          <div className="w-2 h-10 bg-gray-400 border-x border-gray-500 ml-1" />
        </div>
      </div>
      
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {plates.length === 0 && weight > 45 && <p className="text-xs text-muted-foreground italic">Weight too low for standard plates</p>}
        {plates.map((p) => (
          <div key={p.weight} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-xs">
            <span className={cn("w-2 h-2 rounded-full", plateColors[p.weight])} />
            <span className="font-medium">{p.count}x {p.weight}lb</span>
          </div>
        ))}
      </div>
    </div>
  );
}
