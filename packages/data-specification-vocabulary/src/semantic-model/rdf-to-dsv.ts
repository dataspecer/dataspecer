import N3 from "n3";

import {
  LanguageString,
  ApplicationProfile,
  ClassProfile,
  ClassProfileType,
  PropertyProfile,
  ObjectPropertyProfile,
  ObjectPropertyProfileType,
  DatatypePropertyProfile,
  DatatypePropertyProfileType,
  Cardinality,
  TermProfile,
  ClassRole,
  RequirementLevel,
} from "./dsv-model.ts";

import {
  stringN3ToRdf,
} from "./n3-reader.ts";

import {
  RDF, DSV, SKOS, VANN, DCT, DSV_CLASS_ROLE, DSV_MANDATORY_LEVEL,
} from "./vocabulary.ts";

export async function rdfToDsv(
  rdfAsString: string,
): Promise<ApplicationProfile[]> {
  const quads = await stringN3ToRdf(rdfAsString);
  const context = new RdfLoaderContext(quads);
  //
  const loader = new ProfileLoader(context);
  return loader.loadApplicationProfiles();
}

/**
 * Contains RDF triples split by the subject,
 * as well as list of subjects with selected RDF class.
 *
 * The objective is to make reading RDF easier and faster.
 */
class RdfLoaderContext {

  readonly quadsBySubject: Map<string, N3.Quad[]> = new Map();

  readonly conceptualModels: N3.Quad_Subject[] = [];

  readonly classProfiles: N3.Quad_Subject[] = [];

  readonly objectPropertyProfiles: N3.Quad_Subject[] = [];

  readonly datatypePropertyProfiles: N3.Quad_Subject[] = [];

  constructor(quads: N3.Quad[]) {
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

class ProfileLoader {

  private context: RdfLoaderContext;

  /**
   * Temporary object to store mapping to ApplicationProfile when
   * loading TermProfiles.
   */
  private profileByIri : Record<string, ApplicationProfile> = {};

  constructor(context: RdfLoaderContext) {
    this.context = context;
  }

  loadApplicationProfiles(): ApplicationProfile[] {
    const result: ApplicationProfile[] = [];

    this.context.conceptualModels
      .map(subject => this.loadApplicationProfile(subject))
      .forEach(item => {
        result.push(item);
        this.profileByIri[item.iri] = item;
      })

    // Load profiles.
    this.context.classProfiles
      .forEach(subject => this.loadClassProfile(subject));
    this.context.objectPropertyProfiles
      .forEach(subject => this.loadObjectPropertyProfile(subject))
    this.context.datatypePropertyProfiles
      .forEach(subject => this.loadDatatypePropertyProfile(subject))

    this.profileByIri = {};
    return result;
  }

  private loadApplicationProfile(subject: N3.Quad_Subject): ApplicationProfile {
    const reader = new RdfPropertyReader(this.context, subject);
    return {
      iri: subject.value,
      externalDocumentationUrl: reader.iri(DSV.externalDocumentation),
      // We load profiles later as ownership is defined in the ProfileTerm.
      classProfiles: [],
      objectPropertyProfiles: [],
      datatypePropertyProfiles: [],
    };
  }

  private loadClassProfile(subject: N3.Quad_Subject): void {
    const reader = new RdfPropertyReader(this.context, subject);
    const profile: ClassProfile = {
      ...this.loadTermProfile(subject, reader),
      // ClassProfile
      type: [ClassProfileType],
      profiledClassIri: reader.iris(DSV.class),
      classRole: iriToClassRole(reader.iri(DSV.classRole)),
    };
    this.addToApplicationProfile(reader, item => item.classProfiles, profile);
  }

  private loadTermProfile(
    subject: N3.Quad_Subject, reader: RdfPropertyReader,
  ) : TermProfile{
    const profile: TermProfile = {
      type: [],
      iri: subject.value,
      prefLabel: reader.languageString(SKOS.prefLabel),
      definition: reader.languageString(SKOS.definition),
      usageNote: reader.languageString(SKOS.scopeNote)
        ?? reader.languageString(VANN.usageNote),
      profileOfIri: reader.iris(DSV.profileOf),
      reusesPropertyValue: [],
      specializationOfIri: reader.iris(DSV.specializationOf),
      externalDocumentationUrl: reader.iri(DSV.externalDocumentation),
    }
    // Load inherited values.
    for (const node of reader.irisAsSubjects(DSV.reusesPropertyValue)) {
      loadReusesPropertyValue(this.context, node, profile);
    }
    return profile;
  }

  private addToApplicationProfile<Type extends TermProfile>(
    reader: RdfPropertyReader,
    selector: (profile: ApplicationProfile) => Type[],
    profile: Type,
  ): void {
    const ownerIri = reader.iri(DCT.isPartOf);
    if (ownerIri === null) {
      console.error(`Missing dct:isPartOf for '${profile.iri}'.`);
    } else {
      const owner = this.profileByIri[ownerIri];
      if (owner === undefined) {
        console.error(`Missing ApplicationProfile for '${profile.iri}'.`);
      } else {
        selector(owner).push(profile);
      }
    }
  }

  private loadObjectPropertyProfile(subject: N3.Quad_Subject): void {
    const reader = new RdfPropertyReader(this.context, subject);
    const domain = reader.iri(DSV.domain);
    if (domain === null) {
      return;
    }
    const profile: ObjectPropertyProfile = {
      ...this.loadPropertyProfile(subject, reader, domain),
      // ObjectPropertyProfile
      type: [ObjectPropertyProfileType],
      rangeClassIri: reader.iris(DSV.objectPropertyRange),
    };
    this.addToApplicationProfile(
      reader, item => item.objectPropertyProfiles, profile);
  }

  private loadPropertyProfile(
    subject: N3.Quad_Subject, reader: RdfPropertyReader,
    domain: string,
  ): PropertyProfile {
    const profile: PropertyProfile = {
      ...this.loadTermProfile(subject, reader),
      // PropertyProfile
      cardinality: loadCardinality(reader),
      domainIri: domain,
      profiledPropertyIri: reader.iris(DSV.property),
      requirementLevel: iriToRequirementLevel(reader.iri(DSV.requirementLevel)),
    };
    return profile;
  }

  private loadDatatypePropertyProfile(subject: N3.Quad_Subject): void {
    const reader = new RdfPropertyReader(this.context, subject);
    const domain = reader.iri(DSV.domain);
    if (domain === null) {
      return;
    }
    const profile: DatatypePropertyProfile = {
      ...this.loadPropertyProfile(subject, reader, domain),
      // ObjectPropertyProfile
      type: [DatatypePropertyProfileType],
      rangeDataTypeIri: reader.iris(DSV.datatypePropertyRange),
    };
    this.addToApplicationProfile(
      reader, item => item.datatypePropertyProfiles, profile);
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

function loadReusesPropertyValue(
  context: RdfLoaderContext,
  subject: N3.Quad_Subject,
  profile: TermProfile,
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
 * @returns First valid cardinality.
 */
function loadCardinality(reader: RdfPropertyReader): Cardinality | null {
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

