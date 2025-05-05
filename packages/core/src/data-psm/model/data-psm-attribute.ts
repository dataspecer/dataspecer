import { DataPsmResource } from "./data-psm-resource.ts";
import * as PSM from "../data-psm-vocabulary.ts";

/**
 * An attribute is a primitive property. It may be a string, integer etc.
 */
export class DataPsmAttribute extends DataPsmResource {
  private static readonly TYPE = PSM.ATTRIBUTE;

  dataPsmDatatype: string | null = null;

  /**
   * Minimum and maximum cardinality.
   * If the maximum cardinality is null, then the cardinality is unbounded.
   * If the cardinality is null, then the cardinality is unknown or taken from semantic model.
   */
  dataPsmCardinality?: [number, number | null] | null;

  constructor(iri: string | null = null) {
    super(iri);
    this.types.push(DataPsmAttribute.TYPE);
  }

  static is(resource: any): resource is DataPsmAttribute {
    return resource?.types?.includes(DataPsmAttribute.TYPE);
  }
}
