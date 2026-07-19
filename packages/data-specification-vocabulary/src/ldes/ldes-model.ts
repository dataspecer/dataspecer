import type { OwlClass, OwlProperty } from "@dataspecer/lightweight-owl";
import type { TermProfile } from "../semantic-model/dsv-model.ts";

/**
 * Published state of a single resource of the specification: a DSV term
 * profile for application profiles, an OWL class or property for
 * vocabularies. The snapshot always carries the canonical IRI of the
 * resource; the version IRI is used only in the RDF serialization.
 */
export type LdesResourceSnapshot = {
  kind: "term-profile";
  termProfile: TermProfile;
} | {
  kind: "owl-class";
  owlClass: OwlClass;
} | {
  kind: "owl-property";
  owlProperty: OwlProperty;
};

export type LdesEventKind = "create" | "update" | "delete";

/**
 * A published version of the stream - a marker stating that the history up to
 * (and including) the marked transaction belongs to the given version, like a
 * git tag. Versions separate the history of the stream into chunks: every
 * event belongs to the first version whose marked transaction is at or after
 * the event's transaction, see {@link LdesEvent.version}.
 */
export interface LdesVersion {
  /**
   * Human-readable version label, e.g. "1.1".
   */
  version: string;

  /**
   * Identifier of the last internal transaction that belongs to the version.
   */
  transactionId: string;

  /**
   * When the version was published (the time of the transaction carrying the
   * version marker), as xsd:dateTime.
   */
  issued: string;
}

/**
 * One published operation - a version object (member) of the LDES stream.
 * Create and update events carry the full published snapshot of the resource
 * after the change, delete events are tombstones.
 *
 * This is intentionally not the internal Dataspecer operation: consumers
 * cannot interpret internal operation types and identifiers, but any LDES
 * client can replay version objects.
 */
export interface LdesEvent {
  kind: LdesEventKind;

  /**
   * Canonical IRI of the published resource the event is about.
   */
  iri: string;

  /**
   * IRI of the member (version object) in the stream.
   */
  memberIri: string;

  /**
   * Identifier of the internal transaction the event was derived from. Events
   * of one transaction share the timestamp and were applied atomically.
   */
  transactionId: string;

  /**
   * When the change was recorded in Dataspecer, as xsd:dateTime.
   */
  created: string;

  /**
   * When the change was published, as xsd:dateTime. For events that belong to
   * a marked version (see {@link version}) this is the publication time of
   * that version; events not covered by any version yet keep the recorded
   * time of {@link created}. This is why the stream declares both
   * ldes:timestampPath (issued) and ldes:versionTimestampPath (created).
   */
  issued: string;

  /**
   * Label of the version the event belongs to (see {@link LdesVersion}).
   * Absent for events not covered by any version marker yet.
   */
  version?: string;

  /**
   * Total order of the events in the stream, published as
   * ldes:sequencePath. Timestamps alone cannot order events of one
   * transaction.
   */
  sequence: number;

  /**
   * The published state of the resource after the event; null for delete
   * events.
   */
  snapshot: LdesResourceSnapshot | null;

  /**
   * For a delete event caused by a rename: the IRI the resource continues
   * under. The corresponding create event follows in the same transaction.
   */
  replacedByIri?: string;
}

export interface LdesEventStream {
  /**
   * IRI of the event stream itself.
   */
  iri: string;

  /**
   * IRI under which the model is published: the application profile IRI or
   * the ontology IRI. Snapshots reference it via dct:isPartOf or
   * rdfs:isDefinedBy.
   */
  publishedModelIri: string;

  /**
   * All events, ordered by {@link LdesEvent.sequence}.
   */
  events: LdesEvent[];

  /**
   * Published versions of the stream, in the order they were marked.
   */
  versions: LdesVersion[];
}

/**
 * One chunk of the history of a stream: the events belonging to one version,
 * or - for the last chunk with a null version - the events not covered by any
 * version marker yet.
 */
export interface LdesVersionChunk {
  version: LdesVersion | null;
  events: LdesEvent[];
}

/**
 * Splits the events of the stream into the chunks of history separated by its
 * versions: one chunk per version (in the marking order), followed by a chunk
 * of the events not released under any version yet. Empty chunks of versions
 * that published no events are kept; the trailing unreleased chunk is present
 * only when there are unreleased events.
 */
export function groupEventsByVersion(stream: LdesEventStream): LdesVersionChunk[] {
  const chunks: LdesVersionChunk[] = stream.versions.map((version) => ({ version, events: [] }));
  const chunkByLabel = new Map(chunks.map((chunk) => [chunk.version!.version, chunk]));

  const unreleased: LdesEvent[] = [];
  for (const event of stream.events) {
    const chunk = event.version === undefined ? undefined : chunkByLabel.get(event.version);
    if (chunk === undefined) {
      unreleased.push(event);
    } else {
      chunk.events.push(event);
    }
  }
  if (unreleased.length > 0) {
    chunks.push({ version: null, events: unreleased });
  }
  return chunks;
}
