import * as N3 from "n3";

import {
  LanguageString,
  DsvModel,
  ClassProfile,
  ClassProfileType,
  PropertyProfile,
  ObjectPropertyProfile,
  ObjectPropertyProfileType,
  DatatypePropertyProfile,
  DatatypePropertyProfileType,
  Cardinality,
  Profile,
  ClassRole,
  RequirementLevel,
} from "./dsv-model.ts";

import {
  stringN3ToRdf,
} from "./n3-reader.ts";

import { RDF, DSV, SKOS, VANN, DCT, DSV_CLASS_ROLE, DSV_MANDATORY_LEVEL } from "./vocabulary.ts";

export async function rdfToConceptualModel(
  rdfAsString: string,
): Promise<DsvModel[]> {
  const context = new RdfLoaderContext();
  const quads = await stringN3ToRdf(rdfAsString);
  context.loadQuads(quads);
  const conceptualModels = (new ConceptualModelReader(context)).load();
  const classProfiles = (new ClassProfilesReader(context, conceptualModels)).load();
  (new PropertyProfilesReader(context, classProfiles)).loadPropertyProfiles();
  return Object.values(conceptualModels);
}

/**
 * Contains RDF triples split by the subject,
 * as well as list of subjects with selected RDF class.
 *
 * The objective is to make reading RDF easier and faster.
 */
class RdfLoaderContext {

  quadsBySubject: Map<string, N3.Quad[]> = new Map();

  conceptualModels: N3.Quad_Subject[] = [];

  classProfiles: N3.Quad_Subject[] = [];

  objectPropertyProfiles: N3.Quad_Subject[] = [];

  datatypePropertyProfiles: N3.Quad_Subject[] = [];

  loadQuads(quads: N3.Quad[]): void {
    for (const quad of quads) {
      this.addToQuadsBySubject(quad);
      if (RDF.type.equals(quad.predicate)) {
        this.addByType(quad.subject, quad.object);
      }
    }
  }

  private addToQuadsBySubject(quad: N3.Quad): void {
    const subject = quad.subject;
    let quadsForSubject = this.quadsBySubject.get(subject.value);
    if (quadsForSubject === undefined) {
      quadsForSubject = [];
      this.quadsBySubject.set(subject.value, quadsForSubject);
    }
    quadsForSubject.push(quad)
  }

  private addByType(subject: N3.Quad_Subject, type: N3.Quad_Object): void {
    if (DSV.ApplicationProfileV1.equals(type)
      || DSV.ApplicationProfile.equals(type)) {
      this.conceptualModels.push(subject);
    } else if (DSV.ClassProfile.equals(type)) {
      this.classProfiles.push(subject);
    } else if (DSV.ObjectPropertyProfile.equals(type)) {
      this.objectPropertyProfiles.push(subject);
    } else if (DSV.DatatypePropertyProfile.equals(type)) {
      this.datatypePropertyProfiles.push(subject);
    }
  }

}

type ConceptualModelMap = { [iri: string]: DsvModel };

class ConceptualModelReader {

  private context: RdfLoaderContext;

  constructor(context: RdfLoaderContext) {
    this.context = context;
  }

  load(): ConceptualModelMap {
    const conceptualModelMap: ConceptualModelMap = {};
    this.context.conceptualModels.forEach(subject => {
      conceptualModelMap[subject.value] = {
        iri: subject.value,
        profiles: [],
      };
    });
    return conceptualModelMap;
  }

}

type ClassProfileMap = { [iri: string]: ClassProfile };

class ClassProfilesReader {

  private context: RdfLoaderContext;

  private conceptualModelMap: ConceptualModelMap;

  constructor(context: RdfLoaderContext, conceptualModelMap: ConceptualModelMap) {
    this.context = context;
    this.conceptualModelMap = conceptualModelMap;
  }

  load(): ClassProfileMap {
    const result: ClassProfileMap = {};
    this.context.classProfiles.map(subject => this.loadClass(subject))
      .forEach(classProfile => result[classProfile.iri] = classProfile);
    return result;
  }

