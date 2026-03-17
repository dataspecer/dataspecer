import type { DataspecerSpecificationMetadata } from './types.ts';

export interface DataspecerMetadataProvider {
  getSpecificationMetadata(dataSpecificationIri: string): Promise<DataspecerSpecificationMetadata>;
}
