import { describe, it, expect } from "vitest";
import {
  SEMANTIC_MODEL_CLASS,
  SemanticModelClass,
} from "../../concepts/index.ts";
import {
  SEMANTIC_MODEL_CLASS_PROFILE,
  SemanticModelClassProfile,
  SemanticModelGeneralizationProfile,
} from "../concepts/index.ts";
import {
  AggregatedProfiledSemanticModelClass,
  AggregatedProfileSemanticModelGeneralization,
} from "./aggregator-concepts.ts";
import {
  createObservableSemanticProfileAggregator,
} from "./observable-aggregator.ts";

describe("ObservableSemanticProfileAggregator", () => {

  it("Aggregates a class profile depending on a class in the same model.", () => {

    const aggregator = createObservableSemanticProfileAggregator();

    const events: unknown[] = [];
    aggregator.subscribeToEntityChanges(
      event => events.push(event.entityChanges));

    //

    const cls = {
      id: "class-1",
      type: [SEMANTIC_MODEL_CLASS],
      iri: ":class-1",
      name: { "": "Class" },
      description: { "": "" },
      nameProperty: null,
      descriptionProperty: null,
      externalDocumentationUrl: null,
      order: null,
    } satisfies SemanticModelClass;

    const profile = {
      id: "profile-1",
      type: [SEMANTIC_MODEL_CLASS_PROFILE],
      iri: ":profile-1",
      name: null,
      nameFromProfiled: "class-1",
      description: null,
      descriptionFromProfiled: "class-1",
      profiling: ["class-1"],
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
      controlledVocabularies: [],
    } satisfies SemanticModelClassProfile;

    // Create entities.

    aggregator.onEntityDidChange({
      entityChanges: {
        "model-1": [
          { previous: null, next: cls },
          { previous: null, next: profile },
        ],
      },
    });

    // Check produced event.

    const aggregatedProfile: AggregatedProfiledSemanticModelClass = {
      id: "profile-1",
      type: ["class-profile", "aggregate"],
      iri: ":profile-1",
      name: { "": "Class" },
      nameFromProfiled: "class-1",
      description: { "": "" },
      descriptionFromProfiled: "class-1",
      profiling: ["class-1"],
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
      order: null,
      controlledVocabularies: [],
      conceptIris: [":class-1"],
      conceptIdentifiers: ["class-1"],
      nameProperty: null,
      descriptionProperty: null,
    };

    expect(events).toStrictEqual([{
      "model-1": [
        { previous: null, next: cls },
        { previous: null, next: aggregatedProfile },
      ],
    }]);
  });

  it("Propagates an update of a dependency to the dependent profile.", () => {

    const aggregator = createObservableSemanticProfileAggregator();

    const events: unknown[] = [];
    aggregator.subscribeToEntityChanges(
      event => events.push(event.entityChanges));

    //

    const cls = {
      id: "class-1",
      type: [SEMANTIC_MODEL_CLASS],
      iri: ":class-1",
      name: { "": "Class" },
      description: { "": "" },
      nameProperty: null,
      descriptionProperty: null,
      externalDocumentationUrl: null,
      order: null,
    } satisfies SemanticModelClass;

    const profile = {
      id: "profile-1",
      type: [SEMANTIC_MODEL_CLASS_PROFILE],
      iri: ":profile-1",
      name: null,
      nameFromProfiled: "class-1",
      description: null,
      descriptionFromProfiled: "class-1",
      profiling: ["class-1"],
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
      controlledVocabularies: [],
    } satisfies SemanticModelClassProfile;

    // Create entities.

    aggregator.onEntityDidChange({
      entityChanges: {
        "model-1": [
          { previous: null, next: cls },
          { previous: null, next: profile },
        ],
      },
    });

    // Update class.

    const updatedClass = {
      ...cls,
      name: { "": "Updated class" },
    } satisfies SemanticModelClass;

    aggregator.onEntityDidChange({
      entityChanges: {
        "model-1": [
          { previous: cls, next: updatedClass },
        ],
      },
    });

    // Check produced event.

    const oldAggregatedProfile: AggregatedProfiledSemanticModelClass = {
      id: "profile-1",
      type: ["class-profile", "aggregate"],
      iri: ":profile-1",
      name: { "": "Class" },
      nameFromProfiled: "class-1",
      description: { "": "" },
      descriptionFromProfiled: "class-1",
      profiling: ["class-1"],
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
      order: null,
      controlledVocabularies: [],
      conceptIris: [":class-1"],
      conceptIdentifiers: ["class-1"],
      nameProperty: null,
      descriptionProperty: null,
    };

    const updatedAggregatedProfile: AggregatedProfiledSemanticModelClass = {
      ...oldAggregatedProfile,
      name: { "": "Updated class" },
    };

    // We ignore the first event, that is part of another test.
    // We just focus on the update event.

    expect(events.length).toBe(2);

    expect(events[1]).toStrictEqual({
      "model-1": [
        { previous: cls, next: updatedClass },
        { previous: oldAggregatedProfile, next: updatedAggregatedProfile },
      ],
    });
  });

  it("Propagates removal of an entity to dependents.", () => {

    const aggregator = createObservableSemanticProfileAggregator();

    const events: unknown[] = [];
    aggregator.subscribeToEntityChanges(
      event => events.push(event.entityChanges));

    //

    const cls = {
      id: "class-1",
      type: [SEMANTIC_MODEL_CLASS],
      iri: ":class-1",
      name: { "": "Class" },
      description: { "": "" },
      nameProperty: null,
      descriptionProperty: null,
      externalDocumentationUrl: null,
      order: null,
    } satisfies SemanticModelClass;

    const profile = {
      id: "profile-1",
      type: [SEMANTIC_MODEL_CLASS_PROFILE],
      iri: ":profile-1",
      name: null,
      nameFromProfiled: "class-1",
      description: null,
      descriptionFromProfiled: "class-1",
      profiling: ["class-1"],
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
      controlledVocabularies: [],
    } satisfies SemanticModelClassProfile;

    // Create entities.

    aggregator.onEntityDidChange({
      entityChanges: {
        "model-1": [
          { previous: null, next: cls },
          { previous: null, next: profile },
        ],
      },
    });

    // Delete class entity.

    aggregator.onEntityDidChange({
      entityChanges: {
        "model-1": [
          { previous: cls, next: null },
        ],
      },
    });

    //

    const oldAggregatedProfile: AggregatedProfiledSemanticModelClass = {
      id: "profile-1",
      type: ["class-profile", "aggregate"],
      iri: ":profile-1",
      name: { "": "Class" },
      nameFromProfiled: "class-1",
      description: { "": "" },
      descriptionFromProfiled: "class-1",
      profiling: ["class-1"],
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
      order: null,
      controlledVocabularies: [],
      conceptIris: [":class-1"],
      conceptIdentifiers: ["class-1"],
      nameProperty: null,
      descriptionProperty: null,
    };

    const orphanedAggregatedProfile: AggregatedProfiledSemanticModelClass = {
      ...oldAggregatedProfile,
      name: null,
      description: null,
      conceptIris: [],
      conceptIdentifiers: [],
    };

    // We ignore the first event, that is part of another test.
    // We just focus on the delete event.
    // In there the class is removed and making the profile to be an orphan.

    expect(events.length).toBe(2);

    expect(events[1]).toStrictEqual({
      "model-1": [
        { previous: cls, next: null },
        { previous: oldAggregatedProfile, next: orphanedAggregatedProfile },
      ],
    });

  });

  /**
   * This test is not necessary.
   * We just keep it to illustrate the current behavior.
   * It should be reworked once there is a proper support for entity merging.
   */
  it("Merges the same entity identifier reported by two models.", () => {

    const aggregator = createObservableSemanticProfileAggregator();

    const events: unknown[] = [];
    aggregator.subscribeToEntityChanges(
      event => events.push(event.entityChanges));

    ///

    const weakClass = {
      id: "class-1",
      type: [SEMANTIC_MODEL_CLASS],
      iri: ":class-1",
      name: { "": "Weak" },
      description: {}, // There is no value hare making it weaker.
      nameProperty: null,
      descriptionProperty: null,
      externalDocumentationUrl: null,
      order: null,
    } satisfies SemanticModelClass;

    const strongClass = {
      id: "class-1",
      type: [SEMANTIC_MODEL_CLASS],
      iri: ":class-1",
      name: { "": "Strong" },
      description: { "": "With description" },
      nameProperty: null,
      descriptionProperty: null,
      externalDocumentationUrl: null,
      order: null,
    } satisfies SemanticModelClass;

    // Create both entities.

    aggregator.onEntityDidChange({
      entityChanges: {
        "model-1": [{ previous: null, next: weakClass }],
        "model-2": [{ previous: null, next: strongClass }],
      },
    });

    // Check we got the stronger entity.

    expect(events).toStrictEqual([{
      "model-2": [
        { previous: null, next: strongClass },
      ],
    }]);

  });

  /**
   * Generalizations as just pass through as there is no real aggregation.
   */
  it("Aggregates a generalization profile as a pass-through.", () => {

    const aggregator = createObservableSemanticProfileAggregator();

    const events: unknown[] = [];
    aggregator.subscribeToEntityChanges(
      event => events.push(event.entityChanges));

    //

    const generalizationProfile = {
      id: "generalization-1",
      type: ["generalization"],
      child: "class-1",
      parent: "class-2",
    } satisfies SemanticModelGeneralizationProfile;

    aggregator.onEntityDidChange({
      entityChanges: {
        "model-1": [{ previous: null, next: generalizationProfile }],
      },
    });

    // Check we got the generalization.

    const aggregated: AggregatedProfileSemanticModelGeneralization = {
      id: "generalization-1",
      type: ["generalization", "aggregate"],
      child: "class-1",
      parent: "class-2",
    };

    expect(events).toStrictEqual([{
      "model-1": [
        { previous: null, next: aggregated },
      ],
    }]);

  });

  it("Stops notifying a listener after it unsubscribes.", () => {

    const aggregator = createObservableSemanticProfileAggregator();

    let callCount = 0;
    const unsubscribe = aggregator.subscribeToEntityChanges(() => {
      callCount += 1;
    });
    unsubscribe();

    aggregator.onEntityDidChange({
      entityChanges: {
        "model-1": [{
          previous: null,
          next: {
            id: "class-1",
            type: ["class"],
            iri: ":class-1",
            name: { "": "Class" },
            description: { "": "" },
            nameProperty: null,
            descriptionProperty: null,
            externalDocumentationUrl: null,
            order: null,
          } as SemanticModelClass,
        }],
      },
    });

    expect(callCount).toBe(0);

  });

  /**
   * The aggregator should not emit an event for empty input event,
   * or an input event with unknown entities.
   */
  it("Ignores unknown entities.", () => {

    const aggregator = createObservableSemanticProfileAggregator();

    const events: unknown[] = [];
    aggregator.subscribeToEntityChanges(
      event => events.push(event.entityChanges));

    // Events in.

    aggregator.onEntityDidChange({ entityChanges: {} });

    aggregator.onEntityDidChange({
      entityChanges: {
        "model-1": [{
          previous: null,
          next: { id: "entity-1", type: ["custom"] }
        }]
      }
    });

    //

    expect(events.length).toBe(0);

  });

});
