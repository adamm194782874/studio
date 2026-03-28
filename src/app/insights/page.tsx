"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Sparkles, Loader2, AlertCircle, Quote } from 'lucide-react';
import { receivePersonalizedTrainingInsights, type ReceivePersonalizedTrainingInsightsOutput } from '@/ai/flows/receive-personalized-training-insights';
import { useToast } from '@/hooks/use-toast';

export default function AIInsights() {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<ReceivePersonalizedTrainingInsightsOutput | null>(null);
  const { toast } = useToast();

  const generateInsights = async () => {
    setLoading(true);
    try {
      const result = await receivePersonalizedTrainingInsights({
        historicalTrainingDataSummary: "User's squat max is 265 lbs, bench is 180 lbs, deadlift is 330 lbs. Volume is up 8% month-over-month. Squat is currently hitting a plateau at 5-rep ranges.",
        bodyweightHistorySummary: "Bodyweight has decreased by 2 lbs over the last month (from 186.5 to 184.5 lbs).",
        powerliftingStandardsComparison: "Squat and Deadlift are Intermediate. Bench press is Novice-Intermediate.",
        userGoals: "Increase squat 1RM by 20 lbs and improve bench press stability."
      });
      setInsights(result);
    } catch (error) {
      toast({
        title: "Error generating insights",
        description: "There was a problem communicating with the AI coach. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-4 bg-primary/20 rounded-2xl mb-4">
          <BrainCircuit className="w-10 h-10 text-accent" />
        </div>
        <h1 className="text-4xl font-headline font-bold">Coach AI</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Get personalized feedback and training adjustments based on your lift history and Open Powerlifting standards.
        </p>
        <Button 
          size="lg" 
          onClick={generateInsights} 
          disabled={loading}
          className="bg-accent text-background hover:bg-accent/90 font-bold px-10 h-14 rounded-xl"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyzing Data...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Personal Strategy
            </>
          )}
        </Button>
      </div>

      {insights && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none bg-card/40 overflow-hidden">
            <CardHeader className="bg-primary/10 pb-6 border-b border-primary/20">
              <div className="flex items-center gap-3">
                <Quote className="w-6 h-6 text-accent" />
                <CardTitle className="font-headline text-2xl">Performance Feedback</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {insights.feedback}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none bg-card/40">
              <CardHeader>
                <CardTitle className="text-accent flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Program Adjustments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {insights.suggestions}
                </p>
              </CardContent>
            </Card>

            <Card className="border-none bg-card/40">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Technical Form Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {insights.formTips}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="p-4 bg-secondary/30 rounded-lg text-xs text-muted-foreground italic text-center">
            {insights.aiDisclaimer}
          </div>
        </div>
      )}

      {!insights && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
          {[
            { title: "Data Driven", desc: "Syncs with your latest workout volume and bodyweight trends." },
            { title: "Standard Benchmarked", desc: "Compares your lifts against elite Open Powerlifting data." },
            { title: "Actionable Advice", desc: "Get specific set/rep changes to break through current plateaus." }
          ].map((feat, i) => (
            <div key={i} className="text-center p-6 bg-secondary/20 rounded-2xl border border-white/5">
              <h3 className="font-headline font-bold mb-2">{feat.title}</h3>
              <p className="text-sm text-muted-foreground">{feat.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
