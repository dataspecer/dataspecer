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
   * When the change was published, as xsd:dateTime. Currently always equal to
   * {@link created}.
   *
   * @todo Once Dataspecer supports marking versions (an operation stating
   * "everything up to here is version X"), all events up to the marker get
   * the version's publication time here (and possibly a version label),
   * while {@link created} keeps the recorded time. This is why the stream
   * declares both ldes:timestampPath (issued) and ldes:versionTimestampPath
   * (created).
   */
  issued: string;

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
}
