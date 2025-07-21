import m1 from './pim-to-semantic-model.ts';

export const migrations = {
  1: m1,
  2: m1       // TODO RadStr: Do I have to? I had to do it long time ago, but maybe I don't now
} as Record<number, () => Promise<void>>;

export const currentVersion = 2;