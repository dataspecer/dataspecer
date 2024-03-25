import {
    SemanticModelClass,
    SemanticModelGeneralization,
    SemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import {
    createGeneralization,
    createRelationship,
    deleteEntity,
    modifyRelation,
} from "@dataspecer/core-v2/semantic-model/operations";
import React, { useContext } from "react";
import { AssociationConnectionType, ConnectionType, GeneralizationConnectionType } from "../util/edge-connection";
import { LOCAL_MODEL_ID } from "../util/constants";
import type {
    SemanticModelClassUsage,
    SemanticModelRelationshipUsage,
} from "@dataspecer/core-v2/semantic-model/usage/concepts";
import { modifyRelationshipUsage } from "@dataspecer/core-v2/semantic-model/usage/operations";

export type ClassesContextType = {
    classes: Map<string, SemanticModelClassWithOrigin>; // was an array, [classId, classWithOrigin]
    setClasses: React.Dispatch<React.SetStateAction<Map<string, SemanticModelClassWithOrigin>>>;
    classes2: SemanticModelClass[]; // was an array, [classId, classWithOrigin]
    setClasses2: React.Dispatch<React.SetStateAction<SemanticModelClass[]>>;
    allowedClasses: string[];
    setAllowedClasses: React.Dispatch<React.SetStateAction<string[]>>;
    relationships: SemanticModelRelationship[];
    setRelationships: React.Dispatch<React.SetStateAction<SemanticModelRelationship[]>>;
    attributes: SemanticModelRelationship[]; // Map<string, SemanticModelRelationship[]>;
    setAttributes: React.Dispatch<React.SetStateAction<SemanticModelRelationship[]>>; // React.Dispatch<React.SetStateAction<Map<string, SemanticModelRelationship[]>>>;
    generalizations: SemanticModelGeneralization[];
    setGeneralizations: React.Dispatch<React.SetStateAction<SemanticModelGeneralization[]>>;
    profiles: (SemanticModelClassUsage | SemanticModelRelationshipUsage)[];
    setProfiles: React.Dispatch<React.SetStateAction<(SemanticModelClassUsage | SemanticModelRelationshipUsage)[]>>;
    sourceModelOfEntityMap: Map<string, string>; // was an array, [classId, classWithOrigin]
    setSourceModelOfEntityMap: React.Dispatch<React.SetStateAction<Map<string, string>>>;
};

export type SemanticModelClassWithOrigin = {
    cls: SemanticModelClass;
    origin: string; // modelId
};

export const ClassesContext = React.createContext(null as unknown as ClassesContextType);

export const useClassesContext = () => {
    const {
        classes,
        setClasses,
        classes2,
        setClasses2,
        allowedClasses,
        setAllowedClasses,
        relationships,
        setRelationships,
        attributes,
        setAttributes,
        generalizations,
        setGeneralizations,
        profiles,
        setProfiles,
        sourceModelOfEntityMap,
        setSourceModelOfEntityMap,
    } = useContext(ClassesContext);

    const createConnection = (model: InMemorySemanticModel, connection: ConnectionType) => {
        if (!model || !(model instanceof InMemorySemanticModel)) {
            alert(`local model [${LOCAL_MODEL_ID}] not found or is not of type InMemoryLocal`);
            return;
        }
        if (connection.type == "association") {
            const conn = connection as AssociationConnectionType;
            const result = model.executeOperation(createRelationship({ ...conn }));
            return result.success;
        } else if (connection.type == "generalization") {
            const conn = connection as GeneralizationConnectionType;
            const result = model.executeOperation(createGeneralization({ ...conn }));
            return result.success;
        } else {
            alert(`classes-context: create-connection: unknown type ${connection}`);
            return false;
        }
    };

    const addAttribute = (model: InMemorySemanticModel, attr: Partial<Omit<SemanticModelRelationship, "type">>) => {
        if (!model || !(model instanceof InMemorySemanticModel)) {
            alert(`local model [${LOCAL_MODEL_ID}] not found or is not of type InMemoryLocal`);
            return;
        }

        const result = model.executeOperation(createRelationship(attr));
        return result.success;
    };

    const updateAttribute = (
        model: InMemorySemanticModel,
        attributeId: string,
        updatedAttribute: Partial<Omit<SemanticModelRelationship, "type" | "id">>
    ) => {
        const result = model.executeOperation(modifyRelation(attributeId, updatedAttribute));
        return result.success;
    };

    const updateAttributeUsage = (
        model: InMemorySemanticModel,
        attributeId: string,
        updatedAttribute: Partial<Omit<SemanticModelRelationshipUsage, "type" | "id">>
    ) => {
        const result = model.executeOperation(modifyRelationshipUsage(attributeId, updatedAttribute));
        return result.success;
    };

    const deleteEntityFromModel = (model: InMemorySemanticModel, entityId: string) => {
        const result = model.executeOperation(deleteEntity(entityId));
        console.log(result, model, entityId);
        return result.success;
    };

    return {
        classes,
        setClasses,
        classes2,
        setClasses2,
        allowedClasses,
        setAllowedClasses,
        relationships,
        setRelationships,
        attributes,
        setAttributes,
        generalizations,
        setGeneralizations,
        createConnection,
        addAttribute,
        updateAttribute,
        updateAttributeUsage,
        deleteEntityFromModel,
        profiles,
        setProfiles,
        sourceModelOfEntityMap,
        setSourceModelOfEntityMap,
    };
};
