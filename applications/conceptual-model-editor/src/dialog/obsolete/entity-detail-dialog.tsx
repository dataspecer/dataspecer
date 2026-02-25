import { useState } from "react";

import {
  type SemanticModelClass,
  type SemanticModelGeneralization,
  type SemanticModelRelationship,
  isSemanticModelAttribute,
  isSemanticModelClass,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";

import { IriLink } from "../../components/iri-link";
import { sourceModelOfEntity } from "../../util/model-utils";
import { ModelGraphContextType, useModelGraphContext } from "../../context/model-context";
import { ResourceDetailClickThrough } from "../../components/entity-detail-dialog-clicktrough-component";
import { getEntityTypeString, useEntityProxy } from "../../util/detail-utils";
import { DialogDetailRow } from "../../components/dialog/dialog-detail-row";
import { ScrollableResourceDetailClickThroughList } from "../../components/scrollable-detail-click-through";
import { DialogColoredModelHeaderWithLanguageSelector } from "../../components/dialog/dialog-colored-model-header";
import { t } from "../../application";
import { DialogProps, DialogWrapper } from "../dialog-api";
import { AggregatedEntityWrapper } from "@dataspecer/core-v2/semantic-model/aggregator";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { isSemanticModelAttributeProfile } from "../../dataspecer/semantic-model";

type SupportedTypes =
  | SemanticModelClass
  | SemanticModelRelationship
  | SemanticModelGeneralization
  | SemanticModelClassProfile
  | SemanticModelRelationshipProfile;

interface EntityDetailState {

  entity: SupportedTypes;

  language: string;

}

export const createEntityDetailDialog = (
  graph: ModelGraphContextType,
  entity: SupportedTypes,
  language: string,
): DialogWrapper<EntityDetailState> => {
  const aggregatedEntity = graph.aggregatorView.getEntities()[entity.id];

  return {
    label: selectLabel(aggregatedEntity),
    component: EntityDetailDialog,
    state: createEntityDetailDialogState(
      aggregatedEntity.aggregatedEntity as SupportedTypes, language),
    confirmLabel: null,
    cancelLabel: "detail-dialog.btn-close",
    validate: null,
    onConfirm: null,
    onClose: null,
  };
}

function selectLabel(aggregatedEntity: AggregatedEntityWrapper) {
  const entity = aggregatedEntity.aggregatedEntity;
  if (isSemanticModelClass(entity)) {
    return "detail-dialog.title.class";
  } else if (isSemanticModelAttribute(entity)) {
    return "detail-dialog.title.attribute";
  } else if (isSemanticModelRelationship(entity)) {
    return "detail-dialog.title.relationship";
  } else if (isSemanticModelAttributeProfile(entity)) {
    return "detail-dialog.title.attribute-profile";
  } else if (isSemanticModelClassProfile(entity)) {
    return "detail-dialog.title.class-profile";
  } else if (isSemanticModelRelationshipProfile(entity)) {
    return "detail-dialog.title.relationship-profile";
  } else {
    return "detail-dialog.title.unknown";
  }
};

function createEntityDetailDialogState(
  entity: SupportedTypes,
  language: string,
): EntityDetailState {
  return {
    entity,
    language,
  };
}

const EntityDetailDialog = (props: DialogProps<EntityDetailState>) => {
  const [language, setLanguage] = useState<string>(props.state.language);
  const graph = useModelGraphContext();
  //
  const entity = props.state.entity;
  const models = [...graph.models.values()];
  const sourceModel = sourceModelOfEntity(entity.id, models);

  const proxy = useEntityProxy(entity, language);

  const isRelationship = isSemanticModelRelationship(entity);
  const isRelationshipProfile = isSemanticModelRelationshipProfile(entity);

  const handleResourceClickThroughClicked = (next: SupportedTypes) => {
    props.changeState({
      entity: next,
      language: props.state.language,
    });
  };

  return (
    <>
      <div className="bg-slate-100">
        <DialogColoredModelHeaderWithLanguageSelector
          activeModel={sourceModel}
          viewedEntity={entity}
          currentLanguage={language}
          setCurrentLanguage={(l) => setLanguage(l)}
          style="grid md:grid-cols-[20%_80%] md:grid-rows-1 md:py-2 md:pl-8"
        />

        {/*
                ------------------------------------
                Top header section with name and iri
                ------------------------------------
                */}

        <div className="grid md:grid-cols-[80%_20%] md:grid-rows-1 md:py-2 md:pl-8">
          <h5 className="text-xl">
            Detail of: <span className="font-semibold">{proxy.name}</span>
          </h5>
        </div>
        {proxy.iri === null ? null : (
          <p className="flex flex-row pl-8 text-gray-500" title={proxy.iri ?? ""}>
            <IriLink iri={proxy.iri} />
            {proxy.iri}
          </p>
        )}

        {/*
                --------------------------------------------
                profiles / generalizations / specializations
                --------------------------------------------
                */}

        <div className="grid md:grid-cols-[20%_80%] md:pl-8">
          <>
            {proxy.profileOf.length === 0 ? null : (
              <DialogDetailRow detailKey={t("entity-detail-dialog.direct-profile")}>
                {proxy.profileOf.map(item =>
                  <ResourceDetailClickThrough
                    key={item.id}
                    detailDialogLanguage={language}
                    resource={item!}
                    onClick={() => handleResourceClickThroughClicked(item!)}
                    withIri={true}
                  />
                )}
              </DialogDetailRow>
            )}
            {proxy.originalProfile.length === 0 ? null : (
              <DialogDetailRow detailKey={t("entity-detail-dialog.original-profile")}>
                {proxy.originalProfile.map(item =>
                  <ResourceDetailClickThrough
                    key={item.id}
                    detailDialogLanguage={language}
                    resource={item!}
                    onClick={() => handleResourceClickThroughClicked(item!)}
                    withIri={true}
                  />
                )}
              </DialogDetailRow>
            )}
            {proxy.profiledBy.length > 0 && (
              <DialogDetailRow detailKey={t("entity-detail-dialog.profiled-by")}>
                <ScrollableResourceDetailClickThroughList
                  detailDialogLanguage={language}
                  resources={proxy.profiledBy}
                  onResourceClicked={(resource) => handleResourceClickThroughClicked(resource)}
                />
              </DialogDetailRow>
            )}
          </>
          {proxy.specializationOf.length > 0 && (
            <DialogDetailRow detailKey={t(isRelationship || isRelationshipProfile ?
              "entity-detail-dialog.specialization-of-property" :
              "entity-detail-dialog.specialization-of")}>
              <ScrollableResourceDetailClickThroughList
                detailDialogLanguage={language}
                resources={proxy.specializationOf}
                onResourceClicked={(resource) => handleResourceClickThroughClicked(resource)}
              />
            </DialogDetailRow>
          )}
          {proxy.generalizationOf.length > 0 && (
            <DialogDetailRow detailKey={t("entity-detail-dialog.generalization-of")}>
              <ScrollableResourceDetailClickThroughList
                detailDialogLanguage={language}
                resources={proxy.generalizationOf}
                onResourceClicked={(resource) => handleResourceClickThroughClicked(resource)}
              />
            </DialogDetailRow>
          )}
        </div>
      </div>

      {/*
            -------------------------------------
            basic information - type, description
            -------------------------------------
            */}

      <div className="grid gap-y-3 bg-slate-100 md:grid-cols-[20%_80%] md:pl-8">
        <DialogDetailRow detailKey={t("entity-detail-dialog.type")}>{getEntityTypeString(entity)}</DialogDetailRow>
        <DialogDetailRow detailKey={t("entity-detail-dialog.description")}>{proxy.description}</DialogDetailRow>

        {/*
                ---------------------------------
                attributes and attribute profiles
                ---------------------------------
                */}

        {proxy.attributes.length > 0 && (
          <DialogDetailRow detailKey={t("entity-detail-dialog.attributes")}>
            <ScrollableResourceDetailClickThroughList
              detailDialogLanguage={language}
              resources={proxy.attributes}
              onResourceClicked={(resource) => handleResourceClickThroughClicked(resource)}
            />
          </DialogDetailRow>
        )}

        {proxy.attributeProfiles.length > 0 && (
          <DialogDetailRow detailKey={t("entity-detail-dialog.attributes-profiles")}>
            <ScrollableResourceDetailClickThroughList
              detailDialogLanguage={language}
              resources={proxy.attributeProfiles}
              onResourceClicked={(resource) => handleResourceClickThroughClicked(resource)}
            />
          </DialogDetailRow>
        )}
        {proxy.usageNote && <DialogDetailRow detailKey={t("entity-detail-dialog.usage-note")}>
          {proxy.usageNote}
        </DialogDetailRow>}

        {/*
                ---------------------------------------------
                domain and range for relationships (profiles)
                ---------------------------------------------
                */}

        {proxy.domain.entity && (
          <DialogDetailRow detailKey={t("entity-detail-dialog.domain")}>
            <ResourceDetailClickThrough
              detailDialogLanguage={language}
              resource={proxy.domain.entity}
              // It ain't null
              onClick={() => handleResourceClickThroughClicked(proxy.domain.entity!)}
              withCardinality={proxy.domain.cardinality}
            />
          </DialogDetailRow>
        )}
        {proxy.range.entity && (
          <DialogDetailRow detailKey={t("entity-detail-dialog.range")}>
            <ResourceDetailClickThrough
              resource={proxy.range.entity}
              detailDialogLanguage={language}
              // It ain't null

              onClick={() => handleResourceClickThroughClicked(proxy.range.entity!)}
              withCardinality={proxy.range.cardinality}
            />
          </DialogDetailRow>
        )}
        {proxy.datatype && (
          <DialogDetailRow detailKey={t("entity-detail-dialog.datatype")}>
            {proxy.datatype.label ? `${proxy.datatype.label} (${proxy.datatype.uri})` : proxy.datatype.uri}
          </DialogDetailRow>
        )}
      </div>
    </>
  );
};
