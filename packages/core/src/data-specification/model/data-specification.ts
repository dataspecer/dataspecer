import { DataSpecificationArtefact } from "./data-specification-artefact.ts";

export class DataSpecification {
  iri: string | null = null;

  pim: string | null = null;

  psms: string[] = [];

  static TYPE_DOCUMENTATION = "http://dataspecer.com/vocabularies/data-specification/documentation" as const;
  static TYPE_EXTERNAL = "http://dataspecer.com/vocabularies/data-specification/external" as const;

  /**
   * Specifications may be of different types to better support different use
   * cases. Currently, only the default and external type is supported.
   */
  type: string = DataSpecification.TYPE_DOCUMENTATION;

  /**
   * IRIs of other data specifications.
   */
  importsDataSpecifications: string[] = [];

  /**
   * All artefacts that should be generated.
   */
  artefacts: DataSpecificationArtefact[] = [];

  /** Allows other specifications to use relative HTTP(S) links to this specification. */
  preferRelativeLinking?: boolean;

  /**
   * Specifies properties for artifacts builders that can extend {@link artefacts} field by adding other artefacts on
   * the fly. This allows user to dynamically add schemas without the need to manually specify the artifacts.
   */
  artefactConfiguration: object = {};

  /**
   * Configuration for CIM adapters.
   */
  cimAdapters: any[] = [];
}
