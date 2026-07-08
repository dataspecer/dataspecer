import type { DataspecerMetadataProvider, SpecificationMetadata } from './types.ts';

export class FakeDataspecerMetadataProvider implements DataspecerMetadataProvider {
  constructor(private readonly metadataBySpecificationIri: Record<string, SpecificationMetadata>) {}

  async getSpecificationMetadata(dataSpecificationIri: string): Promise<SpecificationMetadata> {
    const metadata = this.metadataBySpecificationIri[dataSpecificationIri] ?? {
      dataSpecificationIri,
      aggregates: [],
    };
    return Promise.resolve(metadata);
  }
}
