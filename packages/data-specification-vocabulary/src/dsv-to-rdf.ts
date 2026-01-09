import * as N3 from "n3";
import { DataFactory } from "n3";

import {
  LanguageString,
  ApplicationProfile,
  TermProfile,
  ClassProfile,
  PropertyProfile,
  ObjectPropertyProfile,
  DatatypePropertyProfile,
  Cardinality,
  ClassRole,
  RequirementLevel,
} from "./dsv-model.ts";

import {
  RDF, DSV, DCT, SKOS, DSV_CLASS_ROLE, DSV_MANDATORY_LEVEL, PROF,
} from "./vocabulary.ts";

const IRI = DataFactory.namedNode;

const Literal = DataFactory.literal;

const Quad = DataFactory.quad;

interface DsvToRdfConfiguration {

  /**
   * Prefixes to use when writing RDF output.
   */
  prefixes?: { [prefix: string]: string };

  /**
   * True to do some additional formatting on the output string.
   */
  prettyPrint?: boolean;

}

export async function dsvToRdf(
  model: ApplicationProfile, configuration: DsvToRdfConfiguration,
): Promise<string> {
  const defaultConfig = createDefaultConfiguration();
  const effectiveConfiguration = {
    ...defaultConfig,
    ...configuration,
    prefixes: {
      ...defaultConfig.prefixes,
      ...(configuration.prefixes || {}),
    },
  };
  const prefixes = {
    ...(model.iri ? {"": model.iri} : {}),
    ...effectiveConfiguration.prefixes,
  };
  const n3Writer = new N3.Writer({ prefixes });
  (new DsvWriter(n3Writer, model)).writeConceptualModel();
  // Convert to a string.
  return new Promise((resolve, reject) => n3Writer.end((error, result) => {
    if (error) {
      reject(error);
    } else {
      if (effectiveConfiguration.prettyPrint) {
        resolve(prettyPrintTurtle(result));
      } else {
        resolve(result);
      }
    }
  }));
}

function createDefaultConfiguration(): DsvToRdfConfiguration {
  return {
    "prefixes": {
      "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
      "dct": "http://purl.org/dc/terms/",
      "dsv": "https://w3id.org/dsv#",
      "owl": "http://www.w3.org/2002/07/owl#",
      "skos": "http://www.w3.org/2004/02/skos/core#",
      "vann": "http://purl.org/vocab/vann/",
      "cardinality": "https://w3id.org/dsv/cardinality#",
      "requirement": "https://w3id.org/dsv/requirement-level#",
      "role": "https://w3id.org/dsv/class-role#",
      "prof": "http://www.w3.org/ns/dx/prof/",
    },
    "prettyPrint": true,
  };
}
class DsvWriter {

  private writer: N3.Writer;

  private model: ApplicationProfile;

  constructor(writer: N3.Writer, model: ApplicationProfile) {
    this.writer = writer;
    this.model = model;
  }

  writeConceptualModel(): void {
    this.addType(this.model.iri, PROF.Profile);
    this.addType(this.model.iri, DSV.ApplicationProfile);
    this.model.classProfiles
      .forEach(item => this.writeClassProfile(item));
    this.model.objectPropertyProfiles
      .forEach(item => this.writeObjectPropertyProfile(item));
    this.model.datatypePropertyProfiles
      .forEach(item => this.writeDatatypePropertyProfile(item));
  }

  private addType(subject: string, type: N3.NamedNode) {
    this.writer.addQuad(IRI(subject), RDF.type, type);
  }

  private writeClassProfile(profile: ClassProfile) {
    this.writeProfileBase(profile)
    this.addType(profile.iri, DSV.ClassProfile);
    this.addIris(profile.iri, DSV.class, profile.profiledClassIri);
    // Role
    switch (profile.classRole) {
      case ClassRole.main:
        this.addIri(profile.iri, DSV.classRole, DSV_CLASS_ROLE.main);
        break;
      case ClassRole.supportive:
        this.addIri(profile.iri, DSV.classRole, DSV_CLASS_ROLE.supportive);
        break;
      case ClassRole.undefined:
        break;
    }
  }