  private loadClass(subject: N3.Quad_Subject): ClassProfile {
    const reader = new RdfPropertyReader(this.context, subject);
    const classProfile: ClassProfile = {
      // Profile
      iri: subject.value,
      prefLabel: reader.languageString(SKOS.prefLabel),
      definition: reader.languageString(SKOS.definition),
      usageNote: reader.languageString(SKOS.scopeNote)
        ?? reader.languageString(VANN.usageNote),
      profileOfIri: reader.iris(DSV.profileOf),
      reusesPropertyValue: [],
      specializationOfIri: reader.iris(DSV.specializationOf),
      externalDocumentationUrl: reader.iri(DSV.externalDocumentation),
      // ClassProfile
      $type: [ClassProfileType],
      profiledClassIri: reader.iris(DSV.class),
      properties: [],
      classRole: iriToClassRole(reader.iri(DSV.classRole)),
    };
    // Load inherited values.
    for (const node of reader.irisAsSubjects(DSV.reusesPropertyValue)) {
      loadReusesPropertyValue(this.context, node, classProfile);
    }
    // Load and add to the model.
    const modelIri = reader.iri(DCT.isPartOf);
    if (modelIri === null) {
      console.error(`Missing dct:isPartOf for '${subject.value}'.`);
    } else {
      const conceptualModel = this.conceptualModelMap[modelIri];
      if (conceptualModel === undefined) {
        console.error(`Missing ConceptualModel for '${subject.value}'.`);
      } else {
        conceptualModel.profiles.push(classProfile);
      }
    }
    return classProfile;
  }

}

function iriToClassRole(iri: string | null): ClassRole {
  if (iri === null) {
    return ClassRole.undefined;
  }
  switch (iri) {
    case DSV_CLASS_ROLE.main:
      return ClassRole.main;
    case DSV_CLASS_ROLE.supportive:
      return ClassRole.supportive;
    default:
      return ClassRole.undefined;
  }
}

/**
 * Given RdfLoaderContext and subject, provides easy way to read
 * triples by predicates.
 */
class RdfPropertyReader {

  private context: RdfLoaderContext;

  private subject: N3.Quad_Subject;

  constructor(context: RdfLoaderContext, subject: N3.Quad_Subject) {
    this.context = context;
    this.subject = subject;
  }

  public iri(predicate: N3.NamedNode): string | null {
    for (const { object } of this.quads(predicate)) {
      if (object.termType === "NamedNode") {
        return object.value;
      }
    }
    return null;
  }

  public quads(predicate: N3.NamedNode): N3.Quad[] {
    const quads = this.context.quadsBySubject.get(this.subject.value);
    return quads?.filter(quad => quad.predicate.equals(predicate)) ?? [];
  }

  public iris(predicate: N3.NamedNode): string[] {
    const result: string[] = [];
    for (const { object } of this.quads(predicate)) {
      if (object.termType === "NamedNode") {
        result.push(object.value);
      }
    }
    return result;
  }

  public irisAsSubjects(predicate: N3.NamedNode): N3.Quad_Subject[] {
    const result: N3.Quad_Subject[] = [];
    for (const { object } of this.quads(predicate)) {
      if (object.termType === "NamedNode" || object.termType === "BlankNode") {
        result.push(object);
      }
    }
    return result;
  }

  public languageString(predicate: N3.NamedNode): LanguageString {
    const result: LanguageString = {};
    for (const { object } of this.quads(predicate)) {
      if (object.termType === "Literal") {
        const literal = object as N3.Literal;
        result[literal.language ?? ""] = object.value;
      }
    }
    return result;
  }

}

function loadReusesPropertyValue(
  context: RdfLoaderContext,
  subject: N3.Quad_Subject,
  profile: Profile,
) {
  const reader = new RdfPropertyReader(context, subject);
  let reusedProperty = reader.iri(DSV.reusedProperty);
  // Migration section.
  if (reusedProperty === VANN.usageNote.id) {
    reusedProperty = SKOS.scopeNote.id;
  }
  const reusedFrom = reader.iri(DSV.reusedFromResource);
  if (reusedProperty === null || reusedFrom === null) {
    console.warn("Invalid dsv:PropertyValueReuse", {
      reusedProperty: reusedProperty,
      reusedFromResource: reusedFrom,
    });
    return;
  }
  profile.reusesPropertyValue.push({
    reusedPropertyIri: reusedProperty,
    propertyReusedFromResourceIri: reusedFrom,
  });
}

/**
 * Load properties into given classes.
 */
class PropertyProfilesReader {

  private context: RdfLoaderContext;

  private classProfileMap: ClassProfileMap;

  constructor(context: RdfLoaderContext, classProfileMap: ClassProfileMap) {
    this.context = context;
    this.classProfileMap = classProfileMap;
  }

  loadPropertyProfiles(): void {
    this.context.objectPropertyProfiles
      .forEach(subject => this.loadObjectPropertyProfile(subject))
    this.context.datatypePropertyProfiles
      .forEach(subject => this.loadDatatypePropertyProfile(subject))
  }

