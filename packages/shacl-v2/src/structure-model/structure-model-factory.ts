import {
  Cardinality,
  ClassProfile,
  DSV_REUSE_DESCRIPTION,
  DSV_REUSE_LABEL,
  DSV_REUSE_USAGE_NOTE,
  ApplicationProfile,
  PropertyProfile,
  PropertyValueReuse,
  ObjectPropertyProfile,
  DatatypePropertyProfile,
} from "@dataspecer/data-specification-vocabulary";
import {
  OwlClass,
  OwlOntology,
  OwlProperty,
} from "@dataspecer/lightweight-owl";

import {
  LanguageString,
  StructureClass,
  StructureModel,
  StructureProperty,
  StructurePropertyType,
} from "./structure-model.ts";

interface Context {

  owlClasses: { [iri: string]: OwlClass };

  owlProperties: { [iri: string]: OwlProperty };

  dsvClasses: { [iri: string]: ClassProfile };

  dsvObjectProperties: { [iri: string]: ObjectPropertyProfile };

  dsvDatatypeProperties: { [iri: string]: DatatypePropertyProfile };

}

/**
 * Create and return a {@link StructureModel} as defined by the
 * {@link ApplicationProfile}.
 */
export function createStructureModelForProfile(
  owl: OwlOntology, dsv: ApplicationProfile,
): StructureModel {
  const context = createContext(owl, dsv);
  // We know the output is defined by the ApplicationProfile.
  // We just need to pull the details.
  const classes: StructureClass[] = [];
  const classesMap: { [iri: string]: StructureClass } = {};
  dsv.classProfiles.forEach(({ iri }) => {
    const profile = context.dsvClasses[iri];
    const structure = classProfileToStructureClass(context, profile);
    classes.push(structure);
    classesMap[structure.iri] = structure;
  });
  // Now we add properties.
  dsv.datatypePropertyProfiles.forEach(({ iri }) => {
    const profile = context.dsvDatatypeProperties[iri];
    const domain = classesMap[profile.domainIri];
    if (domain === undefined) {
      return;
    }
    const property = datatypePropertyToPropertyStructure(context, profile);
    domain.properties.push(property);
  });
  dsv.objectPropertyProfiles.forEach(({ iri }) => {
    const profile = context.dsvObjectProperties[iri];
    const domain = classesMap[profile.domainIri];
    if (domain === undefined) {
      return;
    }
    const property = objectPropertyToPropertyStructure(context, profile);
    domain.properties.push(property);
  });
  return { classes };
}

function createContext(owl: OwlOntology, dsv: ApplicationProfile): Context {

  const addOrMerge = function <Type>(
    map: Record<string, Type>,
    merge: (prev: Type, next: Type) => Type,
    value: Type, identifier: string
  ) {
    const prev = map[identifier];
    if (prev === undefined) {
      map[identifier] = value;
    } else {
      map[identifier] = merge(prev, value);
    }
  };

  const mergeOwlClass = (
    prev: OwlClass, next: OwlClass,
  ): OwlClass => {
    return {
      ...prev,
      subClassOf: [...prev.subClassOf, ...next.subClassOf],
    };
  };

  const mergeOwlProperty = (
    prev: OwlProperty, next: OwlProperty,
  ): OwlProperty => {
    return {
      ...prev,
      subPropertyOf: [...prev.subPropertyOf, ...next.subPropertyOf],
    }
  };

  const mergeClassProfile = (
    prev: ClassProfile, next: ClassProfile,
  ): ClassProfile => {
    return {
      ...prev,
      profileOfIri: [...prev.profileOfIri, ...next.profileOfIri],
      profiledClassIri: [...prev.profiledClassIri, ...next.profiledClassIri],
      specializationOfIri: [...prev.specializationOfIri, ...next.specializationOfIri],
    }
  };

  const mergeObjectPropertyProfile = (
    prev: ObjectPropertyProfile, next: ObjectPropertyProfile,
  ): ObjectPropertyProfile => {
    return {
      ...prev,
      profiledPropertyIri: [...prev.profiledPropertyIri, ...next.profiledPropertyIri],
      reusesPropertyValue: [...prev.reusesPropertyValue, ...next.reusesPropertyValue],
      specializationOfIri: [...prev.specializationOfIri, ...next.specializationOfIri],
      rangeClassIri: [...prev.rangeClassIri, ...next.rangeClassIri],
    }
  };

  const mergeDatatypePropertyProfile = (
    prev: DatatypePropertyProfile, next: DatatypePropertyProfile,
  ): DatatypePropertyProfile => {
    return {
      ...prev,
      profiledPropertyIri: [...prev.profiledPropertyIri, ...next.profiledPropertyIri],
      reusesPropertyValue: [...prev.reusesPropertyValue, ...next.reusesPropertyValue],
      specializationOfIri: [...prev.specializationOfIri, ...next.specializationOfIri],
      rangeDataTypeIri: [...prev.rangeDataTypeIri, ...next.rangeDataTypeIri],
    }
  };

  //

  const result: Context = {
    owlClasses: {},
    owlProperties: {},
    dsvClasses: {},
    dsvDatatypeProperties: {},
    dsvObjectProperties: {},
  };

  // Convert OWL.
  owl.classes.forEach(item =>
    addOrMerge(result.owlClasses, mergeOwlClass, item, item.iri));
  owl.properties.forEach(item =>
    addOrMerge(result.owlProperties, mergeOwlProperty, item, item.iri));
  // Convert Data specification vocabulary.
  dsv.classProfiles.forEach(item =>
    addOrMerge(result.dsvClasses, mergeClassProfile, item, item.iri));
  dsv.datatypePropertyProfiles.forEach(item =>
    addOrMerge(
      result.dsvDatatypeProperties,
      mergeDatatypePropertyProfile,
      item, item.iri));
  dsv.objectPropertyProfiles.forEach(item =>
    addOrMerge(
      result.dsvObjectProperties,
      mergeObjectPropertyProfile,
      item, item.iri));
  return result;
}

