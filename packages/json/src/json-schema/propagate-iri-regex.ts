import { ConceptualModel } from "@dataspecer/core/conceptual-model";
import { clone } from "@dataspecer/core/core";
import { StructureModel } from "@dataspecer/core/structure-model/model/structure-model";
import { StructureModelClass } from "@dataspecer/core/structure-model/model/structure-model-class";
import { JsonStructureModelClass } from "../json-structure-model/structure-model-class.ts";

/**
 * Add regex from {@link ConceptualModel} and examples for classes with iris.
 */
export function shortenByIriPrefixes(conceptual: ConceptualModel, structure: StructureModel): StructureModel {
  const result = clone(structure) as StructureModel;
  for (const root of result.roots) {
    for (const cls of root.classes) {
      visitClass(cls, [], result.jsonLdDefinedPrefixes, conceptual);
    }
  }
  return result;
}

function visitClass(
  cls: StructureModelClass,
  visitedClasses: StructureModelClass[],
  parentPrefixMap: {
    [prefix: string]: string;
  },
  conceptual: ConceptualModel
) {
  if (visitedClasses.includes(cls)) {
    return;
  }
  visitedClasses.push(cls);
  const prefixMap = Object.entries({
    ...parentPrefixMap,
    ...cls.jsonLdDefinedPrefixes,
  });
  prefixMap.sort((a, b) => b[1].length - a[1].length);
  const option = cls.jsonSchemaPrefixesInIriRegex.usePrefixes;

  const conceptualClass = conceptual.classes[cls.pimIri];
  if (conceptualClass === null || conceptualClass === undefined) {
    return;
  }

  // Process class IRI regexes

  if (conceptualClass.regex) {
    let wasSomethingReplaced = false;
    if (option === "NEVER") {
      cls.regex = conceptualClass.regex;
    } else if (option === "ALWAYS") {
      let regex = conceptualClass.regex;
      for (const [prefix, prefixIri] of prefixMap) {
        const iri = prefixIri.replaceAll(/\./g, "\\.");
        regex = regex.replaceAll(iri, prefix + ":");
        // This is a "hotfix" for users that forgot that you need to escape the dot in the regex
        regex = regex.replaceAll(prefixIri, prefix + ":");
      }
      wasSomethingReplaced ||= regex !== conceptualClass.regex;
      cls.regex = regex;
    } else if (option === "OPTIONAL") {
      let regex = conceptualClass.regex;
      for (const [prefix, prefixIri] of prefixMap) {
        const iri = prefixIri.replaceAll(/\./g, "\\.");
        regex = regex.replaceAll(iri, `(${prefix + ":"}|${iri})`);
        // This is a "hotfix" for users that forgot that you need to escape the dot in the regex
        regex = regex.replaceAll(prefixIri, `(${prefix + ":"}|${prefixIri})`);
      }
      wasSomethingReplaced ||= regex !== conceptualClass.regex;
      cls.regex = regex;
    } else {
      option satisfies never;
    }

    (cls as JsonStructureModelClass).iriUsesPrefixes = wasSomethingReplaced;
  }

  // Process class IRI examples

  if (cls.example?.length > 0) {
    for (let i = 0; i < cls.example.length; i++) {
      let example = cls.example[i];
      if (example && typeof example == "string") {
        let typedExample = example as string; // https://github.com/microsoft/TypeScript/issues/27706
        if (option !== "NEVER") {
          for (const [prefix, prefixIri] of prefixMap) {
            typedExample = typedExample.replaceAll(prefixIri, `${prefix + ":"}`);
          }
        }
        cls.example[i] = typedExample;
      }
    }
  }

  for (const property of cls.properties) {
    for (const dataType of property.dataTypes) {
      if (dataType.isAssociation()) {
        visitClass(dataType.dataType, visitedClasses, Object.fromEntries(prefixMap), conceptual);
      }
    }
  }
}
