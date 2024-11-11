import { useState } from "react";

import type {
    LanguageString,
    SemanticModelClass,
    SemanticModelRelationshipEnd,
} from "@dataspecer/core-v2/semantic-model/concepts";

import { ModelGraphContextType } from "../../context/model-context";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { MultiLanguageInputForLanguageString } from "../../components/input/multi-language-input-4-language-string";
import { getRandomName } from "../../util/random-gen";
import { IriInput } from "../../components/input/iri-input";
import { getModelIri } from "../../util/iri-utils";
import { CardinalityOptions } from "../../components/cardinality-options";
import { DialogDetailRow } from "../../components/dialog/dialog-detail-row";
import { DialogColoredModelHeaderWithModelSelector } from "../../components/dialog/dialog-colored-model-header";
import { getEntityLabel } from "../../service/entity-service";
import { t, configuration } from "../../application";
import { DialogProps, DialogWrapper } from "../dialog-api";
import { SemanticModelClassUsage } from "@dataspecer/core-v2/semantic-model/usage/concepts";
import { filterInMemoryModels } from "../../util/model-utils";
import { findSourceModelOfEntity } from "../../service/model-service";


export enum ConnectionType {
    Association,
    Generalization,
};

export interface CreateConnectionState {

    source: SemanticModelClass | SemanticModelClassUsage;

    target: SemanticModelClass | SemanticModelClassUsage;

    language: string;

    //

    type: ConnectionType;

    iri: string;

    name: LanguageString;

    description: LanguageString;

    sourceCardinality: [number, number | null] | null;

    targetCardinality: [number, number | null] | null;

    //

    model: InMemorySemanticModel;

    models: InMemorySemanticModel[];

}

/**
 * We store this using just plan JavaScript. The value
 * determined default connection type on open.
 */
let nextOpenConnectionType = ConnectionType.Association;

export const createConnectionDialog = (
    graph: ModelGraphContextType,
    source: SemanticModelClass | SemanticModelClassUsage,
    target: SemanticModelClass | SemanticModelClassUsage,
    language: string,
    onConfirm: (state: CreateConnectionState) => void,
): DialogWrapper<CreateConnectionState> => {
    return {
        label: "create-connection-dialog.label",
        component: CreateConnectionDialog,
        state: createCreateProfileState(graph, source, target, language),
        confirmLabel: "create-connection-dialog.btn-ok",
        cancelLabel: "create-connection-dialog.btn-close",
        validate: null,
        onConfirm: (state) => {
            nextOpenConnectionType = state.type;
            onConfirm(state);
        },
        onClose: null,
    };
}

function createCreateProfileState(
    graph: ModelGraphContextType,
    source: SemanticModelClass | SemanticModelClassUsage,
    target: SemanticModelClass | SemanticModelClassUsage,
    language: string,
): CreateConnectionState {
    const models = filterInMemoryModels([...graph.models.values()]);
    const owner = findSourceModelOfEntity(source.id, graph.models);
    // Check we have an owner as a semantic model we can write to.
    let model;
    if (owner === null || !(owner instanceof InMemorySemanticModel)) {
        model = models[0];
    } else {
        model = owner;
    }

    return {
        source,
        target,
        language,
        //
        type: nextOpenConnectionType,
        iri: getRandomName(7),
        name: {},
        description: {},
        sourceCardinality: null,
        targetCardinality: null,
        model,
        models,
    };
}

const CreateConnectionDialog = (props: DialogProps<CreateConnectionState>) => {
    const language = props.state.language;

    const setType = (next: ConnectionType) => props.changeState(prev => ({ ...prev, type: next }));
    const setActiveModel = (id: string) => {
        for (const model of props.state.models) {
            if (model.getId() !== id) {
                continue;
            }
            props.changeState(prev => ({ ...prev, model }));
            return;
        }
    };

    return (
        <>
            <div>
                <div className="grid grid-cols-1 bg-slate-100 px-1 md:grid-cols-[25%_75%] md:pl-8 md:pr-16 py-2">
                    <DialogDetailRow detailKey={t("create-connection-dialog.type")}>
                        <TypeSwitch value={props.state.type} onChange={setType} />
                    </DialogDetailRow>
                </div>

                <DialogColoredModelHeaderWithModelSelector
                    style={"grid grid-cols-1 px-1 md:grid-cols-[25%_75%] bg-slate-100 md:pb-4 md:pl-8 md:pr-16 md:pt-2"}
                    activeModel={props.state.model.getId()}
                    onModelSelected={(m) => setActiveModel(m)}
                />

                <div className="grid grid-cols-1 bg-slate-100 px-1 md:grid-cols-[25%_75%] md:pl-8 md:pr-16 gap-y-2">
                    <DialogDetailRow detailKey={t("create-connection-dialog.source")}>
                        <span>
                            {getEntityLabel(props.state.source, language)}
                        </span>
                    </DialogDetailRow>
                    <DialogDetailRow detailKey={t("create-connection-dialog.target")}>
                        <span>
                            {getEntityLabel(props.state.target, language)}
                        </span>
                    </DialogDetailRow>
                </div>

                <div
                    className={"grid grid-cols-1 bg-slate-100 px-1 md:grid-cols-[25%_75%] md:pl-8 md:pr-16 "}
                >
                    <AssociationSection {...props} />
                </div>
            </div>
        </>
    );
};


