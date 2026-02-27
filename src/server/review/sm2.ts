import { ApiError, ERROR_CODES } from "@/lib/errors";

export interface Sm2State {
  ef: number;
  repetition: number;
  intervalDays: number;
}

export interface Sm2Result extends Sm2State {
  efBefore: number;
  repetitionBefore: number;
  intervalDaysBefore: number;
}

export function calculateSm2(state: Sm2State, quality: number): Sm2Result {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "quality must be between 0 and 5", 400);
  }

  const q = quality;
  const efBefore = state.ef;
  const repetitionBefore = state.repetition;
  const intervalDaysBefore = state.intervalDays;

  const updatedEf = Math.max(1.3, state.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  if (quality < 3) {
    return {
      efBefore,
      repetitionBefore,
      intervalDaysBefore,
      ef: updatedEf,
      repetition: 0,
      intervalDays: 1,
    };
  }

  const repetition = state.repetition + 1;
  let intervalDays = 1;

  if (repetition === 1) {
    intervalDays = 1;
  } else if (repetition === 2) {
    intervalDays = 6;
  } else {
    intervalDays = Math.max(1, Math.round(state.intervalDays * updatedEf));
  }

  return {
    efBefore,
    repetitionBefore,
    intervalDaysBefore,
    ef: updatedEf,
    repetition,
    intervalDays,
  };
}
