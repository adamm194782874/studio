export const PLATE_WEIGHTS = [45, 35, 25, 10, 5, 2.5];
export const BAR_WEIGHT = 45;

export interface PlateSet {
  weight: number;
  count: number;
}

export function calculatePlates(totalWeight: number): PlateSet[] {
  let remaining = (totalWeight - BAR_WEIGHT) / 2;
  const result: PlateSet[] = [];

  if (remaining < 0) return [];

  for (const plate of PLATE_WEIGHTS) {
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      result.push({ weight: plate, count });
      remaining -= count * plate;
    }
  }

  return result;
}

export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  // Brzycki formula
  return Math.round(weight * (36 / (37 - reps)));
}

export function getPowerliftingStandard(lift: 'squat' | 'bench' | 'deadlift', bodyweight: number, level: 'novice' | 'intermediate' | 'advanced' | 'elite'): number {
  // Rough multipliers based on typical standards (not exact Open Powerlifting database but industry standard approximations)
  const standards = {
    squat: { novice: 1.0, intermediate: 1.5, advanced: 2.0, elite: 2.5 },
    bench: { novice: 0.7, intermediate: 1.1, advanced: 1.5, elite: 1.9 },
    deadlift: { novice: 1.2, intermediate: 1.8, advanced: 2.4, elite: 3.0 }
  };
  return Math.round(bodyweight * standards[lift][level]);
}
