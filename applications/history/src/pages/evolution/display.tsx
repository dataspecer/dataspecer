import { SemanticEntityName } from "@/components/operation-row/text-utils";
import { entityLabel, pickLanguageString } from "@/lib/model-display";
import { isSemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { EvolutionSource } from "@dataspecer/profile-model/hooks";
import { useTranslation } from "react-i18next";
import type { ReviewGroup } from "./review-state";

/**
 * Names of the entities appearing on the evolution review screen. All lookups
 * are done against the frozen snapshots of the analysis, so names stay stable
 * while the user applies changes.
 */

/** All upstream entities of the group, after-states winning over before-states. */
function upstreamEntities(group: ReviewGroup): EntityRecord {
  return { ...group.analysis.upstreamBefore, ...group.analysis.upstreamAfter };
}

/** Name of the upstream entity an item reacts to. */
export function SourceName({ group, source }: { group: ReviewGroup; source: EvolutionSource }) {
  return <SemanticEntityName entityId={source.entityId} entities={upstreamEntities(group)} />;
}

/**
 * Name of a profile entity in the reviewed model. Also handles profiles that
 * do not exist yet (proposed by a create item) — those are named after the
 * upstream entity they would profile — and names inherited from the profiled
 * entity (`nameFromProfiled`).
 */
export function ProfileName({ group, profileId }: { group: ReviewGroup; profileId: string }) {
  const { i18n: { language } } = useTranslation();

  const createItem = group.analysis.items.find((item) => item.kind === "create-class-profile" && item.newProfileId === profileId);
  if (createItem) {
    return <SemanticEntityName entityId={createItem.source.entityId} entities={upstreamEntities(group)} />;
  }

  const entity = group.profileEntities[profileId];
  if (entity && isSemanticModelGeneralization(entity)) {
    return (
      <>
        <ProfileName group={group} profileId={entity.child} />
        {" → "}
        <ProfileName group={group} profileId={entity.parent} />
      </>
    );
  }

  const name = profileName(group, profileId, language);
  if (name) {
    return <span className="font-bold">{name}</span>;
  }
  return <span className="truncate font-mono text-xs text-muted-foreground">{profileId}</span>;
}

function profileName(group: ReviewGroup, profileId: string, language: string): string | null {
  const entity = group.profileEntities[profileId];
  if (!entity) return null;
  if (isSemanticModelClassProfile(entity)) {
    return pickLanguageString(entity.name, language) ?? inheritedName(group, entity.nameFromProfiled, language);
  }
  if (isSemanticModelRelationshipProfile(entity)) {
    // A relationship profile holds its data on the range end by convention.
    const rangeEnd = entity.ends[1] ?? entity.ends[0];
    return pickLanguageString(rangeEnd?.name, language) ?? inheritedName(group, rangeEnd?.nameFromProfiled ?? null, language);
  }
  return null;
}

/** Name a profile inherits from the entity it profiles. */
function inheritedName(group: ReviewGroup, fromProfiled: string | null, language: string): string | null {
  if (!fromProfiled) return null;
  const upstream = upstreamEntities(group);
  const profiled = upstream[fromProfiled] ?? group.profileEntities[fromProfiled];
  if (!profiled) return null;
  const label = entityLabel(profiled, upstream, language);
  return label.name ?? label.iri;
}
