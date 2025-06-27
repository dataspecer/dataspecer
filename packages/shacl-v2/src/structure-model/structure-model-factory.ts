import {
  Cardinality,
  ClassProfile,
  DSV_REUSE_LABEL,
  DSV_REUSE_USAGE_NOTE,
  DsvModel,
  isDatatypePropertyProfile,
  isObjectPropertyProfile,
  PropertyProfile,
  PropertyValueReuse,
} from "@dataspecer/core-v2/semantic-model/data-specification-vocabulary";
import {
  OwlClass,
  OwlOntology,
  OwlProperty,
} from "../lightweight-owl/index.ts";
import {
  StructureClass,
  StructureModel,
  StructureProperty,
  StructurePropertyType,
} from "./structure-model.ts";
import { isComplexType, isPrimitiveType } from "@dataspecer/core-v2/semantic-model/datatypes";

/**
 * Use {@link Type}.iri as an identifier.
 */
interface Resolvable<Type extends { iri: string }> {

  /**
   * Dependencies that must be resolved before this instance can be resolved.
   */
  dependencies: string[];

  /**
   * If true the value has been fully resolved.
   */
  isResolved: boolean;

  value: Type;

}

type ResolvableClass = Resolvable<StructureClass>;

type ResolvableProperty = Resolvable<StructureProperty> & {

  /**
   * We keep domain here, before we can add {@link StructureProperty}
   * to {@link StructureClass}.
   */
  domain: string;

};

export function createStructureModel(
  owl: OwlOntology,
  dsv: DsvModel,
  classFilter: (identifier: string) => boolean,
): StructureModel {
  // We add information from OWL and DSV.
  const classesMap: { [iri: string]: ResolvableClass } = {};
  const propertyMap: { [iri: string]: ResolvableProperty } = {};
  addClassesFromOwl(owl, classesMap);
  addPropertiesFromOwl(owl, propertyMap);
  addFromDsv(classesMap, propertyMap, dsv);

  // console.log("createStructureModel",
  //   "\nClass\n", JSON.stringify(classesMap, null, 2),
  //   "\nProperty\n", JSON.stringify(propertyMap, null, 2));

  // Now we try to resolve all we can.
  while (true) {
    const hasClassesChanged = executeResolveIteration(
      classesMap, propertyMap, classesMap, resolveResolvableClass);
    const hasPropertiesChanged = executeResolveIteration(
      classesMap, propertyMap, propertyMap, resolveResolvableProperty);
    // Terminate when there is no change.
    if (!hasClassesChanged && !hasPropertiesChanged) {
      break;
    }
  }

  // Select the result.
  const classes = Object.values(classesMap)
    .filter(item => classFilter(item.value.iri))
    .map(item => item.value);

  // Add properties to classes based on their domain.
  classes.forEach(classItem => {
    classItem.properties = Object.values(propertyMap)
      .filter(item => item.domain == classItem.iri)
      .map(item => item.value);
  });

  // console.log("Structure\n", JSON.stringify(classes, null, 2));

  return {
    classes,
  };
}

function addClassesFromOwl(
  owl: OwlOntology,
  classesMap: { [iri: string]: ResolvableClass },
): void {

  owl.classes.forEach(item => {
    const next = owlClassToResolvableClass(item);
    const prev = classesMap[next.value.iri];
    classesMap[next.value.iri] = prev === undefined ?
      next : mergeResolvableClassToExisting(prev, next);
  });

}

function owlClassToResolvableClass(
  value: OwlClass,
): ResolvableClass {
  return {
    dependencies: [],
    isResolved: true,
    value: {
      iri: value.iri,
      name: value.name,
      nameSource: null,
      usageNote: null,
      usageNoteSource: null,
      specializationOf: [],
      // StructureClass
      types: [value.iri],
      properties: [],
    },
  };
}

function mergeResolvableClassToExisting(
  prev: ResolvableClass, next: ResolvableClass,
): ResolvableClass {
  const prevValue = prev.value;
  const nextValue = next.value;
  return {
    dependencies: [...prev.dependencies, ...next.dependencies],
    isResolved: prev.isResolved && next.isResolved,
    value: {
      iri: prevValue.iri,
      name: prevValue.name ?? nextValue.name,
      nameSource: prevValue.nameSource ?? nextValue.nameSource,
      usageNote: prevValue.usageNote ?? nextValue.usageNote,
      usageNoteSource: prevValue.usageNoteSource ?? nextValue.usageNoteSource,
      specializationOf: [
        ...prevValue.specializationOf, ...nextValue.specializationOf],
      // StructureClass
      types: mergeArrayAsUniq(prevValue.types, nextValue.types),
      properties: [...prevValue.properties, ...nextValue.properties],
    },
  };
}

function mergeArrayAsUniq<T>(left: T[], right: T[]): T[] {
  return Array.from(new Set([...left, ...right]));
}

