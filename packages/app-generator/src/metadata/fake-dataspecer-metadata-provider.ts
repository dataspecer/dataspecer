import type { DataspecerMetadataProvider } from './dataspecer-metadata-provider.ts';
import type { DataspecerSpecificationMetadata } from './types.ts';

export class FakeDataspecerMetadataProvider implements DataspecerMetadataProvider {
  constructor(
    private readonly metadataBySpecificationIri: Record<string, DataspecerSpecificationMetadata>
  ) {}

  async getSpecificationMetadata(
    dataSpecificationIri: string
  ): Promise<DataspecerSpecificationMetadata> {
    const metadata = this.metadataBySpecificationIri[dataSpecificationIri] ?? {
      dataSpecificationIri,
      aggregates: [],
    };
    return Promise.resolve(metadata);
  }
}
