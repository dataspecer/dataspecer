import { pickLanguageString } from "@/lib/model-display";
import { isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import type { EvolutionSource } from "@dataspecer/profile-model/hooks";
import type { ReviewGroup } from "./review-state";

/**
 * Human-readable labels for the entities appearing on the evolution review
 * screen. All lookups are done against the frozen snapshots of the analysis,
 * so labels stay stable while the user applies changes.
 */

export { pickLanguageString } from "@/lib/model-display";

/**
 * Formats a decision value (language string, cardinality, url, ...)
 */
export function formatValue(value: unknown, language: string): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    // Cardinality [min, max|null].
    return `[${value[0] ?? 0}..${value[1] ?? "*"}]`;
  }
  const languageString = pickLanguageString(value, language);
  if (languageString !== null) return languageString;
  return JSON.stringify(value);
}

function entityName(entity: Entity | null | undefined, entities: EntityRecord, language: string): string {
  if (!entity) return "?";
  if (isSemanticModelClass(entity)) {
    return pickLanguageString(entity.name, language) ?? entity.id;
  }
  if (isSemanticModelRelationship(entity)) {
    const rangeEnd = entity.ends.find((end) => end.iri !== null) ?? entity.ends[1];
    return pickLanguageString(rangeEnd?.name, language) ?? pickLanguageString(entity.name, language) ?? entity.id;
  }
  if (isSemanticModelGeneralization(entity)) {
    const child = entityName(entities[entity.child] ?? null, entities, language);
    const parent = entityName(entities[entity.parent] ?? null, entities, language);
    return `${child} → ${parent}`;
  }
  return entity.id;
}

export interface LabelResolver {
  /** Label of the upstream entity an item reacts to. */
  source(source: EvolutionSource): string;
  /** Label of a profile entity (existing or provisionally created). */
  profile(profileId: string): string;
}

export function createLabelResolver(group: ReviewGroup, language: string): LabelResolver {
  // Provisional profiles proposed by create items do not exist yet — label
  // them after the upstream entity they would profile.
  const provisional = new Map<string, string>();
  for (const item of group.analysis.items) {
    if (item.kind === "create-class-profile" && item.source.after) {
      provisional.set(item.newProfileId, entityName(item.source.after, group.analysis.upstreamAfter, language));
    }
  }

  const upstreamAll: EntityRecord = { ...group.analysis.upstreamBefore, ...group.analysis.upstreamAfter };

  const profile = (profileId: string): string => {
    const provisionalLabel = provisional.get(profileId);
    if (provisionalLabel) return provisionalLabel;

    const entity = group.profileEntities[profileId];
    if (!entity) return profileId;

    if (isSemanticModelClassProfile(entity)) {
      return pickLanguageString(entity.name, language) ?? inheritedLabel(entity.nameFromProfiled) ?? entity.id;
    }
    if (isSemanticModelRelationshipProfile(entity)) {
      const rangeEnd = entity.ends[1] ?? entity.ends[0];
      return pickLanguageString(rangeEnd?.name, language) ?? inheritedLabel(rangeEnd?.nameFromProfiled ?? null) ?? entity.id;
    }
    if (isSemanticModelGeneralization(entity)) {
      return `${profile(entity.child)} → ${profile(entity.parent)}`;
    }
    return entity.id;
  };

  const inheritedLabel = (fromProfiled: string | null): string | null => {
    if (!fromProfiled) return null;
    const profiled = upstreamAll[fromProfiled] ?? group.profileEntities[fromProfiled];
    return profiled ? entityName(profiled, upstreamAll, language) : null;
  };

  return {
    source: (source) => entityName(source.after ?? source.before, upstreamAll, language),
    profile,
  };
}