function addPropertiesFromOwl(
  owl: OwlOntology,
  propertyMap: { [iri: string]: ResolvableProperty },
): void {

  owl.properties.forEach(item => {
    const next = owlPropertyToResolvableProperty(item);
    const prev = propertyMap[next.value.iri];
    propertyMap[next.value.iri] = prev === undefined ?
      next :
      mergeResolvablePropertyToExisting(prev, next);
  });
}

function owlPropertyToResolvableProperty(
  value: OwlProperty,
): ResolvableProperty {
  let type: StructurePropertyType = StructurePropertyType.Undecidable;
  const isPrimitive = isPrimitiveType(value.range);
  const isComplex = isComplexType(value.range);
  if (isPrimitive && !isComplex) {
    type = StructurePropertyType.PrimitiveProperty;
  } else if (!isPrimitive && isComplex) {
    type = StructurePropertyType.ComplexProperty;
  }
  return {
    dependencies: [],
    domain: value.domain,
    isResolved: true,
    value: {
      iri: value.iri,
      name: value.name,
      nameSource: null,
      usageNote: null,
      usageNoteSource: null,
      specializationOf: value.subPropertyOf,
      // StructureProperty
      type,
      predicates: [value.iri],
      range: [value.range],
      rangeCardinality: {
        min: null,
        max: null,
      },
    },
  };
}

function mergeResolvablePropertyToExisting(
  prev: ResolvableProperty, next: ResolvableProperty,
): ResolvableProperty {
  const prevValue = prev.value;
  const nextValue = next.value;
  return {
    dependencies: [...prev.dependencies, ...next.dependencies],
    isResolved: prev.isResolved && next.isResolved,
    domain: prev.domain ?? next.domain,
    value: {
      iri: prevValue.iri,
      name: prevValue.name ?? nextValue.name,
      nameSource: prevValue.nameSource ?? nextValue.nameSource,
      usageNote: prevValue.usageNote ?? nextValue.usageNote,
      usageNoteSource: prevValue.usageNoteSource ?? nextValue.usageNoteSource,
      specializationOf: [
        ...prevValue.specializationOf, ...nextValue.specializationOf],
      // StructureProperty
      type: prevValue.type === nextValue.type
        ? prevValue.type : StructurePropertyType.Undecidable,
      predicates: [...prevValue.predicates, ...nextValue.predicates],
      range: prevValue.range ?? nextValue.range,
      rangeCardinality: mergeCardinalities(
        prevValue.rangeCardinality, nextValue.rangeCardinality),
    },
  };
}

function mergeCardinalities(
  left: { min: number | null, max: number | null },
  right: { min: number | null, max: number | null },
): { min: number | null, max: number | null } {
  let min: number | null = null;
  let max: number | null = null;

  if (left.min !== null && right.min !== null) {
    min = Math.max(left.min, right.min);
  } else if (left.min !== null) {
    min = left.min;
  } else if (right.min !== null) {
    min = right.min;
  }

  if (left.max !== null && right.max !== null) {
    max = Math.min(left.max, right.max);
  } else if (left.max !== null) {
    max = left.max;
  } else if (right.max !== null) {
    max = right.max;
  }

  return { min, max };
}

function addFromDsv(
  classesMap: { [iri: string]: ResolvableClass },
  propertyMap: { [iri: string]: ResolvableProperty },
  dsv: DsvModel,
): void {
  dsv.profiles.forEach(item => {
    const next = dsvClassProfileToResolvableClass(item);
    const prev = classesMap[next.value.iri];
    classesMap[next.value.iri] = prev === undefined ?
      next : mergeResolvableClassToExisting(prev, next);
    // In DSV the properties are stored under profiles.
    item.properties.forEach(property => {
      const nextProperty = dsvPropertyProfileToResolvableProperty(
        item, property);

      const prevProperty = propertyMap[nextProperty.value.iri];
      propertyMap[nextProperty.value.iri] = prevProperty === undefined ?
        nextProperty :
        mergeResolvablePropertyToExisting(prevProperty, nextProperty);
    });
  });
}

function dsvClassProfileToResolvableClass(
  value: ClassProfile,
): ResolvableClass {
  return {
    dependencies: [...value.profileOfIri, ...value.profiledClassIri],
    isResolved: false,
    value: {
      iri: value.iri,
      name: value.prefLabel,
      nameSource: findSource(DSV_REUSE_LABEL, value),
      usageNote: value.usageNote,
      usageNoteSource: findSource(DSV_REUSE_USAGE_NOTE, value),
      specializationOf: value.specializationOfIri,
      // StructureClass
      types: [],
      properties: [],
    },
  }
}

