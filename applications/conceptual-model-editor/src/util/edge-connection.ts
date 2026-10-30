import type { SemanticModelRelationshipEnd } from "@dataspecer/core-v2/semantic-model/concepts";
import type { LanguageString } from "../dataspecer/entity-model";

export type ConnectionType =
    AssociationConnectionType | GeneralizationConnectionType;

type AssociationConnectionType = {
    type: "association";
    ends: SemanticModelRelationshipEnd[];
    name: LanguageString;
    description: LanguageString;
    iri: string | null;
};

type GeneralizationConnectionType = {
    type: "generalization";
    child: string;
    parent: string;
    iri: string | null;
};
