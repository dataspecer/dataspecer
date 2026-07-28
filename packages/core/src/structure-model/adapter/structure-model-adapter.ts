// @ts-ignore
import { ExtendedSemanticModelRelationship, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import {CoreResourceReader} from "../../core/index.ts";
import {DataPsmAssociationEnd, DataPsmAttribute, DataPsmClass, DataPsmClassReference, DataPsmContainer, DataPsmExternalRoot, DataPsmInclude, DataPsmOr, DataPsmSchema,} from "../../data-psm/model/index.ts";
import {StructureModel, StructureModelClass, StructureModelComplexType, StructureModelPrimitiveType, StructureModelProperty, StructureModelSchemaRoot} from "../model/index.ts";
// @ts-ignore
import { Entity } from "@dataspecer/core-v2";
import { DataPsmXmlPropertyExtension } from "../../data-psm/xml-extension/model/index.ts";
import { DataPsmJsonPropertyExtension } from "../../data-psm/json-extension/model/index.ts";

/**
 * Adapter that converts given schema from PIM and Data PSM models to Structure
 * Model.
 */
class StructureModelAdapter {
  private readonly reader: CoreResourceReader;

  private readonly classes: { [iri: string]: StructureModelClass };

  private psmSchemaIri: string;

  constructor(
    reader: CoreResourceReader,
    classes: { [iri: string]: StructureModelClass } | null = null,
    psmSchemaIri: string | null = null
  ) {
    this.reader = reader;
    this.classes = classes ?? {};
    this.psmSchemaIri = psmSchemaIri;
  }

  load(psmSchemaIri: string): StructureModel | null {
    this.psmSchemaIri = psmSchemaIri;
    const psmSchema = this.reader.readResource(psmSchemaIri);
    if (!DataPsmSchema.is(psmSchema)) {
      return null;
    }
    const roots: StructureModelSchemaRoot[] = [];
    for (const iri of psmSchema.dataPsmRoots) {
      roots.push(this.loadRoot(iri, psmSchemaIri));
    }

    const model = new StructureModel();
    model.psmIri = psmSchema.iri;
    model.humanLabel = psmSchema.dataPsmHumanLabel;
    model.humanDescription = psmSchema.dataPsmHumanDescription;
    model.technicalLabel = psmSchema.dataPsmTechnicalLabel;
    model.jsonLdDefinedPrefixes = psmSchema.jsonLdDefinedPrefixes ?? {};
    model.jsonLdTypeMapping = psmSchema.jsonLdDefinedTypeMapping ?? {};
    model.roots = roots;
    model.profiling = psmSchema.profiling ?? [];

    return model;
  }

  loadRoot(iri: string, schemaIri: string): StructureModelSchemaRoot {
    const schema = this.reader.readResource(schemaIri) as DataPsmSchema;
    const entity = this.reader.readResource(iri);
    const root = new StructureModelSchemaRoot();
    root.psmIri = entity.iri;
    /**
     * ! This is a workaround as PSMv1 does not have a concept of a root.
     *
     * Therefore the technical label of the schema is used as a technical label
     * of root. The root in this case is an "association". Many formats wont use
     * it. For example JSON expects object at the root, but XML requires
     * wrapping everything in a root element, which is basically the association.
     */
    root.technicalLabel = schema.dataPsmTechnicalLabel ?? null;
    root.collectionTechnicalLabel = schema.dataPsmCollectionTechnicalLabel ?? null;
    root.enforceCollection = schema.dataPsmEnforceCollection ?? false;
    // Default cardinality is 1..1
    root.cardinalityMin = schema.dataPsmCardinality ? schema.dataPsmCardinality[0] : 1;
    root.cardinalityMax = schema.dataPsmCardinality ? schema.dataPsmCardinality[1] : 1;
    root.enforceJsonLdContext = schema.jsonEnforceContext ?? "no";
    if (DataPsmOr.is(entity)) {
      for (const choiceIri of entity.dataPsmChoices) {
        const choice = this.reader.readResource(choiceIri);
        if (DataPsmClass.is(choice)) {
          root.classes.push(this.loadClass(choice));
          root.orTechnicalLabel = entity.dataPsmTechnicalLabel ?? root.technicalLabel;
          root.isInOr = true;
        } else if (DataPsmClassReference.is(choice)) {
          root.classes.push(this.loadClassReference(choice)[0][0]);
          root.orTechnicalLabel = entity.dataPsmTechnicalLabel ?? root.technicalLabel;
          root.isInOr = true;
        } else {
          throw new Error(`Unsupported PSM entity '${iri}' in DataPsmOr.`);
        }
      }
    } else if (DataPsmClass.is(entity)) {
      root.classes.push(this.loadClass(entity));
    } else if (DataPsmExternalRoot.is(entity)) {
      root.classes.push(this.loadExternalRoot(entity));
    } else {
      throw new Error(`Unsupported PSM root entity '${iri}'.`);
    }

    return root;
  }

  private loadClass(
    classData: DataPsmClass | DataPsmContainer
  ): StructureModelClass {
    // There can be a cycle in extends or properties, so we keep track
    // of what has already been loaded.
    let model = this.classes[classData.iri];
    if (model) {
      return model;
    }
    model = new StructureModelClass();
    if (DataPsmClass.is(classData)) {
      model.jsonLdDefinedPrefixes = classData.jsonLdDefinedPrefixes ?? {};
      model.jsonLdTypeMapping = classData.jsonLdDefinedTypeMapping ?? {};
    }
    if (DataPsmContainer.is(classData)) {
      model.containerType = classData.dataPsmContainerType as "choice" | "sequence";
    } else {
      model.containerType = null;
    }
    this.classes[classData.iri] = model;
    //
    this.psmClassToModel(classData, model);
    // When loading extends we may end up in another specification,
    // to deal with that we may need to change here.
    if (DataPsmClass.is(classData)) {
      for (const iri of classData?.dataPsmExtends) {
        const part = this.reader.readResource(iri);
        if (DataPsmClass.is(part)) {
          model.extends.push(this.loadClass(part));
        } else if (DataPsmClassReference.is(part)) {
          const [types] = this.loadClassReference(part);
          model.extends.push(...types);
        } else {
          throw new Error(`Unsupported PSM class extends entity '${iri}'.`);
        }
      }
    }
    for (const iri of classData.dataPsmParts) {
      const part = this.reader.readResource(iri);
      if (DataPsmAssociationEnd.is(part)) {
        model.properties.push(this.loadAssociationEnd(part));
      } else if (DataPsmAttribute.is(part)) {
        model.properties.push(this.loadAttribute(part));
      } else if (DataPsmInclude.is(part)) {
        // Include is represented as extension
        const includedClass = this.reader.readResource(part.dataPsmIncludes);
        if (DataPsmClass.is(includedClass)) {
          model.extends.push(this.loadClass(includedClass));
        } else if (DataPsmClassReference.is(includedClass)) {
          model.extends.push(...this.loadClassReference(includedClass)[0]);
        } else {
          throw new Error(`Unsupported PSM included entity '${iri}'.`);
        }
      } else if (DataPsmContainer.is(part)) {
        model.properties.push(this.loadContainer(part));
      } else {
        throw new Error(`Unsupported PSM class member entity '${iri}'.`);
      }
    }
    return model;
  }

  private psmClassToModel(classData: DataPsmClass | DataPsmContainer, model: StructureModelClass) {
    model.psmIri = classData.iri;
    model.pimIri = classData.dataPsmInterpretation;
    model.humanLabel = classData.dataPsmHumanLabel;
    model.humanDescription = classData.dataPsmHumanDescription;
    model.technicalLabel = classData.dataPsmTechnicalLabel;
    model.structureSchema = this.psmSchemaIri;
    model.profiling = classData.profiling ?? [];
    if (DataPsmClass.is(classData)) {
      model.emptyAsComplex = classData.dataPsmEmptyAsComplex === true;
      model.isClosed = classData.dataPsmIsClosed;
      model.instancesHaveIdentity = classData.instancesHaveIdentity;
      model.instancesSpecifyTypes = classData.instancesSpecifyTypes;
      model.jsonSchemaPrefixesInIriRegex = classData.jsonSchemaPrefixesInIriRegex ?? {
        usePrefixes: "ALWAYS",
        includeParentPrefixes: true,
      };
    }
  }

  private loadClassReference(
    classReferenceData: DataPsmClassReference
  ): [StructureModelClass[], string | null | undefined] {
    const part = this.reader.readResource(
      classReferenceData.dataPsmClass
    );
    // We are going to load another schema.
    const adapter = new StructureModelAdapter(
      this.reader,
      this.classes,
      classReferenceData.dataPsmSpecification
    );
    // This has side effect of correctly loading full specification
    const specification = adapter.load(classReferenceData.dataPsmSpecification);
    if (DataPsmClass.is(part)) {
      const model = adapter.loadClass(part);
      const copiedModel = Object.assign(Object.create(Object.getPrototypeOf(model)), model);
      copiedModel.isReferenced = true;
      return [[copiedModel], undefined];
    } else if (DataPsmExternalRoot.is(part)) {
      const model = adapter.loadExternalRoot(part);
      const copiedModel = Object.assign(Object.create(Object.getPrototypeOf(model)), model);
      copiedModel.isReferenced = true;
      return [[copiedModel], undefined];
    } else if (DataPsmOr.is(part)) { // todo this needs to be fixed
      const references = [];
      for (const p of part.dataPsmChoices) {
        const orPart = this.reader.readResource(p) as DataPsmClass | DataPsmClassReference;
        const model = DataPsmClass.is(orPart) ? adapter.loadClass(orPart) : adapter.loadClassReference(orPart)[0][0];
        const copiedModel = Object.assign(Object.create(Object.getPrototypeOf(model)), model);
        copiedModel.isReferenced = true;
        references.push(copiedModel);
      }
      return [references, part.dataPsmTechnicalLabel ?? specification.roots[0].orTechnicalLabel];
    } else {
      throw new Error(
        `Invalid class reference '${classReferenceData.iri}' target.`
      );
    }
  }

  /**
   * Due to bad design of the structure model, the second element of the tuple
   * contains technical label of the OR. If there is no OR, the value is undefined.
   * If the OR is unnamed, the value is null.
   */
  private loadComplexType(
    complexTypeData: DataPsmClass | DataPsmClassReference | DataPsmContainer
  ): [StructureModelComplexType[], string | null | undefined] {
    let loadedClass: StructureModelClass[] = [];
    let label: string = undefined;
    if (DataPsmClass.is(complexTypeData) || DataPsmContainer.is(complexTypeData)) {
      loadedClass = [this.loadClass(complexTypeData)];
    } else if (DataPsmClassReference.is(complexTypeData)) {
      [loadedClass, label] = this.loadClassReference(complexTypeData);
    }

    return [loadedClass.map(cls => {
      const type = new StructureModelComplexType();
      type.dataType = cls;
      return type;
    }), label];
  }

  /**
   * Load an association end and the typed object it references.
   *
   * If it references a DataPsmOr, it loads the choices.
   * @param associationEndData
   * @private
   */
  private loadAssociationEnd(
    associationEndData: DataPsmAssociationEnd
  ): StructureModelProperty {
    const model = new StructureModelProperty();
    model.psmIri = associationEndData.iri;
    model.pimIri = associationEndData.dataPsmInterpretation;
    model.humanLabel = associationEndData.dataPsmHumanLabel;
    model.humanDescription = associationEndData.dataPsmHumanDescription;
    model.technicalLabel = associationEndData.dataPsmTechnicalLabel;
    model.dematerialize = associationEndData.dataPsmIsDematerialize === true;
    model.isReverse = associationEndData.dataPsmIsReverse === true;
    model.profiling = associationEndData.profiling ?? [];

    // XML specific
    const data = DataPsmXmlPropertyExtension.getExtensionData(associationEndData);
    model.xmlIsAttribute = data.isAttribute;
    model.xmlGmlType = data.gmlType;

    const semanticRelationship = this.reader.readResource(
      associationEndData.dataPsmInterpretation
    ) as unknown as ExtendedSemanticModelRelationship | null;
    const isReverse = associationEndData.dataPsmIsReverse === true;
    const end = semanticRelationship?.ends[isReverse ? 0 : 1] ?? null;
    if (end === null) {
      model.cardinalityMin = 0;
      model.cardinalityMax = null;
    } else if (isSemanticModelRelationship(semanticRelationship)) {
      // todo: Investigate why we handle this here, this should be done in transformation.
      model.cardinalityMin = end.cardinality?.[0] ?? 0;
      model.cardinalityMax = end.cardinality?.[1] ?? null;
    } else {
      throw new Error(
        `Invalid association end '${associationEndData.iri}' interpretation.`
      );
    }

    if (associationEndData.dataPsmCardinality) {
      model.cardinalityMin = associationEndData.dataPsmCardinality[0];
      model.cardinalityMax = associationEndData.dataPsmCardinality[1];
    }

    // The association end may point to class, class reference or "OR".
    const part = this.reader.readResource(associationEndData.dataPsmPart);

    if (DataPsmOr.is(part)) {
      for (const choice of part.dataPsmChoices) {
        const cls = this.reader.readResource(choice);
        if (!DataPsmClass.is(cls) && !DataPsmClassReference.is(cls)) {
          throw new Error(`Unsupported entity in OR ${choice}.`);
        }
        model.dataTypes.push(...this.loadComplexType(cls)[0]);
        model.orTechnicalLabel = part.dataPsmTechnicalLabel ?? associationEndData.dataPsmTechnicalLabel;
        model.isInOr = true;
      }
    } else if (DataPsmClass.is(part) || DataPsmClassReference.is(part)) {
      if (DataPsmClassReference.is(part)) {
        model.isReferencing = true;
        model.referencingStructureSchema = part.dataPsmSpecification;
      }
      const [types, label] = this.loadComplexType(part); // It might be a class or it might be a reference (to or for example)
      model.dataTypes.push(...types);
      model.orTechnicalLabel = label ?? (DataPsmClassReference.is(part) ? null : associationEndData.dataPsmTechnicalLabel);
      model.isInOr = label !== undefined;
    } else {
      throw new Error(`Unsupported association end '${associationEndData.iri}'.`);
    }

    return model;
  }

  private loadAttribute(
    attributeData: DataPsmAttribute
  ): StructureModelProperty {
    const model = new StructureModelProperty();
    model.psmIri = attributeData.iri;
    model.pimIri = attributeData.dataPsmInterpretation;
    model.humanLabel = attributeData.dataPsmHumanLabel;
    model.humanDescription = attributeData.dataPsmHumanDescription;
    model.technicalLabel = attributeData.dataPsmTechnicalLabel;
    model.profiling = attributeData.profiling ?? [];

    // XML specific
    const data = DataPsmXmlPropertyExtension.getExtensionData(attributeData);
    model.xmlIsAttribute = data.isAttribute;
    model.xmlGmlType = data.gmlType;

    const pimAttributeData = this.reader.readResource(
      attributeData.dataPsmInterpretation
    ) as unknown as Entity;
    if (pimAttributeData === null) {
      model.cardinalityMin = 0;
      model.cardinalityMax = null;
    } else if (isSemanticModelRelationship(pimAttributeData)) {
      model.cardinalityMin = pimAttributeData.ends[1].cardinality?.[0] ?? 0;
      model.cardinalityMax = pimAttributeData.ends[1].cardinality?.[1] ?? null;
    } else {
      throw new Error(
        `Invalid attribute '${attributeData.iri}' interpretation.`
      );
    }

    if (attributeData.dataPsmCardinality) {
      model.cardinalityMin = attributeData.dataPsmCardinality[0];
      model.cardinalityMax = attributeData.dataPsmCardinality[1];
    }

    const type = new StructureModelPrimitiveType();
    type.dataType = attributeData.dataPsmDatatype;

    // JSON specific
    const jsonData = DataPsmJsonPropertyExtension.getExtensionData(attributeData);
    type.jsonUseKeyValueForLangString = jsonData.useKeyValueForLangString;

    model.dataTypes.push(type);

    return model;
  }

  private loadContainer(
    containerData: DataPsmContainer
  ): StructureModelProperty {
    const property = new StructureModelProperty();
    property.psmIri = containerData.iri;
    property.profiling = containerData.profiling ?? [];
    // This says that the property is actually a container
    property.propertyAsContainer = containerData.dataPsmContainerType;

    // So far the cardinality for these containers is always 1..1
    property.cardinalityMin = containerData.dataPsmCardinality?.[0] ?? 1;
    property.cardinalityMax = containerData.dataPsmCardinality ? containerData.dataPsmCardinality[1] : 1;

    const [part] = this.loadComplexType(containerData);
    property.dataTypes = part;

    return property;
  }

  /**
   * Returns StructureModelClass representing an external root. This class has
   * no members, because it is not modelled in the PSM, but for many generators
   * it is useful to ignore the concept of external root and treat it as a
   * regular class.
   */
  private loadExternalRoot(root: DataPsmExternalRoot): StructureModelClass {
    const model = new StructureModelClass();

    model.psmIri = root.iri;
    model.pimIri = root.dataPsmTypes[0]; // todo ignore or for now
    model.technicalLabel = root.dataPsmTechnicalLabel;
    model.structureSchema = this.psmSchemaIri;
    model.profiling = root.profiling ?? [];

    return model;
  }
}

export function coreResourcesToStructuralModel(
  reader: CoreResourceReader,
  psmSchemaIri: string
): StructureModel | null {
  const adapter = new StructureModelAdapter(reader, null);
  return adapter.load(psmSchemaIri);
}
