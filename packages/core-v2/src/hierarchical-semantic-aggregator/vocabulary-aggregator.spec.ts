import { describe, it, expect } from 'vitest';
import { VocabularyAggregator } from './vocabulary-aggregator.ts';
import { InMemorySemanticModel } from '../semantic-model/in-memory/index.ts';

describe('VocabularyAggregator color generation', () => {
  it('should include color in thisVocabularyChain', () => {
    const model = new InMemorySemanticModel();
    model.deserializeModel({
      modelId: 'test-model-123',
      modelAlias: 'Test Model',
      entities: {},
    });
    
    const aggregator = new VocabularyAggregator(model);
    
    // Check that thisVocabularyChain includes both name and color
    expect(aggregator.thisVocabularyChain).toHaveProperty('name');
    expect(aggregator.thisVocabularyChain).toHaveProperty('color');
    
    // Verify the name
    expect((aggregator.thisVocabularyChain as any).name).toBe('Test Model');
    
    // Verify the color is a valid hex color
    const color = (aggregator.thisVocabularyChain as any).color;
    expect(color).toMatch(/^#[0-9A-F]{6}$/);
    
    console.log('Generated color for test-model-123:', color);
  });
  
  it('should generate different colors for different model IDs', () => {
    const model1 = new InMemorySemanticModel();
    model1.deserializeModel({
      modelId: 'model-1',
      modelAlias: 'Model 1',
      entities: {},
    });
    
    const model2 = new InMemorySemanticModel();
    model2.deserializeModel({
      modelId: 'model-2',
      modelAlias: 'Model 2',
      entities: {},
    });
    
    const aggregator1 = new VocabularyAggregator(model1);
    const aggregator2 = new VocabularyAggregator(model2);
    
    const color1 = (aggregator1.thisVocabularyChain as any).color;
    const color2 = (aggregator2.thisVocabularyChain as any).color;
    
    expect(color1).not.toBe(color2);
    
    console.log('Model 1 color:', color1);
    console.log('Model 2 color:', color2);
  });
});