  private loadObjectPropertyProfile(subject: N3.Quad_Subject): void {
    const reader = new RdfPropertyReader(this.context, subject);
    const propertyProfile: ObjectPropertyProfile = {
      ...this.loadPropertyProfile(subject, reader),
      // ObjectPropertyProfile
      $type: [ObjectPropertyProfileType],
      rangeClassIri: reader.iris(DSV.objectPropertyRange),
    };
    this.addToClass(reader, propertyProfile);
  }

  private loadPropertyProfile(
    subject: N3.Quad_Subject, reader: RdfPropertyReader,
  ): PropertyProfile {
    const propertyProfile: PropertyProfile = {
      // Profile
      iri: subject.value,
      prefLabel: reader.languageString(SKOS.prefLabel),
      definition: reader.languageString(SKOS.definition),
      usageNote: reader.languageString(SKOS.scopeNote)
        ?? reader.languageString(VANN.usageNote),
      profileOfIri: reader.iris(DSV.profileOf),
      reusesPropertyValue: [],
      specializationOfIri: reader.iris(DSV.specializationOf),
      externalDocumentationUrl: reader.iri(DSV.externalDocumentation),
      // PropertyProfile
      cardinality: this.loadCardinality(reader),
      profiledPropertyIri: reader.iris(DSV.property),
      requirementLevel: iriToRequirementLevel(reader.iri(DSV.requirementLevel)),
    };
    // Load inherited values.
    for (const node of reader.irisAsSubjects(DSV.reusesPropertyValue)) {
      loadReusesPropertyValue(this.context, node, propertyProfile);
    }
    return propertyProfile;
  }

  /**
   * Return first valid cardinality.
   */
  private loadCardinality(reader: RdfPropertyReader): Cardinality | null {
    for (const { object } of reader.quads(DSV.cardinality)) {
      if (DSV.ManyToMany.equals(object)) {
        return Cardinality.ManyToMany;
      } else if (DSV.ManyToOne.equals(object)) {
        return Cardinality.ManyToOne;
      } else if (DSV.ManyToZero.equals(object)) {
        return Cardinality.ManyToZero;
      } else if (DSV.OneToManyV1.equals(object) || DSV.OneToMany.equals(object)) {
        return Cardinality.OneToMany;
      } else if (DSV.OneToOneV1.equals(object) || DSV.OneToOne.equals(object)) {
        return Cardinality.OneToOne;
      } else if (DSV.OneToZero.equals(object)) {
        return Cardinality.OneToZero;
      } else if (DSV.ZeroToManyV1.equals(object) || DSV.ZeroToMany.equals(object)) {
        return Cardinality.ZeroToMany;
      } else if (DSV.ZeroToOneV1.equals(object) || DSV.ZeroToOne.equals(object)) {
        return Cardinality.ZeroToOne;
      } else if (DSV.ZeroToZero.equals(object)) {
        return Cardinality.ZeroToZero;
      }
    }
    return null;
  }

  /**
   * Add profile to given class based on the dsv:domain.
   */
  private addToClass(reader: RdfPropertyReader, profile: PropertyProfile) {
    const domainIri = reader.iri(DSV.domain);
    if (domainIri === null) {
      console.error(`Missing dsv:domain for '${profile.iri}'`);
      return;
    }
    const domain = this.classProfileMap[domainIri];
    if (domain === undefined) {
      console.error(`Missing domain for '${profile.iri}'`);
      return;
    }
    domain.properties.push(profile);
  }

  private loadDatatypePropertyProfile(subject: N3.Quad_Subject): void {
    const reader = new RdfPropertyReader(this.context, subject);
    const propertyProfile: DatatypePropertyProfile = {
      ...this.loadPropertyProfile(subject, reader),
      // ObjectPropertyProfile
      $type: [DatatypePropertyProfileType],
      rangeDataTypeIri: reader.iris(DSV.datatypePropertyRange),
    };
    this.addToClass(reader, propertyProfile);
  }

}

function iriToRequirementLevel(iri: string | null): RequirementLevel {
  if (iri === null) {
    return RequirementLevel.undefined;
  }
  switch (iri) {
    case DSV_MANDATORY_LEVEL.mandatory:
      return RequirementLevel.mandatory;
    case DSV_MANDATORY_LEVEL.optional:
      return RequirementLevel.optional;
    case DSV_MANDATORY_LEVEL.recommended:
      return RequirementLevel.recommended;
    default:
      return RequirementLevel.undefined;
  }
}

