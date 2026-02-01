import {LanguageString} from "../../core/index.ts";
import {StructureModelSchemaRoot} from "./structure-model-schema-root.ts";
import {StructureModelClass} from "./structure-model-class.ts";

/**
 * Schema is the root object that is used to identify a collection of classes.
 * We can see schema as a diagram that contains the class definitions.
 */
export class StructureModel {
  /**
   * PSM level entity IRI. The schema exists only on PSM level thus
   * there are no IRS of PIM or CIM.
   */
  psmIri: string | null = null;

  /**
   * Label visible to a human reader.
   */
  humanLabel: LanguageString | null = null;

  /**
   * Description visible to a human reader.
   */
  humanDescription: LanguageString | null = null;

  technicalLabel: string | null = null;

  /**
   * Structure model may contain multiple data-psm trees, each represented by a
   * root. It is up to a generator to decide how to interpret the list.
   */
  roots: StructureModelSchemaRoot[] = [];

  /**
   * Specification this class was loaded from.
   */
  specification: string | null = null;

  /**
   * List of defined IRI prefixes for JSON-LD context.
   */
  jsonLdDefinedPrefixes: { [prefix: string]: string } = {};

  /**
   * Type iri to label used for @types.
   */
  jsonLdTypeMapping: { [iri: string]: string } = {};

  /**
   * Returns a list of classes in the model.
   */
  getClasses(): StructureModelClass[] {
    const list = new Set<StructureModelClass>();
    const toProcess: StructureModelClass[] = [];

    function add(cls: StructureModelClass) {
      if (!list.has(cls)) {
        toProcess.push(cls);
        list.add(cls);
      }
    }

    for (const root of this.roots) {
      for (const cls of root.classes) {
        add(cls);
      }
    }

    while (toProcess.length > 0) {
      const cls = toProcess.pop();
      for (const property of cls.properties) {
        for (const dataType of property.dataTypes) {
          if (dataType.isAssociation()) {
            add(dataType.dataType);
          }
        }
      }
      for (const ext of cls.extends) {
        add(ext);
      }
    }

    return [...list];
  }

  /**
   * List of identifiers of structure models this structure model profiles.
   */
  profiling: string[] = [];
}
