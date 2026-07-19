import * as N3 from "n3";

import { OwlPropertyType, type OwlClass, type OwlProperty } from "@dataspecer/lightweight-owl";
import type { LanguageString, TermProfile } from "../semantic-model/dsv-model.ts";
import { stringN3ToRdf } from "../semantic-model/n3-reader.ts";
import { rdfToDsv } from "../semantic-model/rdf-to-dsv.ts";
import type { LdesEvent, LdesEventKind, LdesEventStream, LdesResourceSnapshot, LdesVersion } from "./ldes-model.ts";
import { AS, DATASPECER_LDES, DCT, LDES, OWL, RDF, RDFS, TREE } from "./vocabulary.ts";

/**
 * Reads a published LDES event stream back into {@link LdesEventStream}. The
 * inverse of `ldesToRdf`; use `ldesToTransactions` to translate the events
 * further into internal Dataspecer operations.
 */
export async function rdfToLdes(rdfAsString: string): Promise<LdesEventStream> {
  const quads = await stringN3ToRdf(rdfAsString);
  const quadsBySubject = new Map<string, N3.Quad[]>();
  for (const quad of quads) {
    let quadsForSubject = quadsBySubject.get(quad.subject.value);
    if (quadsForSubject === undefined) {
      quadsForSubject = [];
      quadsBySubject.set(quad.subject.value, quadsForSubject);
    }
    quadsForSubject.push(quad);
  }

  const streamIri = quads.find((quad) =>
    RDF.type.equals(quad.predicate) && LDES.EventStream.equals(quad.object))?.subject.value;
  if (streamIri === undefined) {
    throw new Error("Missing ldes:EventStream in the document.");
  }

  // Term profile snapshots are loaded with the existing DSV reader: they are
  // grouped under the published application profile, keyed by the member IRI.
  const applicationProfiles = await rdfToDsv(rdfAsString);
  const termProfilesByMemberIri = new Map<string, TermProfile>();
  for (const applicationProfile of applicationProfiles) {
    for (const profile of [
      ...applicationProfile.classProfiles,
      ...applicationProfile.datatypePropertyProfiles,
      ...applicationProfile.objectPropertyProfiles,
    ]) {
      termProfilesByMemberIri.set(profile.iri, profile);
    }
  }

  const events: LdesEvent[] = [];
  for (const quad of quadsBySubject.get(streamIri) ?? []) {
    if (!TREE.member.equals(quad.predicate)) {
      continue;
    }
    const event = loadEvent(quad.object.value, quadsBySubject, termProfilesByMemberIri);
    if (event !== null) {
      events.push(event);
    }
  }
  events.sort((a, b) => a.sequence - b.sequence);

  const streamReader = new MemberReader(quadsBySubject.get(streamIri) ?? []);
  const publishedModelIri = streamReader.iri(DATASPECER_LDES.publishedModel)
    ?? applicationProfiles[0]?.iri
    ?? findIsDefinedBy(events)
    ?? "";

  return {
    iri: streamIri,
    publishedModelIri,
    events,
    versions: loadVersions(streamReader, quadsBySubject),
  };
}

/**
 * Loads the published versions of the stream, restoring their marking order
 * from the issued timestamps.
 */
function loadVersions(streamReader: MemberReader, quadsBySubject: Map<string, N3.Quad[]>): LdesVersion[] {
  const versions: LdesVersion[] = [];
  for (const versionIri of streamReader.iris(DATASPECER_LDES.hasVersion)) {
    const reader = new MemberReader(quadsBySubject.get(versionIri) ?? []);
    const version = reader.literal(DATASPECER_LDES.versionLabel);
    if (version === null) {
      console.warn(`Ignoring version '${versionIri}' without a label.`);
      continue;
    }
    versions.push({
      version,
      transactionId: reader.literal(DATASPECER_LDES.transaction) ?? "",
      issued: reader.literal(DCT.issued) ?? "",
    });
  }
  versions.sort((a, b) => a.issued.localeCompare(b.issued) || a.version.localeCompare(b.version));
  return versions;
}

function findIsDefinedBy(events: LdesEvent[]): string | null {
  for (const { snapshot } of events) {
    if (snapshot?.kind === "owl-class") {
      return snapshot.owlClass.isDefinedBy;
    }
    if (snapshot?.kind === "owl-property") {
      return snapshot.owlProperty.isDefinedBy;
    }
  }
  return null;
}