function classProfileToStructureClass(
  context: Context, profile: ClassProfile,
): StructureClass {
  const nameSource = findPropertySource(DSV_REUSE_LABEL, profile);
  const name = findSource(
    item => item.name, item => item.prefLabel,
    context.owlClasses, context.dsvClasses,
    nameSource, profile.prefLabel);

  const descriptionSource = findPropertySource(DSV_REUSE_DESCRIPTION, profile);
  const description = findSource(
    item => item.description, item => item.definition,
    context.owlClasses, context.dsvClasses,
    descriptionSource, profile.definition);

  const usageNoteSource = findPropertySource(DSV_REUSE_USAGE_NOTE, profile);
  const usageNote = findSource(
    item => null, item => item.usageNote, context.owlClasses, context.dsvClasses,
    usageNoteSource, profile.usageNote);

  const rdfTypes = collectProfiled(
    item => item.profileOfIri, item => item.profiledClassIri,
    context.dsvClasses, profile);

  return {
    iri: profile.iri,
    name,
    nameSource,
    description,
    descriptionSource,
    usageNote,
    usageNoteSource,
    rdfTypes,
    // Specializations are determined by only the profile.
    // The links should be between only the profile so this should be fine.
    specializationOf: profile.specializationOfIri,
    // We add properties later.
    properties: [],
  };
}

/**
 * @returns IRI, or null, of source for the given property.
 */
function findPropertySource(
  property: string,
  profile: { reusesPropertyValue: PropertyValueReuse[] },
): string | null {
  for (const item of profile.reusesPropertyValue) {
    if (item.reusedPropertyIri === property) {
      return item.propertyReusedFromResourceIri;
    }
  }
  return null;
}

/**
 * Collect and return IRI of vocabularies profiled by the hierarchy.
 */
function collectProfiled<ProfileType extends { iri: string }>(
  profileOfSelector: (item: ProfileType) => string[],
  profiledSelector: (item: ProfileType) => string[],
  dsvProfiles: { [iri: string]: ProfileType },
  profile: ProfileType,
): string[] {
  const result = new Set<string>();
  const visited = new Set<string>();
  const queue: (ProfileType | undefined)[] = [profile];
  while (queue.length > 0) {
    const next = queue.pop();
    if (next === undefined || visited.has(next.iri)) {
      continue;
    }
    visited.add(next.iri);
    // Process
    queue.push(...profileOfSelector(next).map(iri => dsvProfiles[iri]));
    profiledSelector(next).forEach(item => result.add(item));
  }
  return [...result];
}

function findSource<OwlType, DsvType>(
  owlSelector: (value: OwlType) => LanguageString | null,
  dsvSelector: (value: DsvType) => LanguageString | null,
  owl: { [iri: string]: OwlType },
  dsv: { [iri: string]: DsvType },
  source: string | null,
  defaultValue: LanguageString,
): LanguageString {
  if (source === null) {
    return defaultValue;
  }
  // We try to load value from OVL and then DSV, there
  // is no reason for this ordering.
  const owlValue = owl[source];
  if (owlValue !== undefined) {
    const result = owlSelector(owlValue);
    if (result !== null) {
      return result;
    }
  }
  const dsvValue = dsv[source];
  if (dsvValue !== undefined) {
    const result = dsvSelector(dsvValue);
    if (result !== null) {
      return result;
    }
  }
  return defaultValue
}

