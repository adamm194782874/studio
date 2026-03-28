export type WeightUnit = 'lbs' | 'kg';

export const LBS_PLATE_WEIGHTS = [45, 35, 25, 10, 5, 2.5];
export const KG_PLATE_WEIGHTS = [25, 20, 15, 10, 5, 2.5, 1.25];

export interface PlateSet {
  weight: number;
  count: number;
}

export function calculatePlates(totalWeight: number, unit: WeightUnit = 'lbs', barWeight: number = 45): PlateSet[] {
  let remaining = (totalWeight - barWeight) / 2;
  const result: PlateSet[] = [];

  if (remaining < 0) return [];

  const plates = unit === 'lbs' ? LBS_PLATE_WEIGHTS : KG_PLATE_WEIGHTS;

  for (const plate of plates) {
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      result.push({ weight: plate, count });
      remaining = Math.round((remaining - (count * plate)) * 100) / 100;
    }
  }

  return result;
}

export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  // Brzycki formula
  return Math.round(weight * (36 / (37 - reps)));
}

export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462 * 10) / 10;
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462);
}

export function getPowerliftingStandard(lift: 'squat' | 'bench' | 'deadlift', bodyweight: number, level: 'novice' | 'intermediate' | 'advanced' | 'elite'): number {
  const standards = {
    squat: { novice: 1.0, intermediate: 1.5, advanced: 2.0, elite: 2.5 },
    bench: { novice: 0.7, intermediate: 1.1, advanced: 1.5, elite: 1.9 },
    deadlift: { novice: 1.2, intermediate: 1.8, advanced: 2.4, elite: 3.0 }
  };
  return Math.round(bodyweight * standards[lift][level]);
}
