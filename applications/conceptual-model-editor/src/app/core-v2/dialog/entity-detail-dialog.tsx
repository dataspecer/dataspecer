import {
    isSemanticModelRelationship,
    SemanticModelGeneralization,
    type SemanticModelClass,
    type SemanticModelRelationship,
    isSemanticModelGeneralization,
    isSemanticModelAttribute,
    SemanticModelRelationshipEnd,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { useRef, useEffect, useState } from "react";
import { cardinalityToString, isAttribute } from "../util/utils";
import { useClassesContext } from "../context/classes-context";
import {
    getLanguagesForNamedThing,
    getLocalizedStringFromLanguageString,
    getStringFromLanguageStringInLang,
} from "../util/language-utils";
import { IriLink } from "../catalog/entity-catalog-row";
import {
    isSemanticModelClassUsage,
    isSemanticModelRelationshipUsage,
    SemanticModelClassUsage,
    SemanticModelRelationshipUsage,
} from "@dataspecer/core-v2/semantic-model/usage/concepts";
import { useBaseDialog } from "./base-dialog";
import { getIri, getModelIri } from "../util/model-utils";
import { useConfigurationContext } from "../context/configuration-context";
import { useModelGraphContext } from "../context/model-context";
import { getDomainAndRange } from "@dataspecer/core-v2/semantic-model/relationship-utils";
import { getDescriptionLanguageString, getNameLanguageString, getUsageNoteLanguageString } from "../util/name-utils";

type SupportedEntityType =
    | SemanticModelClass
    | SemanticModelRelationship
    | SemanticModelClassUsage
    | SemanticModelRelationshipUsage
    | SemanticModelGeneralization;

export const useEntityDetailDialog = () => {
    const { isOpen, open, close, BaseDialog } = useBaseDialog();
    const editDialogRef = useRef(null as unknown as HTMLDialogElement);
    const [viewedEntity, setViewedEntity] = useState(null as unknown as SupportedEntityType);

    useEffect(() => {
        const { current: el } = editDialogRef;
        if (isOpen && el !== null) el.showModal();
    }, [isOpen]);

    const localClose = () => {
        setViewedEntity(null as unknown as SupportedEntityType);
        close();
    };
    const localOpen = (entity: SupportedEntityType) => {
        setViewedEntity(entity);
        open();
    };
    const save = () => {
        close();
    };

    const EntityDetailDialog = () => {
        const { language: preferredLanguage } = useConfigurationContext();
        const [currentLang, setCurrentLang] = useState(preferredLanguage);

        const langs = isSemanticModelGeneralization(viewedEntity) ? [] : getLanguagesForNamedThing(viewedEntity);

        const {
            classes2: c,
            relationships: r,
            /* attributes: a, */ profiles,
            sourceModelOfEntityMap,
        } = useClassesContext();
        const { models } = useModelGraphContext();
        const sourceModelId = sourceModelOfEntityMap.get(viewedEntity.id);
        const sourceModel = models.get(sourceModelId ?? "");

        let modelIri: null | string = getModelIri(sourceModel),
            profileOf: null | string = null,
            profiledBy: string[] = [];

        const name = getLocalizedStringFromLanguageString(getNameLanguageString(viewedEntity), currentLang);
        const description = getLocalizedStringFromLanguageString(
            getDescriptionLanguageString(viewedEntity),
            currentLang
        );
        const usageNote = getLocalizedStringFromLanguageString(getUsageNoteLanguageString(viewedEntity), currentLang);
        const iri = getIri(viewedEntity);

        if (isSemanticModelClassUsage(viewedEntity)) {
            profileOf = viewedEntity.usageOf;
        } else if (isSemanticModelRelationshipUsage(viewedEntity)) {
            const domain = viewedEntity.ends.at(1); // TODO: make it work for attributes that are profiles
            profileOf = viewedEntity.usageOf;
        }

        const attributes = /* a */ r
            .filter(isSemanticModelAttribute)
            .filter((v) => v.ends.at(0)?.concept == viewedEntity.id);
        const attributeProfiles = profiles
            .filter(isSemanticModelRelationshipUsage)
            .filter(isAttribute)
            .filter((v) => v.ends.at(0)?.concept == viewedEntity.id);

        profiledBy = profiles.filter((p) => p.usageOf == viewedEntity.id).map((p) => p.id);

        let ends: { domain: SemanticModelRelationshipEnd; range: SemanticModelRelationshipEnd } | null = null;
        if (isSemanticModelRelationship(viewedEntity)) {
            ends = getDomainAndRange(viewedEntity);
        } else if (isSemanticModelRelationshipUsage(viewedEntity)) {
            ends = {
                range: { ...viewedEntity.ends[0]!, iri: null } as SemanticModelRelationshipEnd,
                domain: { ...viewedEntity.ends[1], iri: null } as SemanticModelRelationshipEnd,
            };
        }

        const range =
            c.find((cls) => cls.id == ends?.range.concept) ?? profiles.find((v) => v.id == ends?.range?.concept);
        const rangeCardinality = cardinalityToString(ends?.range?.cardinality);
        const rangeIri = getIri(range ?? null) ?? ends?.range?.concept;
        const domain =
            c.find((cls) => cls.id == ends?.domain?.concept) ?? profiles.find((v) => v.id == ends?.domain?.concept);
        const domainCardinality = cardinalityToString(ends?.domain?.cardinality);
        const domainIri = getIri(domain ?? null) ?? ends?.domain.concept;

        console.log(viewedEntity, ends);

        return (
            <BaseDialog
                heading={`${
                    viewedEntity.type[0].charAt(0).toUpperCase() +
                    viewedEntity.type[0].slice(1).replace("-", " ").replace("usage", "profile")
                } detail`}
            >
                <div className="bg-slate-100">
                    <h5>
                        Detail of: <span className="font-semibold">{name}</span>
                    </h5>
                    <div className="grid grid-cols-[80%_20%] grid-rows-1">
                        <p className="flex flex-row text-gray-500" title={iri ?? ""}>
                            <IriLink iri={modelIri + iri} />
                            {modelIri + iri}
                        </p>

                        <div>
                            lang:
                            <select
                                name="langs"
                                id="langs"
                                onChange={(e) => setCurrentLang(e.target.value)}
                                defaultValue={currentLang}
                            >
                                {langs.map((lang) => (
                                    <option value={lang}>{lang}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            {profileOf && <div className="flex flex-row text-gray-500">profile of: {profileOf}</div>}
                            {profiledBy.length > 0 && (
                                <div className="flex flex-row text-gray-500">profiled by: {profiledBy.join(", ")}</div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-[20%_80%] gap-y-3 bg-slate-100">
                    <div className="font-semibold">type:</div>
                    <div>
                        {viewedEntity.type}
                        {isSemanticModelAttribute(viewedEntity) ||
                        (isSemanticModelRelationshipUsage(viewedEntity) && isAttribute(viewedEntity))
                            ? " (attribute)"
                            : ""}
                    </div>
                    <div className="font-semibold">description:</div>
                    <div> {description}</div>
                    {attributes.length > 0 && (
                        <>
                            <div className="font-semibold">attributes:</div>
                            <div>
                                {attributes.map((v) => {
                                    const name = getLocalizedStringFromLanguageString(
                                        getNameLanguageString(v),
                                        preferredLanguage
                                    );
                                    const descr = getLocalizedStringFromLanguageString(
                                        getDescriptionLanguageString(v),
                                        preferredLanguage
                                    );

                                    return <div title={descr ?? ""}>{name}</div>;
                                })}
                            </div>
                        </>
                    )}

                    {attributeProfiles.length > 0 && (
                        <>
                            <div className="font-semibold">attribute profiles:</div>
                            <div>
                                {attributeProfiles.map((v) => {
                                    const name = getLocalizedStringFromLanguageString(
                                        getNameLanguageString(v),
                                        preferredLanguage
                                    );
                                    const descr = getLocalizedStringFromLanguageString(
                                        getDescriptionLanguageString(v),
                                        preferredLanguage
                                    );
                                    const usageNote = getLocalizedStringFromLanguageString(
                                        getUsageNoteLanguageString(v),
                                        preferredLanguage
                                    );

                                    return (
                                        <div title={descr ?? ""}>
                                            {name}
                                            {usageNote && (
                                                <span className="ml-2 bg-blue-200" title={usageNote}>
                                                    usage note
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                    {usageNote && (
                        <>
                            <div className="font-semibold">usage note:</div>
                            <div>{usageNote}</div>
                        </>
                    )}
                    {range && (
                        <>
                            <div className="font-semibold">range: </div>

                            <div>
                                {getStringFromLanguageStringInLang(range.name ?? {}, currentLang)[0] ??
                                    rangeIri ??
                                    range.id ??
                                    ends?.range.concept}
                                :{rangeCardinality}
                            </div>
                        </>
                    )}
                    {domain && (
                        <>
                            <div className="font-semibold">domain: </div>
                            <div>
                                {getStringFromLanguageStringInLang(domain.name ?? {}, currentLang) ??
                                    domainIri ??
                                    domain.id}
                                :{domainCardinality}
                            </div>
                        </>
                    )}
                </div>
                <p className="bg-slate-100">
                    range: {range ? "present" : "null"}, domain: {domain ? "present" : "null"},
                </p>
                <div className="flex flex-row justify-evenly">
                    <button onClick={save}>confirm</button>
                    <button onClick={close}>close</button>
                </div>
            </BaseDialog>
        );
    };

    return {
        isEntityDetailDialogOpen: isOpen,
        closeEntityDetailDialog: localClose,
        openEntityDetailDialog: localOpen,
        EntityDetailDialog,
    };
};