function datatypePropertyToPropertyStructure(
  context: Context, profile: DatatypePropertyProfile,
): StructureProperty {
  return {
    ...createPropertyStructure(
      context.owlProperties, context.dsvDatatypeProperties, profile),
    //
    type: StructurePropertyType.PrimitiveProperty,
    range: uniq(profile.rangeDataTypeIri),
    rangeCardinality: collectCardinality(
      item => item.profileOfIri, context.dsvDatatypeProperties, profile),
  };
}


function objectPropertyToPropertyStructure(
  context: Context, profile: ObjectPropertyProfile,
): StructureProperty {
  return {
    ...createPropertyStructure(
      context.owlProperties, context.dsvObjectProperties, profile),
    //
    type: StructurePropertyType.ComplexProperty,
    range: uniq(profile.rangeClassIri),
    rangeCardinality: collectCardinality(
      item => item.profileOfIri, context.dsvObjectProperties, profile),
  };
}

function uniq<Type>(items: Type[]): Type[] {
  return [...new Set(items)];
}

function createPropertyStructure<DsvType extends PropertyProfile>(
  owl: { [iri: string]: OwlProperty },
  dsv: { [iri: string]: DsvType },
  profile: PropertyProfile,
) {
  const nameSource = findPropertySource(DSV_REUSE_LABEL, profile);
  const name = findSource(
    item => item.name, item => item.prefLabel,
    owl, dsv, nameSource, profile.prefLabel);

  const descriptionSource = findPropertySource(DSV_REUSE_DESCRIPTION, profile);
  const description = findSource(
    item => item.description, item => item.definition,
    owl, dsv, descriptionSource, profile.definition);

  const usageNoteSource = findPropertySource(DSV_REUSE_USAGE_NOTE, profile);
  const usageNote = findSource(
    item => null, item => item.usageNote, owl, dsv,
    usageNoteSource, profile.usageNote);

  const rdfPredicates = collectProfiled(
    item => item.profileOfIri, item => item.profiledPropertyIri,
    dsv, profile);

  return {
    iri: profile.iri,
    name,
    nameSource,
    description,
    descriptionSource,
    usageNote,
    usageNoteSource,
    rdfPredicates,
    requirementLevel: profile.requirementLevel,
    // Specializations are determined by only the profile.
    // The links should be between only the profile so this should be fine.
    specializationOf: profile.specializationOfIri,
  };
}

function collectCardinality<
  ProfileType extends { iri: string, cardinality: Cardinality | null },
>(
  profileOfSelector: (item: ProfileType) => string[],
  dsvProfiles: { [iri: string]: ProfileType },
  profile: ProfileType,
): {
  min: number | null;
  max: number | null;
} {
  const visited = new Set<string>();
  const queue: (ProfileType | undefined)[] = [profile];
  //
  let min: number | null = null;
  let max: number | null = null;
  while (queue.length > 0) {
    const next = queue.pop();
    if (next === undefined || visited.has(next.iri)) {
      continue;
    }
    // Process
    queue.push(...profileOfSelector(next).map(iri => dsvProfiles[iri]));
    visited.add(next.iri);
    // Merge cardinalities.
    switch (next.cardinality) {
      case Cardinality.ManyToMany:
        // No restriction on 'min' or 'max'.
        break;
      case Cardinality.ManyToOne:
        // No restriction on 'min'.
        max = max === null ? 1 : Math.min(max, 1);
        break;
      case Cardinality.ManyToZero:
        // No restriction on 'min'.
        max = 0;
        break;
      case Cardinality.OneToMany:
        min = min === null ? 1 : Math.min(min, 1);
        // No restriction on 'max'.
        break;
      case Cardinality.OneToOne:
        min = min === null ? 1 : Math.min(min, 1);
        max = max === null ? 1 : Math.min(max, 1);
        break;
      case Cardinality.OneToZero:
        min = min === null ? 1 : Math.min(min, 1);
        max = 0;
        break;
      case Cardinality.ZeroToMany:
        min = 0;
        // No restriction on 'max'.
        break;
      case Cardinality.ZeroToOne:
        min = 0;
        max = max === null ? 1 : Math.min(max, 1);
        break;
      case Cardinality.ZeroToZero:
        min = 0;
        max = 0;
        break;
    }
  }
  return { min, max };
}