  private writeProfileBase(profile: TermProfile) {
    this.addIri(profile.iri, DCT.isPartOf, this.model.iri);
    this.addType(profile.iri, DSV.TermProfile);
    //
    this.addLiteral(profile.iri, SKOS.prefLabel, profile.prefLabel);
    this.addLiteral(profile.iri, SKOS.definition, profile.definition);
    this.addLiteral(profile.iri, SKOS.scopeNote, profile.usageNote);
    this.addIris(profile.iri, DSV.specializationOf, profile.specializationOfIri);
    // We do not write this into properties.
    this.addIris(profile.iri, DSV.profileOf, profile.profileOfIri);
    for (const item of profile.reusesPropertyValue) {
      // We use the [ ... ] notation for blank nodes.
      this.writer.addQuad(Quad(
        IRI(profile.iri),
        DSV.reusesPropertyValue,
        this.writer.blank([{
          predicate: RDF.type,
          object: DSV.PropertyValueReuse,
        }, {
          predicate: DSV.reusedProperty,
          object: IRI(item.reusedPropertyIri),
        }, {
          predicate: DSV.reusedFromResource,
          object: IRI(item.propertyReusedFromResourceIri)
        }])
      ));
    }
    this.addIri(profile.iri, DSV.externalDocumentation, profile.externalDocumentationUrl);
  }

  private addIris(subject: string, predicate: N3.NamedNode, values: string[]) {
    values.forEach(value => this.addIri(subject, predicate, value));
  }

  private addIri(
    subject: string, predicate: N3.NamedNode,
    value: N3.NamedNode<string> | string | null,
  ) {
    if (value === null) {
      return;
    }
    if (value === null) {
      return;
    }
    if (typeof value === 'string') {
      this.writer.addQuad(IRI(subject), predicate, IRI(value));
    } else {
      this.writer.addQuad(IRI(subject), predicate, value);
    }
  }

  private addLiteral(
    subject: string, predicate: N3.NamedNode, string: LanguageString | null,
  ) {
    if (string === null) {
      return;
    }
    for (const [lang, value] of Object.entries(string)) {
      this.writer.addQuad(IRI(subject), predicate, Literal(value, lang));
    }
  }

  writeObjectPropertyProfile(profile: ObjectPropertyProfile) {
    this.writePropertyProfileBase(profile);
    this.addType(profile.iri, DSV.ObjectPropertyProfile);
    this.addIris(profile.iri, DSV.objectPropertyRange, profile.rangeClassIri);
  }

  private writePropertyProfileBase(profile: PropertyProfile) {
    this.writeProfileBase(profile);
    const cardinality = cardinalityToIri(profile.cardinality);
    this.addIri(profile.iri, DSV.cardinality, cardinality);
    this.addIris(profile.iri, DSV.property, profile.profiledPropertyIri);
    this.addIri(profile.iri, DSV.domain, profile.domainIri);

    // Requirement level
    switch (profile.requirementLevel) {
      case RequirementLevel.mandatory:
        this.addIri(profile.iri, DSV.requirementLevel, DSV_MANDATORY_LEVEL.mandatory);
        break;
      case RequirementLevel.optional:
        this.addIri(profile.iri, DSV.requirementLevel, DSV_MANDATORY_LEVEL.optional);
        break;
      case RequirementLevel.recommended:
        this.addIri(profile.iri, DSV.requirementLevel, DSV_MANDATORY_LEVEL.recommended);
        break;
      case RequirementLevel.undefined:
        break;
    }
  }

  writeDatatypePropertyProfile(profile: DatatypePropertyProfile) {
    this.writePropertyProfileBase(profile);
    this.addType(profile.iri, DSV.DatatypePropertyProfile);
    this.addIris(profile.iri, DSV.datatypePropertyRange, profile.rangeDataTypeIri);
  }

}

function cardinalityToIri(cardinality: Cardinality | null): N3.NamedNode<string> | null {
  if (cardinality === null) {
    return null;
  }
  switch (cardinality) {
    case Cardinality.ManyToMany:
      return DSV.ManyToMany;
    case Cardinality.ManyToOne:
      return DSV.ManyToOne;
    case Cardinality.ManyToZero:
      return DSV.ManyToZero;
    case Cardinality.OneToMany:
      return DSV.OneToMany;
    case Cardinality.OneToOne:
      return DSV.OneToOne;
    case Cardinality.OneToZero:
      return DSV.OneToZero;
    case Cardinality.ZeroToMany:
      return DSV.ZeroToMany;
    case Cardinality.ZeroToOne:
      return DSV.ZeroToOne;
    case Cardinality.ZeroToZero:
      return DSV.ZeroToZero;
  }
}

/**
 * Add an empty line before each resource section.
 */
function prettyPrintTurtle(turtle: string): string {
  const lines = turtle.split(/\r?\n|\r|\n/g);
  const linesNext = [];
  for (const line of lines) {
    if (line.startsWith("<")) {
      linesNext.push("");
    }
    linesNext.push(line);
  }
  return linesNext.join("\n");
}