function findSource(
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

function dsvPropertyProfileToResolvableProperty(
  owner: ClassProfile,
  value: PropertyProfile,
): ResolvableProperty {
  let type: StructurePropertyType = StructurePropertyType.Undecidable;
  let range: string[] = [];
  if (isObjectPropertyProfile(value)) {
    type = StructurePropertyType.ComplexProperty;
    range = value.rangeClassIri;
  } else if (isDatatypePropertyProfile(value)) {
    type = StructurePropertyType.PrimitiveProperty;
    range = value.rangeDataTypeIri;
  }
  return {
    dependencies: [
      ...value.profileOfIri,
      ...value.profiledPropertyIri,
      owner.iri,
      ...range,
    ],
    domain: owner.iri,
    isResolved: false,
    value: {
      iri: value.iri,
      name: value.prefLabel,
      nameSource: findSource(DSV_REUSE_LABEL, value),
      usageNote: value.usageNote,
      usageNoteSource: findSource(DSV_REUSE_USAGE_NOTE, value),
      specializationOf: value.specializationOfIri,
      // StructureProperty
      type,
      predicates: [],
      range,
      rangeCardinality: dsvCardinality(value.cardinality),
    },
  }
}

function dsvCardinality(value: Cardinality | null): {
  min: number | null;
  max: number | null;
} {
  if (value === null) {
    return { min: null, max: null };
  }
  switch (value) {
    case Cardinality.ZeroToZero:
      return { min: 0, max: 0 };
    case Cardinality.ZeroToOne:
      return { min: 0, max: 1 };
    case Cardinality.ZeroToMany:
      return { min: 0, max: null };
    case Cardinality.OneToZero:
      return { min: 1, max: 0 };
    case Cardinality.OneToOne:
      return { min: 1, max: 1 };
    case Cardinality.OneToMany:
      return { min: 1, max: null };
    case Cardinality.ManyToZero:
      return { min: null, max: 0 };
    case Cardinality.ManyToOne:
      return { min: null, max: 1 };
    case Cardinality.ManyToMany:
      return { min: null, max: null };
  }
}

/**
 * Run resolution iteration to resolve items with resolved dependencies.
 */
function executeResolveIteration<Type extends {
  isResolved: boolean,
  dependencies: string[],
}>(
  classDependencies: { [iri: string]: ResolvableClass },
  propertyDependencies: { [iri: string]: ResolvableProperty },
  mapToResolve: { [iri: string]: Type },
  resolve: (
    classDependencies: ResolvableClass[],
    propertyDependencies: ResolvableProperty[],
    toResolve: Type,
  ) => void,
): boolean {
  let hasChanged = false;
  for (const item of Object.values(mapToResolve)) {
    if (item.isResolved) {
      continue;
    }
    const itemClassDependencies = item.dependencies
      .map(identifier => classDependencies[identifier])
      .filter(item => item !== undefined);
    if (itemClassDependencies.some(item => !item.isResolved)) {
      continue;
    }

    const itemPropertyDependencies = item.dependencies
      .map(identifier => propertyDependencies[identifier])
      .filter(item => item !== undefined);
    if (itemPropertyDependencies.some(item => !item.isResolved)) {
      continue;
    }

    resolve(itemClassDependencies, itemPropertyDependencies, item);
    hasChanged = true;
  }
  return hasChanged;
}

function resolveResolvableClass(
  classDependencies: ResolvableClass[],
  _propertyDependencies: ResolvableProperty[],
  toResolve: ResolvableClass,
): void {
  toResolve.isResolved = true;
  const value = toResolve.value;
  //
  for (const { value: next } of classDependencies) {
    if (value.nameSource === next.iri) {
      value.name = next.name;
    }
    if (value.usageNoteSource === next.iri) {
      value.usageNote = next.usageNote;
    }
    //
    value.types = mergeArrayAsUniq(value.types, next.types);
  }
}

function resolveResolvableProperty(
  classDependencies: ResolvableClass[],
  propertyDependencies: ResolvableProperty[],
  toResolve: ResolvableProperty,
): void {
  toResolve.isResolved = true;
  const value = toResolve.value;
  // We do not update domain, we keep it original.
  // Update range to types of resolved classes.
  const initialRange = value.range;
  value.range = Array.from(new Set(value.range));
  value.range = classDependencies
    .filter(item => value.range.includes(item.value.iri))
    .map(item => item.value.types)
    .flat();
  if (value.range.length !== initialRange.length) {
    console.warn(
      "Range mismatch!", initialRange, "->", value.range,
      "\n", toResolve)
  }
  for (const { value: next } of propertyDependencies) {
    if (value.nameSource === next.iri) {
      value.name = next.name;
    }
    if (value.usageNoteSource === next.iri) {
      value.usageNote = next.usageNote;
    }
    //
    value.predicates = mergeArrayAsUniq(value.predicates, next.predicates);
    value.rangeCardinality = mergeCardinalities(
      value.rangeCardinality, next.rangeCardinality);
  }
}
