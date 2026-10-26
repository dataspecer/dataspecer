import {
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
  type LanguageString,
  type SemanticModelClass,
  type SemanticModelGeneralization,
  type SemanticModelRelationship,
  type SemanticModelRelationshipEnd,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { deleteEntity } from "@dataspecer/core-v2/semantic-model/operations";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  type SemanticModelClassProfile,
  type SemanticModelRelationshipEndProfile,
  type SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { createDefaultSemanticModelProfileOperationFactory } from "@dataspecer/core-v2/semantic-model/profile/operations";
import { diffEntities, type Entity, type EntityRecord } from "@dataspecer/core/entity-model";
import { deepEqual } from "@dataspecer/utilities";
import {
  prepareProfileSemanticClassOperations,
  prepareProfileSemanticGeneralizationOperations,
  prepareProfileSemanticProfileClassOperations,
  prepareProfileSemanticProfileRelationshipOperations,
  prepareProfileSemanticRelationshipOperations,
  type EntityToProfileMapping,
} from "../operations/complex/profile-entities.ts";
import type { ProfileOperation } from "../profile-model.ts";

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * An upstream entity a profile can profile: a plain semantic model entity
 * (when the dependent model profiles a vocabulary) or a profile entity (when
 * it profiles another application profile). Profile entities are expected with
 * their inherited values already resolved, i.e. aggregated.
 */
type UpstreamClass = SemanticModelClass | SemanticModelClassProfile;
type UpstreamRelationship = SemanticModelRelationship | SemanticModelRelationshipProfile;
type UpstreamRelationshipEnd = SemanticModelRelationshipEnd | SemanticModelRelationshipEndProfile;

function isUpstreamClass(entity: Entity | null | undefined): entity is UpstreamClass {
  return !!entity && (isSemanticModelClass(entity) || isSemanticModelClassProfile(entity));
}

function isUpstreamRelationship(entity: Entity | null | undefined): entity is UpstreamRelationship {
  return !!entity && (isSemanticModelRelationship(entity) || isSemanticModelRelationshipProfile(entity));
}

/**
 * How much attention an evolution item (or a single field decision) needs from
 * the user:
 *
 * - `automatic` — nothing has to happen in the profile model; the change flows
 *   through inheritance by itself. The user may still opt out (e.g. freeze the
 *   old value).
 * - `decision` — a safe default exists and is preselected; the user can accept
 *   it without thinking hard.
 * - `attention` — there is a real conflict (e.g. the profile overrides a value
 *   that changed upstream) with no safe default; the user must look.
 */
export type EvolutionSeverity = "automatic" | "decision" | "attention";

/** The upstream entity change an evolution item reacts to. */
export interface EvolutionSource {
  entityId: string;
  /** Upstream entity before the evolution; null when it is being created. */
  before: Entity | null;
  /** Upstream entity after the evolution; null when it is being deleted. */
  after: Entity | null;
}

/**
 * One way to resolve a field decision or a delete item. `operations` are the
 * profile model operations executing the choice; an empty array means "leave
 * the profile as is".
 */
export interface EvolutionChoice {
  /**
   * Stable identifier of the choice within its decision, e.g. "inherit",
   * "freeze-old", "adopt-new", "keep-own", "drop-override", "keep-override",
   * "delete", "detach", "keep" or "retarget:<profileId>".
   */
  id: string;
  operations: ProfileOperation[];
  /** For "retarget:*" choices: the class profile the end would point to. */
  targetProfileId?: string;
  /**
   * Item ids that must be applied for this choice to be valid (e.g. retarget
   * to a class profile that is itself only proposed to be created).
   */
  dependsOn?: string[];
}

/**
 * An independent decision about one field of one profile entity, caused by an
 * upstream modification. Decisions of one item are orthogonal — the user picks
 * one choice per decision. The `field` discriminates the value types of
 * `oldValue`, `newValue` and `profileValue`.
 */
interface EvolutionFieldDecisionBase {
  /** Unique within the item, e.g. "name" or "range:cardinality". */
  key: string;
  /** For relationship profiles: which end the decision concerns. */
  endRole?: "domain" | "range";
  profileState: "inherits" | "override-matches-new" | "override-differs" | "not-inheritable";
  severity: EvolutionSeverity;
  choices: EvolutionChoice[];
  defaultChoiceId: string;
}

/** A language-tagged text field with the profile inheritance mechanism. */
export interface EvolutionLanguageStringDecision extends EvolutionFieldDecisionBase {
  field: "name" | "description" | "usageNote";
  oldValue: LanguageString | null;
  newValue: LanguageString | null;
  /** The profile's own (override) value; null when inherited. */
  profileValue: LanguageString | null;
}

export interface EvolutionCardinalityDecision extends EvolutionFieldDecisionBase {
  field: "cardinality";
  oldValue: [number, number | null] | null;
  newValue: [number, number | null] | null;
  /** The profile's own (override) value; null when inherited. */
  profileValue: [number, number | null] | null;
}

/** The domain/range class of a relationship was retyped upstream. */
export interface EvolutionConceptDecision extends EvolutionFieldDecisionBase {
  field: "concept";
  oldValue: string | null;
  newValue: string;
  /** The class profile the relationship profile end currently points to. */
  profileValue: string;
}

export interface EvolutionUrlDecision extends EvolutionFieldDecisionBase {
  field: "externalDocumentationUrl";
  oldValue: string | null;
  newValue: string | null;
  profileValue: string | null;
}

export type EvolutionFieldDecision =
  | EvolutionLanguageStringDecision
  | EvolutionCardinalityDecision
  | EvolutionConceptDecision
  | EvolutionUrlDecision;

interface EvolutionItemBase {
  /** Stable identifier of the item, used to key UI state and dependencies. */
  id: string;
  severity: EvolutionSeverity;
  /** Ids of other items that must be applied for this item to be valid. */
  dependsOn: string[];
  source: EvolutionSource;
}

/** A new upstream class → offer to create a class profile for it. */
export interface CreateClassProfileItem extends EvolutionItemBase {
  kind: "create-class-profile";
  /** Id the new class profile will have; other items may depend on it. */
  newProfileId: string;
  operations: ProfileOperation[];
}

/**
 * A new upstream relationship whose both end classes are profiled (or proposed
 * to be) → offer to create a relationship profile. One item is generated per
 * combination of domain and range class profile.
 */
export interface CreateRelationshipProfileItem extends EvolutionItemBase {
  kind: "create-relationship-profile";
  domainProfileId: string;
  rangeProfileId: string;
  newProfileId: string;
  operations: ProfileOperation[];
}

/** A new upstream generalization between profiled classes. */
export interface CreateGeneralizationProfileItem extends EvolutionItemBase {
  kind: "create-generalization-profile";
  childProfileId: string;
  parentProfileId: string;
  newProfileId: string;
  operations: ProfileOperation[];
}

/**
 * An upstream entity was modified and this profile is affected. One item per
 * (upstream entity × profile), holding an independent decision per changed
 * field.
 */
export interface ModifyProfileItem extends EvolutionItemBase {
  kind: "modify-profile";
  profileId: string;
  profileType: "class-profile" | "relationship-profile";
  decisions: EvolutionFieldDecision[];
}

/**
 * An upstream entity was deleted and this profile profiles it. The user picks
 * one of `choices` (typically "delete" with cascade, or "detach" which keeps
 * the profile but freezes inherited values and unlinks it).
 */
export interface DeleteProfileItem extends EvolutionItemBase {
  kind: "delete-profile";
  profileId: string;
  profileType: "class-profile" | "relationship-profile" | "generalization";
  cascade: {
    relationshipProfileIds: string[];
    generalizationIds: string[];
  };
  choices: EvolutionChoice[];
  defaultChoiceId: string;
}

export type EvolutionItem =
  | CreateClassProfileItem
  | CreateRelationshipProfileItem
  | CreateGeneralizationProfileItem
  | DeleteProfileItem
  | ModifyProfileItem;

export interface EvolutionAnalysis {
  /**
   * Upstream entities before the operations. When the upstream is an
   * application profile, this is its aggregated state.
   */
  upstreamBefore: EntityRecord;
  /**
   * Upstream entities after all operations are applied. When the upstream is
   * an application profile, this is its aggregated state.
   */
  upstreamAfter: EntityRecord;
  items: EvolutionItem[];
}

/**
 * Projects a net upstream state change onto a dependent profile model. This is
 * the shared core of the evolution hooks: the upstream may be a semantic model
 * (vocabulary) or the aggregated state of another application profile —
 * upstream profile entities carry their effective (aggregated) values.
 *
 * Multiple operations touching one entity collapse into a single item, and
 * created relationships/generalizations can reference class profiles that are
 * themselves only proposed to be created (via provisional ids and
 * `dependsOn`). All operations embedded in the items are materialized against
 * the state before the evolution, so they stay valid regardless of when (and
 * in which subset) they are committed.
 */
export function deriveEvolutionItems(
  upstreamBefore: EntityRecord,
  upstreamAfter: EntityRecord,
  profileEntities: EntityRecord,
): EvolutionItem[] {
  const changes = diffEntities(upstreamBefore, upstreamAfter);

  const created = changes.filter((c) => c.previous === null).map((c) => c.next!);
  const modified = changes.filter((c) => c.previous !== null && c.next !== null);
  const deleted = changes.filter((c) => c.next === null).map((c) => c.previous!);

  const items: EvolutionItem[] = [];

  // --- Created classes -----------------------------------------------------
  // Offer to create a class profile with a provisional id so that created
  // relationships and generalizations below can already reference it.
  const pendingClassProfiles = new Map<string, { itemId: string; profileId: string }>();

  for (const entity of created) {
    if (!isUpstreamClass(entity)) continue;
    const itemId = `create-class:${entity.id}`;
    const [operation] = isSemanticModelClassProfile(entity)
      ? prepareProfileSemanticProfileClassOperations([entity])
      : prepareProfileSemanticClassOperations([entity]);
    if (!operation) continue;
    pendingClassProfiles.set(entity.id, { itemId, profileId: operation.entity.id });
    items.push({
      kind: "create-class-profile",
      id: itemId,
      severity: "decision",
      dependsOn: [],
      source: { entityId: entity.id, before: null, after: entity },
      newProfileId: operation.entity.id,
      operations: [operation],
    });
  }

  /**
   * Class profiles a given upstream class resolves to: the existing ones plus
   * the pending one proposed above (with the dependency on its create item).
   */
  const classProfileCandidates = (classId: string): { profileId: string; dependsOn: string[] }[] => {
    const candidates = findClassProfilesProfilingEntity(profileEntities, classId)
      .map((p) => ({ profileId: p.id, dependsOn: [] as string[] }));
    const pending = pendingClassProfiles.get(classId);
    if (pending) {
      candidates.push({ profileId: pending.profileId, dependsOn: [pending.itemId] });
    }
    return candidates;
  };

  // --- Created relationships -----------------------------------------------

  for (const entity of created) {
    if (!isUpstreamRelationship(entity)) continue;
    const [domainEnd, rangeEnd] = splitEnds(entity);
    if (!domainEnd?.concept || !rangeEnd?.concept) continue;

    for (const domain of classProfileCandidates(domainEnd.concept)) {
      for (const range of classProfileCandidates(rangeEnd.concept)) {
        // The concept → profile mapping is keyed by the concept, so a
        // self-referencing relationship is only offered with the same class
        // profile on both ends.
        if (domainEnd.concept === rangeEnd.concept && domain.profileId !== range.profileId) continue;
        const mapping: EntityToProfileMapping = {
          [domainEnd.concept]: domain.profileId,
          [rangeEnd.concept]: range.profileId,
        };
        const [operation] = isSemanticModelRelationshipProfile(entity)
          ? prepareProfileSemanticProfileRelationshipOperations([entity], mapping, [])
          : prepareProfileSemanticRelationshipOperations([entity], mapping, []);
        if (!operation) continue;
        items.push({
          kind: "create-relationship-profile",
          id: `create-relationship:${entity.id}:${domain.profileId}:${range.profileId}`,
          severity: "decision",
          dependsOn: [...domain.dependsOn, ...range.dependsOn],
          source: { entityId: entity.id, before: null, after: entity },
          domainProfileId: domain.profileId,
          rangeProfileId: range.profileId,
          newProfileId: operation.entity.id,
          operations: [operation],
        });
      }
    }
  }

  // --- Created generalizations ----------------------------------------------

  for (const entity of created) {
    if (!isSemanticModelGeneralization(entity)) continue;
    pushCreateGeneralizationItems(items, entity, classProfileCandidates);
  }

  // --- Modified entities -----------------------------------------------------

  for (const change of modified) {
    const before = change.previous!;
    const after = change.next!;

    if (isUpstreamClass(before) && isUpstreamClass(after)) {
      for (const profile of findClassProfilesProfilingEntity(profileEntities, before.id)) {
        const item = buildModifyClassItem(before, after, profile);
        if (item) items.push(item);
      }
    } else if (isUpstreamRelationship(before) && isUpstreamRelationship(after)) {
      for (const profile of findRelationshipProfilesProfilingEntity(profileEntities, before.id)) {
        const item = buildModifyRelationshipItem(before, after, profile, classProfileCandidates);
        if (item) items.push(item);
      }
    } else if (isSemanticModelGeneralization(before) && isSemanticModelGeneralization(after)) {
      // A retargeted generalization is projected as delete + create of the
      // corresponding profile generalizations.
      if (before.child !== after.child || before.parent !== after.parent) {
        pushDeleteGeneralizationItems(items, before, profileEntities);
        pushCreateGeneralizationItems(items, after, classProfileCandidates);
      }
    }
  }

  // --- Deleted entities ------------------------------------------------------

  for (const entity of deleted) {
    if (isUpstreamClass(entity)) {
      for (const profile of findClassProfilesProfilingEntity(profileEntities, entity.id)) {
        items.push(buildDeleteClassProfileItem(entity, profile, profileEntities));
      }
    } else if (isUpstreamRelationship(entity)) {
      for (const profile of findRelationshipProfilesProfilingEntity(profileEntities, entity.id)) {
        items.push(buildDeleteRelationshipProfileItem(entity, profile, profileEntities));
      }
    } else if (isSemanticModelGeneralization(entity)) {
      pushDeleteGeneralizationItems(items, entity, profileEntities);
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// Modification items
// ---------------------------------------------------------------------------

function buildModifyClassItem(
  before: UpstreamClass,
  after: UpstreamClass,
  profile: SemanticModelClassProfile,
): ModifyProfileItem | null {
  const decisions: EvolutionFieldDecision[] = [];

  const inheritablePatchOperations = (field: "name" | "description" | "usageNote") =>
    (value: LanguageString | null, fromProfiled: string | null, addProfiling: boolean): ProfileOperation[] => [
      factory.modifyClassProfile(profile.id, {
        [field]: value,
        [`${field}FromProfiled`]: fromProfiled,
        ...(addProfiling ? { profiling: uniqueArray([...profile.profiling, before.id]) } : {}),
      }),
    ];

  pushDecision(decisions, inheritableFieldDecision({
    key: "name",
    field: "name",
    upstreamId: before.id,
    oldValue: before.name,
    newValue: after.name,
    profileValue: profile.name,
    profileFromProfiled: profile.nameFromProfiled,
    makeOperations: inheritablePatchOperations("name"),
  }));

  pushDecision(decisions, inheritableFieldDecision({
    key: "description",
    field: "description",
    upstreamId: before.id,
    oldValue: before.description,
    newValue: after.description,
    profileValue: profile.description,
    profileFromProfiled: profile.descriptionFromProfiled,
    makeOperations: inheritablePatchOperations("description"),
  }));

  // Usage note exists only when the upstream entity is a profile itself.
  if (isSemanticModelClassProfile(before) && isSemanticModelClassProfile(after)) {
    pushDecision(decisions, inheritableFieldDecision({
      key: "usageNote",
      field: "usageNote",
      upstreamId: before.id,
      oldValue: before.usageNote,
      newValue: after.usageNote,
      profileValue: profile.usageNote,
      profileFromProfiled: profile.usageNoteFromProfiled,
      makeOperations: inheritablePatchOperations("usageNote"),
    }));
  }

  pushDecision(decisions, urlDecision({
    oldValue: before.externalDocumentationUrl ?? null,
    newValue: after.externalDocumentationUrl ?? null,
    profileValue: profile.externalDocumentationUrl ?? null,
    makeOperations: (value) => [
      factory.modifyClassProfile(profile.id, { externalDocumentationUrl: value }),
    ],
  }));

  if (decisions.length === 0) return null;
  return {
    kind: "modify-profile",
    id: `modify:${before.id}:${profile.id}`,
    severity: maxSeverity(decisions.map((d) => d.severity)),
    dependsOn: [],
    source: { entityId: before.id, before, after },
    profileId: profile.id,
    profileType: "class-profile",
    decisions,
  };
}

function buildModifyRelationshipItem(
  before: UpstreamRelationship,
  after: UpstreamRelationship,
  profile: SemanticModelRelationshipProfile,
  classProfileCandidates: (classId: string) => { profileId: string; dependsOn: string[] }[],
): ModifyProfileItem | null {
  const decisions: EvolutionFieldDecision[] = [];
  const dependsOn: string[] = [];
  const isProfile = isSemanticModelRelationshipProfile(before);

  // In the profile the ends are by convention ordered domain (0), range (1).
  const { domainIdx, rangeIdx } = upstreamEndIndices(before);
  const endMappings: { upstreamIdx: number; profileIdx: number; endRole: "domain" | "range" }[] = [
    { upstreamIdx: domainIdx, profileIdx: 0, endRole: "domain" },
    { upstreamIdx: rangeIdx, profileIdx: 1, endRole: "range" },
  ];

  for (const { upstreamIdx, profileIdx, endRole } of endMappings) {
    const beforeEnd = before.ends[upstreamIdx];
    const afterEnd = after.ends[upstreamIdx];
    const profileEnd = profile.ends[profileIdx];
    if (!beforeEnd || !afterEnd || !profileEnd) continue;

    const inheritablePatchOperations = (field: "name" | "description" | "usageNote") =>
      (value: LanguageString | null, fromProfiled: string | null, addProfiling: boolean): ProfileOperation[] => [
        factory.modifyRelationshipEndProfile(profile.id, profileIdx, {
          [field]: value,
          [`${field}FromProfiled`]: fromProfiled,
          ...(addProfiling ? { profiling: uniqueArray([...profileEnd.profiling, before.id]) } : {}),
        }),
      ];

    pushDecision(decisions, inheritableFieldDecision({
      key: `${endRole}:name`,
      field: "name",
      endRole,
      upstreamId: before.id,
      oldValue: beforeEnd.name,
      newValue: afterEnd.name,
      profileValue: profileEnd.name,
      profileFromProfiled: profileEnd.nameFromProfiled,
      makeOperations: inheritablePatchOperations("name"),
    }));

    pushDecision(decisions, inheritableFieldDecision({
      key: `${endRole}:description`,
      field: "description",
      endRole,
      upstreamId: before.id,
      oldValue: beforeEnd.description,
      newValue: afterEnd.description,
      profileValue: profileEnd.description,
      profileFromProfiled: profileEnd.descriptionFromProfiled,
      makeOperations: inheritablePatchOperations("description"),
    }));

    // Usage note exists only when the upstream entity is a profile itself.
    if (isProfile) {
      const beforeProfileEnd = beforeEnd as SemanticModelRelationshipEndProfile;
      const afterProfileEnd = afterEnd as SemanticModelRelationshipEndProfile;
      pushDecision(decisions, inheritableFieldDecision({
        key: `${endRole}:usageNote`,
        field: "usageNote",
        endRole,
        upstreamId: before.id,
        oldValue: beforeProfileEnd.usageNote,
        newValue: afterProfileEnd.usageNote,
        profileValue: profileEnd.usageNote,
        profileFromProfiled: profileEnd.usageNoteFromProfiled,
        makeOperations: inheritablePatchOperations("usageNote"),
      }));
    }

    pushDecision(decisions, cardinalityDecision({
      key: `${endRole}:cardinality`,
      endRole,
      oldValue: beforeEnd.cardinality ?? null,
      newValue: afterEnd.cardinality ?? null,
      profileValue: profileEnd.cardinality ?? null,
      makeOperations: (value) => [
        factory.modifyRelationshipEndProfile(profile.id, profileIdx, { cardinality: value }),
      ],
    }));

    // Domain/range class retyped upstream → offer to retarget the profile end.
    if (beforeEnd.concept !== afterEnd.concept && afterEnd.concept) {
      const candidates = classProfileCandidates(afterEnd.concept);
      if (candidates.length > 0) {
        const choices: EvolutionChoice[] = [
          { id: "keep-own", operations: [] },
          ...candidates.map((candidate) => ({
            id: `retarget:${candidate.profileId}`,
            operations: [
              factory.modifyRelationshipEndProfile(profile.id, profileIdx, { concept: candidate.profileId }),
            ],
            targetProfileId: candidate.profileId,
            ...(candidate.dependsOn.length > 0 ? { dependsOn: candidate.dependsOn } : {}),
          })),
        ];
        decisions.push({
          key: `${endRole}:concept`,
          field: "concept",
          endRole,
          oldValue: beforeEnd.concept,
          newValue: afterEnd.concept,
          profileValue: profileEnd.concept,
          profileState: "not-inheritable",
          severity: "attention",
          choices,
          defaultChoiceId: candidates.length === 1 && candidates[0]!.dependsOn.length === 0
            ? `retarget:${candidates[0]!.profileId}`
            : "keep-own",
        });
      }
    }
  }

  if (decisions.length === 0) return null;
  return {
    kind: "modify-profile",
    id: `modify:${before.id}:${profile.id}`,
    severity: maxSeverity(decisions.map((d) => d.severity)),
    dependsOn,
    source: { entityId: before.id, before, after },
    profileId: profile.id,
    profileType: "relationship-profile",
    decisions,
  };
}

// ---------------------------------------------------------------------------
// Field decisions
// ---------------------------------------------------------------------------

function pushDecision(decisions: EvolutionFieldDecision[], decision: EvolutionFieldDecision | null): void {
  if (decision) decisions.push(decision);
}

/**
 * Decision for a field with the profile inheritance mechanism (value +
 * valueFromProfiled pair, e.g. name, description, usage note).
 *
 * `makeOperations(value, fromProfiled, addProfiling)` builds the profile
 * operations setting the field override and its inheritance source.
 */
function inheritableFieldDecision(args: {
  key: string;
  field: EvolutionLanguageStringDecision["field"];
  endRole?: "domain" | "range";
  upstreamId: string;
  oldValue: LanguageString | null;
  newValue: LanguageString | null;
  profileValue: LanguageString | null;
  profileFromProfiled: string | null;
  makeOperations: (value: LanguageString | null, fromProfiled: string | null, addProfiling: boolean) => ProfileOperation[];
}): EvolutionLanguageStringDecision | null {
  const { key, field, endRole, upstreamId, oldValue, newValue, profileValue, profileFromProfiled, makeOperations } = args;
  if (deepEqual(oldValue, newValue)) return null;

  const base = { key, field, ...(endRole ? { endRole } : {}), oldValue, newValue, profileValue };

  if (profileFromProfiled === upstreamId) {
    // The profile inherits the value → the new value flows automatically.
    return {
      ...base,
      profileValue: null,
      profileState: "inherits",
      severity: "automatic",
      choices: [
        { id: "inherit", operations: [] },
        { id: "freeze-old", operations: makeOperations(oldValue, null, false) },
      ],
      defaultChoiceId: "inherit",
    };
  }

  if (profileFromProfiled !== null) {
    // Inherited from a different entity — this change does not affect it.
    return null;
  }

  if (deepEqual(profileValue, newValue)) {
    // The override became redundant → offer to inherit again.
    return {
      ...base,
      profileState: "override-matches-new",
      severity: "decision",
      choices: [
        { id: "drop-override", operations: makeOperations(null, upstreamId, true) },
        { id: "keep-override", operations: [] },
      ],
      defaultChoiceId: "drop-override",
    };
  }

  // Real conflict: the profile overrides a value that changed upstream.
  return {
    ...base,
    profileState: "override-differs",
    severity: "attention",
    choices: [
      { id: "keep-own", operations: [] },
      { id: "adopt-new", operations: makeOperations(newValue, null, false) },
      { id: "inherit", operations: makeOperations(null, upstreamId, true) },
    ],
    defaultChoiceId: "keep-own",
  };
}

/**
 * Decision for the cardinality of a relationship profile end, where null means
 * "inherited from the profiled entity".
 */
function cardinalityDecision(args: {
  key: string;
  endRole: "domain" | "range";
  oldValue: [number, number | null] | null;
  newValue: [number, number | null] | null;
  profileValue: [number, number | null] | null;
  makeOperations: (value: [number, number | null] | null) => ProfileOperation[];
}): EvolutionCardinalityDecision | null {
  const { key, endRole, oldValue, newValue, profileValue, makeOperations } = args;
  if (deepEqual(oldValue, newValue)) return null;

  const base = { key, field: "cardinality" as const, endRole, oldValue, newValue, profileValue };

  if (profileValue === null) {
    return {
      ...base,
      profileState: "inherits",
      severity: "automatic",
      choices: [
        { id: "inherit", operations: [] },
        { id: "freeze-old", operations: makeOperations(oldValue) },
      ],
      defaultChoiceId: "inherit",
    };
  }

  if (deepEqual(profileValue, newValue)) {
    return {
      ...base,
      profileState: "override-matches-new",
      severity: "decision",
      choices: [
        { id: "drop-override", operations: makeOperations(null) },
        { id: "keep-override", operations: [] },
      ],
      defaultChoiceId: "drop-override",
    };
  }

  return {
    ...base,
    profileState: "override-differs",
    severity: "attention",
    choices: [
      { id: "keep-own", operations: [] },
      { id: "adopt-new", operations: makeOperations(newValue) },
    ],
    defaultChoiceId: "keep-own",
  };
}

/**
 * Decision for the external documentation URL, a field without the inheritance
 * mechanism (the profile always holds its own value).
 */
function urlDecision(args: {
  oldValue: string | null;
  newValue: string | null;
  profileValue: string | null;
  makeOperations: (value: string | null) => ProfileOperation[];
}): EvolutionUrlDecision | null {
  const { oldValue, newValue, profileValue, makeOperations } = args;
  if (oldValue === newValue) return null;
  if (profileValue === newValue) return null;

  const matchesOld = profileValue === oldValue;
  return {
    key: "externalDocumentationUrl",
    field: "externalDocumentationUrl",
    oldValue,
    newValue,
    profileValue,
    profileState: "not-inheritable",
    severity: matchesOld ? "decision" : "attention",
    choices: [
      { id: "adopt-new", operations: makeOperations(newValue) },
      { id: "keep-own", operations: [] },
    ],
    defaultChoiceId: matchesOld ? "adopt-new" : "keep-own",
  };
}

// ---------------------------------------------------------------------------
// Deletion items
// ---------------------------------------------------------------------------

function buildDeleteClassProfileItem(
  entity: UpstreamClass,
  profile: SemanticModelClassProfile,
  profileEntities: EntityRecord,
): DeleteProfileItem {
  const dependentRels = findRelationshipProfilesReferencingConcept(profileEntities, profile.id);
  const dependentGens = findGeneralizationsReferencingEntity(profileEntities, profile.id);

  const deleteOperations: ProfileOperation[] = [
    ...dependentRels.map((r) => deleteEntity(r.id)),
    ...dependentGens.map((g) => deleteEntity(g.id)),
    deleteEntity(profile.id),
  ];

  // Detach: keep the profile, but unlink it from the deleted entity and freeze
  // the values it inherited from it.
  const detachOperations: ProfileOperation[] = [
    factory.modifyClassProfile(profile.id, {
      profiling: profile.profiling.filter((id) => id !== entity.id),
      ...(profile.nameFromProfiled === entity.id
        ? { name: entity.name, nameFromProfiled: null }
        : {}),
      ...(profile.descriptionFromProfiled === entity.id
        ? { description: entity.description, descriptionFromProfiled: null }
        : {}),
      ...(profile.usageNoteFromProfiled === entity.id
        ? {
          usageNote: isSemanticModelClassProfile(entity) ? entity.usageNote : null,
          usageNoteFromProfiled: null,
        }
        : {}),
    }),
  ];

  // When the profile profiles other entities too, deleting it would lose more
  // than the upstream deletion implies — detaching is the safer default then.
  const profilesOtherEntities = profile.profiling.some((id) => id !== entity.id);

  return {
    kind: "delete-profile",
    id: `delete:${entity.id}:${profile.id}`,
    severity: "attention",
    dependsOn: [],
    source: { entityId: entity.id, before: entity, after: null },
    profileId: profile.id,
    profileType: "class-profile",
    cascade: {
      relationshipProfileIds: dependentRels.map((r) => r.id),
      generalizationIds: dependentGens.map((g) => g.id),
    },
    choices: [
      { id: "delete", operations: deleteOperations },
      { id: "detach", operations: detachOperations },
    ],
    defaultChoiceId: profilesOtherEntities ? "detach" : "delete",
  };
}

function buildDeleteRelationshipProfileItem(
  entity: UpstreamRelationship,
  profile: SemanticModelRelationshipProfile,
  profileEntities: EntityRecord,
): DeleteProfileItem {
  const dependentGens = findGeneralizationsReferencingEntity(profileEntities, profile.id);

  const deleteOperations: ProfileOperation[] = [
    ...dependentGens.map((g) => deleteEntity(g.id)),
    deleteEntity(profile.id),
  ];

  // Detach every end that profiles the deleted relationship, freezing the
  // inherited values. In a semantic relationship they live on the range end by
  // convention; a profile relationship holds them per end.
  const [, semanticRangeEnd] = splitEnds(entity);
  const isProfile = isSemanticModelRelationshipProfile(entity);
  const detachOperations: ProfileOperation[] = [];
  profile.ends.forEach((end, endIdx) => {
    if (!end.profiling.includes(entity.id)) return;
    const upstreamEnd = isProfile ? entity.ends[endIdx] : semanticRangeEnd;
    const upstreamUsageNote = isProfile
      ? (upstreamEnd as SemanticModelRelationshipEndProfile | undefined)?.usageNote ?? null
      : null;
    detachOperations.push(
      factory.modifyRelationshipEndProfile(profile.id, endIdx, {
        profiling: end.profiling.filter((id) => id !== entity.id),
        ...(end.nameFromProfiled === entity.id
          ? { name: upstreamEnd?.name ?? {}, nameFromProfiled: null }
          : {}),
        ...(end.descriptionFromProfiled === entity.id
          ? { description: upstreamEnd?.description ?? {}, descriptionFromProfiled: null }
          : {}),
        ...(end.usageNoteFromProfiled === entity.id
          ? { usageNote: upstreamUsageNote, usageNoteFromProfiled: null }
          : {}),
      }),
    );
  });

  const profilesOtherEntities = profile.ends.some((end) =>
    end.profiling.some((id) => id !== entity.id));

  return {
    kind: "delete-profile",
    id: `delete:${entity.id}:${profile.id}`,
    severity: "attention",
    dependsOn: [],
    source: { entityId: entity.id, before: entity, after: null },
    profileId: profile.id,
    profileType: "relationship-profile",
    cascade: {
      relationshipProfileIds: [],
      generalizationIds: dependentGens.map((g) => g.id),
    },
    choices: [
      { id: "delete", operations: deleteOperations },
      { id: "detach", operations: detachOperations },
    ],
    defaultChoiceId: profilesOtherEntities ? "detach" : "delete",
  };
}

function pushDeleteGeneralizationItems(
  items: EvolutionItem[],
  entity: SemanticModelGeneralization,
  profileEntities: EntityRecord,
): void {
  const childProfiles = findClassProfilesProfilingEntity(profileEntities, entity.child);
  const parentProfiles = findClassProfilesProfilingEntity(profileEntities, entity.parent);
  const profileGeneralizations = findGeneralizationsReferencingClassProfiles(
    profileEntities,
    childProfiles.map((p) => p.id),
    parentProfiles.map((p) => p.id),
  );

  for (const profileGen of profileGeneralizations) {
    items.push({
      kind: "delete-profile",
      id: `delete:${entity.id}:${profileGen.id}`,
      severity: "decision",
      dependsOn: [],
      source: { entityId: entity.id, before: entity, after: null },
      profileId: profileGen.id,
      profileType: "generalization",
      cascade: { relationshipProfileIds: [], generalizationIds: [] },
      choices: [
        { id: "delete", operations: [deleteEntity(profileGen.id)] },
        { id: "keep", operations: [] },
      ],
      defaultChoiceId: "delete",
    });
  }
}

// ---------------------------------------------------------------------------
// Creation helpers
// ---------------------------------------------------------------------------

function pushCreateGeneralizationItems(
  items: EvolutionItem[],
  entity: SemanticModelGeneralization,
  classProfileCandidates: (classId: string) => { profileId: string; dependsOn: string[] }[],
): void {
  if (!entity.child || !entity.parent) return;

  for (const child of classProfileCandidates(entity.child)) {
    for (const parent of classProfileCandidates(entity.parent)) {
      const mapping: EntityToProfileMapping = {
        [entity.child]: child.profileId,
        [entity.parent]: parent.profileId,
      };
      const [operation] = prepareProfileSemanticGeneralizationOperations([entity], mapping, []);
      if (!operation) continue;
      items.push({
        kind: "create-generalization-profile",
        id: `create-generalization:${entity.id}:${child.profileId}:${parent.profileId}`,
        severity: "decision",
        dependsOn: [...child.dependsOn, ...parent.dependsOn],
        source: { entityId: entity.id, before: null, after: entity },
        childProfileId: child.profileId,
        parentProfileId: parent.profileId,
        newProfileId: operation.entity.id,
        operations: [operation],
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Finders in the dependent profile model
// ---------------------------------------------------------------------------

export function findClassProfilesProfilingEntity(
  profileModelEntities: EntityRecord,
  entityId: string,
): SemanticModelClassProfile[] {
  return Object.values(profileModelEntities)
    .filter(isSemanticModelClassProfile)
    .filter((p) => p.profiling.includes(entityId));
}

export function findRelationshipProfilesProfilingEntity(
  profileModelEntities: EntityRecord,
  entityId: string,
): SemanticModelRelationshipProfile[] {
  return Object.values(profileModelEntities)
    .filter(isSemanticModelRelationshipProfile)
    .filter((p) => p.ends.some((end) => end.profiling.includes(entityId)));
}

export function findRelationshipProfilesReferencingConcept(
  profileModelEntities: EntityRecord,
  entityId: string,
): SemanticModelRelationshipProfile[] {
  return Object.values(profileModelEntities)
    .filter(isSemanticModelRelationshipProfile)
    .filter((p) => p.ends.some((end) => end.concept === entityId));
}

export function findGeneralizationsReferencingEntity(
  profileModelEntities: EntityRecord,
  entityId: string,
): SemanticModelGeneralization[] {
  return Object.values(profileModelEntities)
    .filter(isSemanticModelGeneralization)
    .filter((g) => g.child === entityId || g.parent === entityId);
}

export function findGeneralizationsReferencingClassProfiles(
  profileModelEntities: EntityRecord,
  childProfileIds: string[],
  parentProfileIds: string[],
): SemanticModelGeneralization[] {
  return Object.values(profileModelEntities)
    .filter(isSemanticModelGeneralization)
    .filter((g) =>
      childProfileIds.includes(g.child) && parentProfileIds.includes(g.parent));
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Splits relationship ends into [domain, range]. A profile relationship stores
 * them in this order by convention; in a semantic relationship the range end
 * is the one with a non-null iri.
 */
function splitEnds(relationship: UpstreamRelationship): [UpstreamRelationshipEnd | undefined, UpstreamRelationshipEnd | undefined] {
  const { domainIdx, rangeIdx } = upstreamEndIndices(relationship);
  return [relationship.ends[domainIdx], relationship.ends[rangeIdx]];
}

function upstreamEndIndices(relationship: UpstreamRelationship): { domainIdx: number; rangeIdx: number } {
  if (isSemanticModelRelationshipProfile(relationship)) {
    return { domainIdx: 0, rangeIdx: 1 };
  }
  const rangeIdx = relationship.ends[0]?.iri !== null ? 0 : 1;
  return { domainIdx: 1 - rangeIdx, rangeIdx };
}

function maxSeverity(severities: EvolutionSeverity[]): EvolutionSeverity {
  if (severities.includes("attention")) return "attention";
  if (severities.includes("decision")) return "decision";
  return "automatic";
}

function uniqueArray<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
