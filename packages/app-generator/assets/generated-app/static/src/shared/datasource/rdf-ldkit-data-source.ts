import type { Lens, Schema } from 'ldkit';
import { createLens, type Options } from 'ldkit';

import type { AggregateDescriptor, EntityModel } from '../types/aggregate.ts';
import type {
  DataSource,
  DeleteArgs,
  IdentifiedMutationArgs,
  MutationArgs,
  ReadDetailArgs,
  ReadListArgs,
} from './data-source.ts';
import { DataSourceKind } from './data-source.ts';

export type LdkitSchemaMap = Record<string, Schema>;

export class RdfLdkitDataSource implements DataSource {
  readonly kind: DataSourceKind = DataSourceKind.Rdf;

  constructor(
    private readonly endpoint: string,
    private readonly schemas: LdkitSchemaMap
  ) {}

  async readList<TModel extends EntityModel>(args: ReadListArgs<TModel>): Promise<TModel[]> {
    const lens = this.buildLens(args.aggregate);
    const result = await lens.find({
      take: args.pageSize ?? 100,
      skip: ((args.page ?? 1) - 1) * (args.pageSize ?? 100),
    });

    return result.map((r) => ({ ...r, id: r.$id })) as unknown as TModel[];
  }

  async readDetail<TModel extends EntityModel>(
    args: ReadDetailArgs<TModel>
  ): Promise<TModel | null> {
    const lens = this.buildLens(args.aggregate);
    const result = await lens.findByIri(args.id);
    return result as unknown as TModel | null;
  }

  async create<TModel extends EntityModel>(_args: MutationArgs<TModel>): Promise<TModel> {
    return Promise.reject(
      new Error('Create is not implemented by the first prototype RDF datasource.')
    );
  }

  async update<TModel extends EntityModel>(_args: IdentifiedMutationArgs<TModel>): Promise<TModel> {
    return Promise.reject(
      new Error('Update is not implemented by the first prototype RDF datasource.')
    );
  }

  async delete<TModel extends EntityModel>(_args: DeleteArgs<TModel>): Promise<void> {
    return Promise.reject(
      new Error('Delete is not implemented by the first prototype RDF datasource.')
    );
  }

  private buildLens<TModel extends EntityModel>(
    aggregate: AggregateDescriptor<TModel>
  ): Lens<Schema> {
    const schema = this.schemas[aggregate.iri];
    if (!schema) {
      throw new Error(`Missing LDKit schema for aggregate "${aggregate.name}".`);
    }
    const options: Options = {
      sources: [this.endpoint],
    };
    return createLens(schema, options);
  }
}
