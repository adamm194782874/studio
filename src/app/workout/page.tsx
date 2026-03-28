"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, Dumbbell, Calculator, ListTodo } from 'lucide-react';
import { PlateVisualizer } from '@/components/plate-visualizer';

interface ExerciseSet {
  reps: string;
  weight: string;
}

interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
}

export default function WorkoutLog() {
  const [exercises, setExercises] = useState<Exercise[]>([
    { id: '1', name: 'Low Bar Squat', sets: [{ weight: '225', reps: '5' }] }
  ]);
  const [activeWeight, setActiveWeight] = useState(225);

  const addExercise = () => {
    setExercises([...exercises, { 
      id: Date.now().toString(), 
      name: 'New Exercise', 
      sets: [{ weight: '135', reps: '5' }] 
    }]);
  };

  const addSet = (exerciseId: string) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { ...lastSet }] };
      }
      return ex;
    }));
  };

  const updateSet = (exerciseId: string, setIndex: number, field: keyof ExerciseSet, value: string) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        const newSets = [...ex.sets];
        newSets[setIndex] = { ...newSets[setIndex], [field]: value };
        
        if (field === 'weight') {
          const w = parseInt(value);
          if (!isNaN(w)) setActiveWeight(w);
        }
        
        return { ...ex, sets: newSets };
      }
      return ex;
    }));
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold">Training Session</h1>
          <p className="text-muted-foreground">Logged on {new Date().toLocaleDateString()}</p>
        </div>
        <Button className="bg-accent text-background hover:bg-accent/90">
          <Save className="w-4 h-4 mr-2" />
          Finish Workout
        </Button>
      </div>

      <Tabs defaultValue="log" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-secondary/50">
          <TabsTrigger value="log" className="flex items-center gap-2">
            <ListTodo className="w-4 h-4" />
            Exercise Log
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Plate Calculator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-6">
          <div className="space-y-6">
            {exercises.map((exercise) => (
              <Card key={exercise.id} className="border-none bg-card/40">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Input 
                    className="bg-transparent border-none text-xl font-headline font-bold p-0 focus-visible:ring-0 h-auto" 
                    value={exercise.name}
                    onChange={(e) => {
                      setExercises(exercises.map(ex => ex.id === exercise.id ? {...ex, name: e.target.value} : ex));
                    }}
                  />
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-12 gap-4 px-2 text-xs font-bold text-muted-foreground uppercase">
                    <div className="col-span-2">Set</div>
                    <div className="col-span-4">Weight (lbs)</div>
                    <div className="col-span-4">Reps</div>
                    <div className="col-span-2 text-right">Done</div>
                  </div>
                  
                  {exercise.sets.map((set, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-2 font-mono text-sm">{idx + 1}</div>
                      <div className="col-span-4">
                        <Input 
                          type="number" 
                          className="bg-secondary border-none" 
                          value={set.weight} 
                          onChange={(e) => updateSet(exercise.id, idx, 'weight', e.target.value)}
                          onFocus={() => setActiveWeight(parseInt(set.weight) || 45)}
                        />
                      </div>
                      <div className="col-span-4">
                        <Input 
                          type="number" 
                          className="bg-secondary border-none" 
                          value={set.reps}
                          onChange={(e) => updateSet(exercise.id, idx, 'reps', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <div className="w-6 h-6 border-2 border-muted-foreground rounded hover:bg-accent/20 cursor-pointer" />
                      </div>
                    </div>
                  ))}

                  <Button 
                    variant="outline" 
                    className="w-full mt-4 border-dashed border-muted-foreground text-muted-foreground hover:text-accent hover:border-accent"
                    onClick={() => addSet(exercise.id)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Set
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Button onClick={addExercise} className="w-full h-16 text-lg border-2 border-dashed border-muted/50 bg-transparent hover:bg-secondary/20 hover:border-accent">
              <Dumbbell className="w-5 h-5 mr-2" />
              Add Exercise
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="calculator">
          <Card className="border-none bg-card/40">
            <CardHeader>
              <CardTitle>Plate Visualization</CardTitle>
              <CardDescription>Currently viewing {activeWeight} lbs</CardDescription>
            </CardHeader>
            <CardContent>
              <PlateVisualizer weight={activeWeight} />
              <div className="mt-8 p-4 bg-secondary/30 rounded-lg">
                <p className="text-sm text-center text-muted-foreground italic">
                  Tap on a weight field in your Exercise Log to automatically update this visualizer.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
