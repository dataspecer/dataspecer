import { LanguageString } from "@dataspecer/lightweight-owl";
import {
  createShaclPropertyShape,
  ShaclModel,
  ShaclPropertyShape,
} from "./shacl-model.ts";

/**
 * Remove class constraints from the model.
 *
 * @see https://github.com/dataspecer/dataspecer/issues/1376
 */
export function applyNoClassConstraint(shacl: ShaclModel): ShaclModel {
  return {
    iri: shacl.iri,
    members: shacl.members.map(node => ({
      ...node,
      targetClass: null,
    })),
  };
}

/**
 * Keep only allowed languages.
 *
 * @see https://github.com/dataspecer/dataspecer/issues/1298
 */
export function filterLanguageStrings(
  shacl: ShaclModel,
  allowedLanguages: string[]
): ShaclModel {
  // Make the languages used for sh:name and sh:description.

  const updateString = (languageString: LanguageString | null) => {
    if (languageString === null) {
      return languageString;
    }
    const result: LanguageString = {};
    for (const language of allowedLanguages) {
      const value = languageString[language];
      if (value === undefined) {
        continue;
      }
      result[language] = value;
    }
    if (Object.keys(result).length === 0) {
      return null;
    }
    return result;
  };

  return {
    iri: shacl.iri,
    members: shacl.members.map(shape => ({
      ...shape,
      propertyShapes: shape.propertyShapes.map(propertyShape => ({
        ...propertyShape,
        name: updateString(propertyShape.name),
        description: updateString(propertyShape.description),
      }))
    })),
  };
}

/**
 * Split {@link ShaclPropertyShape} so that each assert only one thing.
 *
 * @see https://github.com/dataspecer/dataspecer/issues/1299
 */
export function splitConstraints(shacl: ShaclModel): ShaclModel {
  return {
    iri: shacl.iri,
    members: shacl.members.map(node => ({
      ...node,
      propertyShapes: node.propertyShapes
        .map(splitShaclPropertyShape)
        .flat(),
    })),
  };
}

function splitShaclPropertyShape(
  shape: ShaclPropertyShape,
): ShaclPropertyShape[] {
  const result: ShaclPropertyShape[] = [];
  // Create an evaluate nothing template.
  const template: ShaclPropertyShape = createShaclPropertyShape({
    iri: "",
    seeAlso: shape.seeAlso,
    description: shape.description,
    name: shape.name,
    path: shape.path,
  });

  if (shape.nodeKind !== null) {
    result.push({
      ...template,
      iri: shape.iri + "/nodeKind",
      nodeKind: shape.nodeKind,
    });
  }
  if (shape.minCount !== null) {
    result.push({
      ...template,
      iri: shape.iri + "/minCount",
      minCount: shape.minCount,
    });
  }
  if (shape.maxCount !== null) {
    result.push({
      ...template,
      iri: shape.iri + "/maxCount",
      maxCount: shape.maxCount,
    });
  }
  if (shape.datatype !== null) {
    result.push({
      ...template,
      iri: shape.iri + "/datatype",
      datatype: shape.datatype,
    });
  }
  if (shape.class !== null) {
    result.push({
      ...template,
      iri: shape.iri + "/class",
      class: shape.class,
    });
  }
  return result;
}
