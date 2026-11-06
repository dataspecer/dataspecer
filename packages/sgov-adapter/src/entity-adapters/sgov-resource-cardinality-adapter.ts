import { RdfSourceWrap } from "@dataspecer/core/core/adapter/rdf";
import { OWL } from "../sgov-vocabulary.ts";

export async function loadSgovCardinalities(entity: RdfSourceWrap): Promise<[number, number | null]> {
  const min = await entity.property(OWL.minQualifiedCardinality);
  const max = await entity.property(OWL.maxQualifiedCardinality);
  return [min.length > 0 ? Number(min[0].value) : 0, max.length > 0 ? Number(max[0].value) : null];
}
