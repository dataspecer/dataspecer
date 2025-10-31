import { LdkitSchema, LdkitSchemaProperty, LdkitSchemaPropertyMap } from "./ldkit-schema-model.ts";
import { StructureModelProperty } from "@dataspecer/core/structure-model/model/structure-model-property";
import { StructureModelComplexType, StructureModelPrimitiveType } from "@dataspecer/core/structure-model/model/structure-model-type";
import { assert } from "@dataspecer/core/core";
import { StructureModel } from "@dataspecer/core/structure-model/model/structure-model";
import { StructureModelClass } from "@dataspecer/core/structure-model/model/structure-model-class";
import { OFN } from "@dataspecer/core/well-known"

export interface StructureClassToSchemaAdapter {
    convertStructureModelToLdkitSchema(modelClass: StructureModel): LdkitSchema;
}

export class LdkitSchemaAdapter implements StructureClassToSchemaAdapter {

    convertAttributeDataTypeToLdkitSupportedDataType<T>(dataTypeIri: string): keyof T {
        const map: { [k: string]: any } = {
            [OFN.boolean]: "xsd.boolean",
            [OFN.date]: "xsd.date",
            [OFN.dateTime]: "xsd.dateTime",
            [OFN.integer]: "xsd.integer",
            [OFN.decimal]: "xsd.decimal",
            [OFN.url]: "xsd.anyURI",
            [OFN.string]: "xsd.string",
            [OFN.text]:  "rdf.langString",
            [OFN.rdfLangString]: "rdf.langString"
        }

        return map[dataTypeIri] ?? "xsd.string";
    }

    convertAttributePropertyToLdkitProperty(attribute: StructureModelPrimitiveType, ldkitProperty: LdkitSchemaProperty): LdkitSchemaProperty {

        if (!attribute || !attribute.dataType) {
            // return without any change
            return ldkitProperty;
        }

        if (attribute.dataType === OFN.rdfLangString) {
            ldkitProperty["@multilang"] = true;
        }
        //ldkitProperty["@type"] = this.convertAttributeDataTypeToLdkitSupportedDataType(attribute.dataType);
        return ldkitProperty;
    }

    convertAssociationPropertyToLdkitProperty(association: StructureModelComplexType, ldkitProperty: LdkitSchemaProperty): LdkitSchemaProperty {
        if (!association || !association.dataType) {
            return ldkitProperty;
        }

        const nestedClass: StructureModelClass = association.dataType;
        //ldkitProperty["@type"] = xsd.string; //this.convertDataTypeToLdkitSupportedDataType(association); //nestedClass.cimIri;
        ldkitProperty["@context"] = this.convertStructureModelClassToLdkitSchema(nestedClass);

        return ldkitProperty;
    }

    setCardinalityRelatedProperties(cardMin: number | null, cardMax: number | null, property: LdkitSchemaProperty): void {

        if (!cardMax || !cardMin) {
            // cardMax is null == no upper bound == array expected
            property["@array"] = true;
            property["@optional"] = true;
            return;
        }

        if (cardMax < cardMin) {
            throw new Error("Invalid cardinality on property");
        }

        if (cardMin === 0) {
            property["@optional"] = true;
            return;
        }

        if (cardMax > 1) {
            property["@array"] = true;
        }
    }

    // TODO: generate property based on dataTypes - rewrite
    convertClassPropertyToLdkitProperty(classProperty: StructureModelProperty): string | LdkitSchemaProperty | readonly string[] {

        if (!classProperty.cimIri) {
            throw new Error("Missing class property conceptual IRI");
        }

        let ldkitProperty: LdkitSchemaProperty = {
            "@id": classProperty.cimIri,
        }

        if (!classProperty?.dataTypes || classProperty.dataTypes.length === 0) {
            throw new Error(`Property does not have a datatype.`);
        }

        this.setCardinalityRelatedProperties(classProperty.cardinalityMin, classProperty.cardinalityMax, ldkitProperty);

        classProperty.dataTypes.map(dataType => {
            if (dataType.isAttribute()) {
                ldkitProperty = this.convertAttributePropertyToLdkitProperty(dataType, ldkitProperty);
                return;
            }

            if (dataType.isAssociation()) {
                ldkitProperty = this.convertAssociationPropertyToLdkitProperty(dataType, ldkitProperty);
                return;
            }
        });

        return Object.keys(ldkitProperty).length === 1
            ? classProperty.cimIri
            : ldkitProperty;
    }

    convertClassPropertiesToSchema(classProperties: StructureModelProperty[]): LdkitSchemaPropertyMap {

        const propertyMap: LdkitSchemaPropertyMap = {};

        classProperties.map(classProperty => {
            const propertyName: string = classProperty.technicalLabel!;
            propertyMap[propertyName] = this.convertClassPropertyToLdkitProperty(classProperty);
        });

        return propertyMap;
    }

    convertStructureModelClassToLdkitSchema(modelClass: StructureModelClass): LdkitSchema {
        const propertyMap: LdkitSchemaPropertyMap = this.convertClassPropertiesToSchema(modelClass.properties);

        if (!modelClass.cimIri) {
            throw new Error("Conceptual type of class is mandatory");
        }

        const result: LdkitSchema = {
            "@type": modelClass.cimIri,
            ...propertyMap
        };

        return result;
    }

    convertStructureModelToLdkitSchema(model: StructureModel): LdkitSchema {

        assert(model.roots.length === 1, "Exactly one root class must be provided.");

        if (model.roots[0]!.classes.length !== 1) {
            throw new Error("Root classes number other than 1 is not supported yet");
        }

        const root: StructureModelClass = model.roots[0]!.classes[0]!;

        return this.convertStructureModelClassToLdkitSchema(root);
    }
}