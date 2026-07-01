import m1 from './pim-to-semantic-model.ts';

export const migrations = {
  1: m1,
} as Record<number, () => Promise<void>>;

export const currentVersion = 1;
