'use server';
/**
 * @fileOverview This file implements a Genkit flow for providing personalized powerlifting training insights.
 *
 * - receivePersonalizedTrainingInsights - A function that handles the generation of personalized training feedback.
 * - ReceivePersonalizedTrainingInsightsInput - The input type for the receivePersonalizedTrainingInsights function.
 * - ReceivePersonalizedTrainingInsightsOutput - The return type for the receivePersonalizedTrainingInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReceivePersonalizedTrainingInsightsInputSchema = z.object({
  historicalTrainingDataSummary: z
    .string()
    .describe(
      'A summary string of the user\'s historical training data, including exercises, weights, reps, sets, and dates. Example: "User\'s recent squat max is 300 lbs (5 reps), bench max is 200 lbs (3 reps), deadlift max is 400 lbs (1 rep). Training volume for squat has increased by 10% over the last month."'
    ),
  bodyweightHistorySummary: z
    .string()
    .describe(
      'A summary string of the user\'s bodyweight history. Example: "User\'s bodyweight has been stable at 180 lbs for the last 3 months, with a slight decrease of 2 lbs last week."'
    ),
  powerliftingStandardsComparison: z
    .string()
    .describe(
      'A summary string comparing the user\'s performance to Open Powerlifting standards for their age, weight class, and experience level. Example: "User\'s squat is at an Intermediate level, bench at Novice-Intermediate, and deadlift at Advanced for their weight class and experience."'
    ),
  userGoals: z
    .string()
    .optional()
    .describe(
      'Optional. The user\'s current powerlifting goals. Example: "User aims to increase squat by 20 lbs in 8 weeks and improve bench press stability."'
    ),
});
export type ReceivePersonalizedTrainingInsightsInput = z.infer<
  typeof ReceivePersonalizedTrainingInsightsInputSchema
>;

const ReceivePersonalizedTrainingInsightsOutputSchema = z.object({
  feedback: z
    .string()
    .describe(
      'Personalized feedback on the user\'s overall performance and progression.'
    ),
  suggestions: z
    .string()
    .describe(
      'Actionable suggestions for workout adjustments, program modifications, or specific exercises.'
    ),
  formTips: z
    .string()
    .describe(
      'General tips for improving lifting form, relevant to the user\'s data or common powerlifting issues.'
    ),
  aiDisclaimer: z
    .string()
    .describe(
      'A disclaimer reminding the user that this is AI-generated advice and should be cross-referenced with a professional coach.'
    ),
});
export type ReceivePersonalizedTrainingInsightsOutput = z.infer<
  typeof ReceivePersonalizedTrainingInsightsOutputSchema
>;

export async function receivePersonalizedTrainingInsights(
  input: ReceivePersonalizedTrainingInsightsInput
): Promise<ReceivePersonalizedTrainingInsightsOutput> {
  return receivePersonalizedTrainingInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedTrainingInsightsPrompt',
  input: {schema: ReceivePersonalizedTrainingInsightsInputSchema},
  output: {schema: ReceivePersonalizedTrainingInsightsOutputSchema},
  prompt: `You are an expert powerlifting coach specializing in analyzing training data and providing personalized feedback.\nYour goal is to help a powerlifter optimize their training, prevent plateaus, and improve their performance based on their logged data and powerlifting standards.\n\nAnalyze the provided information and generate comprehensive feedback, actionable suggestions for workout adjustments, and relevant form tips. Always include a disclaimer at the end that this advice is AI-generated and should be cross-referenced with a professional coach.\n\n---\nUser's Historical Training Data Summary:\n{{{historicalTrainingDataSummary}}}\n\nUser's Bodyweight History Summary:\n{{{bodyweightHistorySummary}}}\n\nComparison to Open Powerlifting Standards:\n{{{powerliftingStandardsComparison}}}\n\n{{#if userGoals}}\nUser's Current Goals:\n{{{userGoals}}}\n{{/if}}\n---\n\nBased on the information above, provide:\n\n1.  **Feedback**: Provide general feedback on the user's performance, progression, and consistency. Highlight strengths and areas for improvement.\n2.  **Suggestions**: Offer specific, actionable suggestions for adjusting their current workout program, including potential changes to exercise selection, sets, reps, intensity, volume, or recovery strategies. Relate these to their goals and performance compared to standards.\n3.  **Form Tips**: Give general advice on improving lifting form for their main lifts (Squat, Bench, Deadlift) that might be implied by their performance data or common sticking points for their level.\n4.  **Disclaimer**: Include a clear disclaimer.`,
});

const receivePersonalizedTrainingInsightsFlow = ai.defineFlow(
  {
    name: 'receivePersonalizedTrainingInsightsFlow',
    inputSchema: ReceivePersonalizedTrainingInsightsInputSchema,
    outputSchema: ReceivePersonalizedTrainingInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
