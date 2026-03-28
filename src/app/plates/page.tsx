"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlateVisualizer } from '@/components/plate-visualizer';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Info } from 'lucide-react';

export default function PlateCalculatorPage() {
  const [weight, setWeight] = useState<number>(225);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) setWeight(val);
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
          <Calculator className="text-accent w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-headline font-bold">Plate Calculator</h1>
          <p className="text-muted-foreground">Quickly visualize how to load your bar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 border-none bg-card/40">
          <CardHeader>
            <CardTitle className="text-lg">Input Weight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="total-weight">Total Weight (lbs)</Label>
              <Input 
                id="total-weight"
                type="number" 
                value={weight} 
                onChange={handleWeightChange}
                className="text-2xl font-bold h-14 bg-secondary border-none"
              />
            </div>
            <div className="pt-4 flex items-start gap-2 text-xs text-muted-foreground bg-secondary/20 p-4 rounded-lg">
              <Info className="w-4 h-4 shrink-0 text-accent" />
              <p>Calculated using a standard 45lb Olympic barbell. This shows the plates required for <strong>one side</strong> of the bar.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none bg-card/40">
          <CardHeader>
            <CardTitle className="text-lg text-center">Visual Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <PlateVisualizer weight={weight} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[135, 225, 315, 405].map((w) => (
          <button
            key={w}
            onClick={() => setWeight(w)}
            className="p-6 bg-secondary/30 rounded-2xl border border-white/5 hover:bg-accent/10 hover:border-accent/50 transition-all text-center"
          >
            <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Standard</p>
            <p className="text-2xl font-headline font-bold">{w} lbs</p>
          </button>
        ))}
      </div>
    </div>
  );
}
