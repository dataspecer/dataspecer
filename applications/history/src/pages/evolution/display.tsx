import { SemanticEntityName } from "@/components/operation-row/text-utils";
import { isSemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { EvolutionSource } from "@dataspecer/profile-model/hooks";
import type { ReviewGroup } from "./review-state";

/**
 * Names of the entities appearing on the evolution review screen. Both the
 * upstream entity an item reacts to and a profile entity are resolved through
 * the same group's effective (aggregated) entities — see
 * `effectiveGroupEntities` in evolution-data.ts, built with `forcePassThrough`
 * so a package's own profile entities and the vocabulary/profile it profiles
 * are both present in one map — so inherited values (e.g. a name that only
 * exists a vocabulary above a profile) resolve correctly and update live as
 * the user's decisions on the screen change.
 */

/** Name of the upstream entity an item reacts to. */
export function SourceName({ effectiveEntities, source }: { effectiveEntities: EntityRecord; source: EvolutionSource }) {
  return <SemanticEntityName entityId={source.entityId} entities={effectiveEntities} />;
}

/**
 * Name of a profile entity, resolved against the group's effective entities.
 * Also handles profiles that do not exist there yet — a create item still
 * unchecked, so its entity is not part of the shadow model — by naming them
 * after the upstream entity they would profile instead.
 */
export function ProfileName({
  group,
  effectiveEntities,
  profileId,
}: {
  group: ReviewGroup;
  effectiveEntities: EntityRecord;
  profileId: string;
}) {
  const entity = effectiveEntities[profileId];

  if (entity && isSemanticModelGeneralization(entity)) {
    return (
      <>
        <ProfileName group={group} effectiveEntities={effectiveEntities} profileId={entity.child} />
        {" → "}
        <ProfileName group={group} effectiveEntities={effectiveEntities} profileId={entity.parent} />
      </>
    );
  }

  if (!entity) {
    const createItem = group.analysis.items.find((item) => item.kind === "create-class-profile" && item.newProfileId === profileId);
    if (createItem) {
      return <SemanticEntityName entityId={createItem.source.entityId} entities={effectiveEntities} />;
    }
  }

  return <SemanticEntityName entityId={profileId} entities={effectiveEntities} />;
}