/**
 * Switch between association and generalization.
 */
const TypeSwitch = (props: {
    value: ConnectionType;
    onChange: (value: ConnectionType) => void;
    disabled?: boolean;
}) => {
    const { value, onChange, disabled } = props;
    const isAssociation = value === ConnectionType.Association;
    const isGeneralization = !isAssociation;

    return (
        <div>
            <button
                className={isAssociation ? "font-bold text-blue-800" : ""}
                disabled={disabled || isAssociation}
                onClick={() => onChange(ConnectionType.Association)}
            >
                Relationship
            </button>
            <span className="mx-2">|</span>
            <button
                className={isGeneralization ? "font-bold text-blue-800" : ""}
                disabled={disabled || isGeneralization}
                onClick={() => onChange(ConnectionType.Generalization)}
            >
                Generalization
            </button>
        </div>
    );
};

/**
 * Contains fields relevant for association.
 */
const AssociationSection = (props: DialogProps<CreateConnectionState>) => {

    const [iriHasChanged, setIriHasChanged] = useState(false);

    if (props.state.type !== ConnectionType.Association) {
        // We render nothing.
        return null;
    }

    const language = props.state.language;
    const baseIri = getModelIri(props.state.model);
    const setIri = (next: string) =>
        props.changeState(prev => ({ ...prev, iri: next }));
    const setName = (setter: (prev: LanguageString) => LanguageString) =>
        props.changeState(prev => ({ ...prev, name: setter(prev.name) }));
    const setDescription = (setter: (prev: LanguageString) => LanguageString) =>
        props.changeState(prev => ({ ...prev, description: setter(prev.description) }));
    const setSource = (setter: (value: SemanticModelRelationshipEnd) => SemanticModelRelationshipEnd) => {
        const sourceCardinality = setter({} as SemanticModelRelationshipEnd).cardinality ?? null;
        props.changeState(prev => ({ ...prev, sourceCardinality }));
    };
    const setTarget = (setter: (value: SemanticModelRelationshipEnd) => SemanticModelRelationshipEnd) => {
        const targetCardinality = setter({} as SemanticModelRelationshipEnd).cardinality ?? null;
        props.changeState(prev => ({ ...prev, targetCardinality }));
    };

    return (
        <>
            <DialogDetailRow detailKey={t("create-connection-dialog.name")}>
                <MultiLanguageInputForLanguageString
                    ls={props.state.name}
                    setLs={setName}
                    inputType="text"
                    defaultLang={language}
                />
            </DialogDetailRow>
            <DialogDetailRow detailKey={t("create-connection-dialog.iri")}>
                <IriInput
                    name={props.state.name}
                    newIri={props.state.iri}
                    setNewIri={(i) => setIri(i)}
                    iriHasChanged={iriHasChanged}
                    onChange={() => setIriHasChanged(true)}
                    baseIri={baseIri}
                    nameSuggestion={configuration().nameToIri}
                />
            </DialogDetailRow>
            <DialogDetailRow detailKey={t("create-connection-dialog.description")}>
                <MultiLanguageInputForLanguageString
                    ls={props.state.description}
                    setLs={setDescription}
                    inputType="textarea"
                    defaultLang={language}
                />
            </DialogDetailRow>

            {/* We hide cardinality for associations. */}
            {configuration().hideRelationCardinality ? null :
                <DialogDetailRow detailKey={t("create-connection-dialog.cardinality")}>
                    <div>
                        <div>
                            {t("create-connection-dialog.source")}:
                            <CardinalityOptions
                                group="source"
                                setCardinality={setSource}
                                disabled={false}
                            />
                        </div>
                        <div>
                            {t("create-connection-dialog.target")}:
                            <CardinalityOptions
                                group="target"
                                setCardinality={setTarget}
                                disabled={false}
                            />
                        </div>
                    </div>
                </DialogDetailRow>
            }
        </>
    );
};
