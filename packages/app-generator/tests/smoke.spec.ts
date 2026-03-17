import { describe, expect, it } from 'vitest';

import * as appGenerator from '../src/index.ts';

describe('app-generator package', () => {
  it('exports the preserved assumption API', () => {
    expect(appGenerator.generateApp).toBeTypeOf('function');
  });
});
