import { entityLabelById } from "@/lib/model-display";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ReactElement } from "react";
import { Trans, useTranslation } from "react-i18next";

/**
 * Shows label OR iri for semantic entity.
 *
 * You need to provide aggregated entity record for it to work properly on
 * application profiles.
 */
export function SemanticEntityName({ entityId, entities }: { entityId: string | null | undefined; entities: EntityRecord; }) {
  const { i18n: { language } } = useTranslation();

  if (!entityId) {
    return <span className="font-mono text-xs text-muted-foreground">?</span>;
  }

  const { name, iri } = entityLabelById(entityId, entities, language);

  if (name) {
    return <span className="font-bold">{name}</span>;
  }

  return <span className="ml-1 font-mono text-xs text-muted-foreground">{iri ?? entityId}</span>;
}

/**
 * Renders full generalization text.
 */
export function generalizationText(i18nKey: string, childId: string, parentId: string, entities: EntityRecord): ReactElement {
  return (
    <Trans
      i18nKey={i18nKey}
      components={{
        child: <SemanticEntityName entityId={childId} entities={entities} />,
        parent: <SemanticEntityName entityId={parentId} entities={entities} />,
      }} />
  );
}

/**
 * Renders full relationship text.
 */
export function relationshipText(i18nKey: string, entityId: string, domainId: string | undefined, rangeId: string | undefined, entities: EntityRecord): ReactElement {
  return (
    <Trans
      i18nKey={i18nKey}
      components={{
        name: <SemanticEntityName entityId={entityId} entities={entities} />,
        domain: <SemanticEntityName entityId={domainId} entities={entities} />,
        range: <SemanticEntityName entityId={rangeId} entities={entities} />,
      }} />
  );
}
