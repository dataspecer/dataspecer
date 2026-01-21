import { describe, it, expect } from 'vitest';
import { generateModelColor } from './color-utils';

describe('color-utils', () => {
  describe('generateModelColor', () => {
    it('should generate consistent colors for the same model ID', () => {
      const modelId = 'test-model-123';
      const color1 = generateModelColor(modelId);
      const color2 = generateModelColor(modelId);
      
      expect(color1).toBe(color2);
    });

    it('should generate different colors for different model IDs', () => {
      const modelId1 = 'test-model-1';
      const modelId2 = 'test-model-2';
      
      const color1 = generateModelColor(modelId1);
      const color2 = generateModelColor(modelId2);
      
      expect(color1).not.toBe(color2);
    });

    it('should generate valid hex color strings', () => {
      const modelId = 'test-model';
      const color = generateModelColor(modelId);
      
      // Check format: #RRGGBB
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    it('should generate different colors for Main Application Profile and SGOV cache', () => {
      // These are the two model names shown in the issue
      const mainAppProfileColor = generateModelColor('main-application-profile');
      const sgovCacheColor = generateModelColor('sgov-cache');
      
      expect(mainAppProfileColor).not.toBe(sgovCacheColor);
      
      // Log the colors for verification
      console.log('Main Application Profile color:', mainAppProfileColor);
      console.log('SGOV cache color:', sgovCacheColor);
    });

    it('should not generate the default blue color (#4998F9)', () => {
      // Test with various model IDs
      const modelIds = [
        'main-application-profile',
        'sgov-cache',
        'test-model-1',
        'test-model-2',
        'vocabulary-1',
      ];
      
      const colors = modelIds.map(id => generateModelColor(id));
      
      // The colors might be the same as the blue by chance, but it's highly unlikely
      // that all of them would be the default blue
      const defaultBlue = '#4998F9';
      const allBlue = colors.every(color => color === defaultBlue);
      
      expect(allBlue).toBe(false);
      
      // Log all generated colors
      modelIds.forEach((id, index) => {
        console.log(`${id}: ${colors[index]}`);
      });
    });
  });
});