function loadEvent(
  memberIri: string,
  quadsBySubject: Map<string, N3.Quad[]>,
  termProfilesByMemberIri: Map<string, TermProfile>,
): LdesEvent | null {
  const reader = new MemberReader(quadsBySubject.get(memberIri) ?? []);

  const types = reader.iris(RDF.type);
  let kind: LdesEventKind;
  if (types.includes(AS.Create.value)) {
    kind = "create";
  } else if (types.includes(AS.Update.value)) {
    kind = "update";
  } else if (types.includes(AS.Delete.value)) {
    kind = "delete";
  } else {
    console.warn(`Ignoring member '${memberIri}' without a version object type.`);
    return null;
  }

  const iri = reader.iri(DCT.isVersionOf);
  if (iri === null) {
    console.warn(`Ignoring member '${memberIri}' without dct:isVersionOf.`);
    return null;
  }

  const replacedByIri = reader.iri(DCT.isReplacedBy);
  const version = reader.literal(DATASPECER_LDES.version);
  return {
    kind,
    iri,
    memberIri,
    transactionId: reader.literal(DATASPECER_LDES.transaction) ?? "",
    created: reader.literal(DCT.created) ?? "",
    issued: reader.literal(DCT.issued) ?? "",
    ...(version === null ? {} : { version }),
    sequence: Number(reader.literal(DATASPECER_LDES.sequence) ?? 0),
    snapshot: kind === "delete" ? null
      : loadSnapshot(memberIri, iri, types, reader, termProfilesByMemberIri),
    ...(replacedByIri === null ? {} : { replacedByIri }),
  };
}

/**
 * Loads the snapshot, restoring the canonical IRI of the resource in it.
 */
function loadSnapshot(
  memberIri: string,
  iri: string,
  types: string[],
  reader: MemberReader,
  termProfilesByMemberIri: Map<string, TermProfile>,
): LdesResourceSnapshot | null {
  const termProfile = termProfilesByMemberIri.get(memberIri);
  if (termProfile !== undefined) {
    return { kind: "term-profile", termProfile: { ...termProfile, iri } };
  }
  if (types.includes(OWL.Class.value) || types.includes(RDFS.Class.value)) {
    const owlClass: OwlClass = {
      iri,
      name: reader.languageString(RDFS.label),
      description: reader.languageString(RDFS.comment),
      isDefinedBy: reader.iri(RDFS.isDefinedBy) ?? "",
      subClassOf: reader.iris(RDFS.subClassOf),
    };
    return { kind: "owl-class", owlClass };
  }
  if (types.includes(RDF.Property.value)
    || types.includes(OWL.DatatypeProperty.value)
    || types.includes(OWL.ObjectProperty.value)) {
    const owlProperty: OwlProperty = {
      iri,
      name: reader.languageString(RDFS.label),
      description: reader.languageString(RDFS.comment),
      isDefinedBy: reader.iri(RDFS.isDefinedBy) ?? "",
      subPropertyOf: reader.iris(RDFS.subPropertyOf),
      domain: reader.iri(RDFS.domain) ?? "",
      range: reader.iri(RDFS.range) ?? "",
      type: types.includes(OWL.DatatypeProperty.value) ? OwlPropertyType.DatatypeProperty
        : types.includes(OWL.ObjectProperty.value) ? OwlPropertyType.ObjectProperty
          : null,
    };
    return { kind: "owl-property", owlProperty };
  }
  console.warn(`Missing snapshot for member '${memberIri}'.`);
  return null;
}

class MemberReader {

  private quads: N3.Quad[];

  constructor(quads: N3.Quad[]) {
    this.quads = quads;
  }

  iri(predicate: N3.NamedNode): string | null {
    for (const quad of this.quads) {
      if (predicate.equals(quad.predicate) && quad.object.termType === "NamedNode") {
        return quad.object.value;
      }
    }
    return null;
  }

  iris(predicate: N3.NamedNode): string[] {
    return this.quads
      .filter((quad) => predicate.equals(quad.predicate) && quad.object.termType === "NamedNode")
      .map((quad) => quad.object.value);
  }

  literal(predicate: N3.NamedNode): string | null {
    for (const quad of this.quads) {
      if (predicate.equals(quad.predicate) && quad.object.termType === "Literal") {
        return quad.object.value;
      }
    }
    return null;
  }

  languageString(predicate: N3.NamedNode): LanguageString {
    const result: LanguageString = {};
    for (const quad of this.quads) {
      if (predicate.equals(quad.predicate) && quad.object.termType === "Literal") {
        result[(quad.object as N3.Literal).language ?? ""] = quad.object.value;
      }
    }
    return result;
  }

}
