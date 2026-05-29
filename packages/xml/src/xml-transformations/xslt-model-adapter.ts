import {
  StructureModelClass,
  StructureModelComplexType,
  StructureModelPrimitiveType,
  StructureModelProperty,
  StructureModelSchemaRoot,
  StructureModelType,
} from "@dataspecer/core/structure-model/model";

import { XmlStructureModel as StructureModel } from "../xml-structure-model/model/xml-structure-model.ts";

import {
  XmlClassMatch,
  XmlClassTargetTemplate,
  XmlContainerMatch,
  XmlGmlLiteralMatch,
  XmlLiteralMatch,
  XmlWktLiteralMatch,
  XmlMatch,
  XmlRootTemplate,
  XmlTemplate,
  XmlTransformation,
  XmlTransformationImport,
  type XmlIriMatch,
} from "./xslt-model.ts";

import { DataSpecification, DataSpecificationArtefact, DataSpecificationSchema } from "@dataspecer/core/data-specification/model";

import { pathRelative } from "@dataspecer/core/core/utilities/path-relative";
import { ArtefactGeneratorContext } from "@dataspecer/core/generator";
import { OFN } from "@dataspecer/core/well-known";
import { DefaultXmlConfiguration, XmlConfiguration, XmlConfigurator } from "../configuration.ts";
import { iriElementName, namespaceFromIri, QName, simpleTypeMapIri } from "../conventions.ts";
import { buildEntityOriginMap, type EntityOriginMap } from "../xml-schema/utils/entity-origin-map.ts";
import { collectProfilingChain, GEO_SPARQL_WKT_LITERAL } from "../xml-schema/xml-schema-model-adapter.ts";
import { structureModelAddXmlProperties } from "../xml-structure-model/add-xml-properties.ts";
import { XSLT_LIFTING, XSLT_LOWERING } from "./xslt-vocabulary.ts";
import { DataSpecificationConfigurator, DefaultDataSpecificationConfiguration, type DataSpecificationConfiguration } from "@dataspecer/core/data-specification/configuration";
import { DataPsmXmlEnvelopeType, isGmlLiteral, XML_GML_NAMESPACE } from "../xml-schema/gml-support.ts";

/**
 * Converts a {@link StructureModel} to an {@link XmlTransformation}.
 */
export async function structureModelToXslt(
  context: ArtefactGeneratorContext,
  _: DataSpecification,
  artifact: DataSpecificationSchema,
  model: StructureModel,
): Promise<XmlTransformation> {
  const profilingChain = await collectProfilingChain(model, context, artifact);
  const sourceOfTruthModel = profilingChain[profilingChain.length - 1] ?? model;
  const adapter = new XsltAdapter(context, artifact, sourceOfTruthModel, profilingChain);
  return adapter.fromRoots(sourceOfTruthModel.roots);
}

/**
 * This class contains functions to process all parts of a {@link StructureModel}
 * and create an instance of {@link XmlTransformation}.
 */
class XsltAdapter {
  private context: ArtefactGeneratorContext;
  private specifications: { [iri: string]: DataSpecification };
  private artifact: DataSpecificationSchema;
  private model: StructureModel;
  private rdfNamespaces: Record<string, string>;
  private rdfNamespacesIris: Record<string, string>;
  private rdfNamespaceCounter: number;
  private imports: { [structureSchema: string]: XmlTransformationImport };
  private schemaNamespacePrefixes: { [structureSchema: string]: string | null };
  private profilingChainModels: StructureModel[];
  private entityOriginMap: EntityOriginMap;
  private options: XmlConfiguration;
  private generalOptions: DataSpecificationConfiguration;

  private usesWktLiterals: boolean = false;
  private usesGmlLiterals: boolean = false;

  /**
   *
   * Creates a new instance of the adapter, for a particular structure model.
   * @param context The context of generation, used to access other models.
   * @param artifact The artifact describing the output of the generator.
   * @param model The structure model.
   */
  constructor(context: ArtefactGeneratorContext, artifact: DataSpecificationSchema, model: StructureModel, profilingChainModels: StructureModel[]) {
    this.context = context;
    this.specifications = context.specifications;
    this.artifact = artifact;
    this.model = model;
    this.profilingChainModels = profilingChainModels;
    this.entityOriginMap = buildEntityOriginMap(profilingChainModels);
    this.options = XmlConfigurator.merge(DefaultXmlConfiguration, XmlConfigurator.getFromObject(artifact.configuration)) as XmlConfiguration;
    this.generalOptions = DataSpecificationConfigurator.merge(DefaultDataSpecificationConfiguration, DataSpecificationConfigurator.getFromObject(artifact.configuration)) as DataSpecificationConfiguration;
  }

  private getNamespacePrefixForSchema(structureSchema: string | null): string | null {
    if (structureSchema == null || structureSchema === this.model.psmIri) {
      return this.model.namespacePrefix;
    }

    if (structureSchema in this.schemaNamespacePrefixes) {
      return this.schemaNamespacePrefixes[structureSchema];
    }

    const profilingModel = this.profilingChainModels.find((candidate) => candidate.psmIri === structureSchema);
    if (profilingModel?.namespacePrefix !== undefined) {
      const prefix = profilingModel.namespacePrefix ?? null;
      this.schemaNamespacePrefixes[structureSchema] = prefix;
      return prefix;
    }

    const importedModel = this.context.structureModels[structureSchema] as StructureModel | undefined;
    const prefix = importedModel?.namespacePrefix ?? null;
    this.schemaNamespacePrefixes[structureSchema] = prefix;
    return prefix;
  }

  private getEntityOriginLevel(entity: StructureModelClass | StructureModelProperty): number {
    const psmIri = entity.psmIri;
    if (psmIri && this.entityOriginMap.has(psmIri)) {
      return this.entityOriginMap.get(psmIri);
    }

    if (entity.profiling.length === 0) {
      return this.profilingChainModels.length - 1;
    }
    return 0;
  }

  private getOriginSchemaForEntity(entity: StructureModelClass | StructureModelProperty): string | null {
    const originLevel = this.getEntityOriginLevel(entity);
    return this.profilingChainModels[originLevel]?.psmIri ?? this.model.psmIri;
  }

  private findSpecificationForSchema(structureSchema: string | null): DataSpecification | null {
    if (structureSchema == null) {
      return null;
    }

    return Object.values(this.specifications).find((candidate) => candidate.psms?.includes(structureSchema)) ?? null;
  }

  private findArtifactsForSchemaImport(structureSchema: string | null, specification: string | null): DataSpecificationArtefact[] {
    if (structureSchema == null || specification == null) {
      return [];
    }

    const targetSpecification = this.specifications[specification];
    if (targetSpecification == null) {
      return [];
    }

    return targetSpecification.artefacts.filter((candidate) => {
      if (candidate.generator !== XSLT_LIFTING.Generator && candidate.generator !== XSLT_LOWERING.Generator) {
        return false;
      }
      const candidateSchema = candidate as DataSpecificationSchema;
      return structureSchema === candidateSchema.psm;
    });
  }

  private ensureSchemaImport(structureSchema: string | null, specification: string | null) {
    if (structureSchema == null || structureSchema === this.model.psmIri) {
      return;
    }

    if (this.imports[structureSchema] != null) {
      return;
    }

    const resolvedSpecification = specification ?? this.findSpecificationForSchema(structureSchema)?.iri ?? null;
    const artifacts = this.findArtifactsForSchemaImport(structureSchema, resolvedSpecification);
    const importedModel = this.getImportedModel(structureSchema);
    const locations = Object.fromEntries(
      artifacts
        .map((importedArtifact) => {
          return [importedArtifact.generator, pathRelative(this.currentPath(), importedArtifact.publicUrl)] as const;
        })
        .filter(([, relativePath]) => relativePath != null && relativePath !== "" && relativePath !== "."),
    );

    this.imports[structureSchema] = {
      locations,
      prefix: this.getModelPrefix(importedModel),
      namespace: this.getModelNamespace(importedModel),
    };
  }

  private ensureProfilingChainImports() {
    for (const profilingModel of this.profilingChainModels) {
      if (profilingModel.psmIri === this.model.psmIri) {
        continue;
      }
      this.ensureSchemaImport(profilingModel.psmIri, profilingModel.specification);
    }
  }

  private propertyToQName(propertyData: StructureModelProperty, ownerClass: StructureModelClass | null): QName {
    const originSchema = this.getOriginSchemaForEntity(propertyData) ?? ownerClass?.structureSchema ?? this.model.psmIri;
    const schemaPrefix = this.getNamespacePrefixForSchema(originSchema);
    return [propertyData.xmlIsAttribute ? null : schemaPrefix, propertyData.technicalLabel];
  }

  /**
   * Produces an XSLT model from a list of root classes.
   * @param roots A list of roots to specify the desired root element templates.
   * @returns An instance of {@link XmlTransformation} with the specific roots templates.
   */
  public fromRoots(roots: StructureModelSchemaRoot[]): XmlTransformation {
    this.rdfNamespaces = {};
    this.rdfNamespacesIris = {};
    this.rdfNamespaceCounter = 0;
    this.imports = {};
    this.schemaNamespacePrefixes = {};
    this.ensureProfilingChainImports();

    const templates = this.model
    .getClasses()
    .map(this.classToTemplate, this)
    .filter((template) => template != null);

    return {
      targetNamespace: this.model.namespace,
      targetNamespacePrefix: this.model.namespacePrefix,
      rdfNamespaces: this.rdfNamespaces,
      rootTemplates: roots.flatMap(this.rootToTemplates, this),
      usesWktLiterals: this.usesWktLiterals,
      usesGmlLiterals: this.usesGmlLiterals,
      templates,
      imports: Object.values(this.imports),
      elementIriAsAttribute: this.options.elementIriAsAttribute,
    };
  }

  findArtifactsForImport(classData: StructureModelClass): DataSpecificationArtefact[] {
    const targetSpecification = this.specifications[classData.specification];
    if (targetSpecification == null) {
      throw new Error(`Missing specification ${classData.specification}`);
    }
    return targetSpecification.artefacts.filter((candidate) => {
      if (candidate.generator !== XSLT_LIFTING.Generator && candidate.generator !== XSLT_LOWERING.Generator) {
        return false;
      }
      const candidateSchema = candidate as DataSpecificationSchema;
      if (classData.structureSchema !== candidateSchema.psm) {
        return false;
      }
      // TODO We should check that the class is root here.
      return true;
    });
  }

  /**
   * Returns true if a class is from a different schema.
   */
  classIsImported(classData: StructureModelClass): boolean {
    return this.model.psmIri !== classData.structureSchema || classData.isReferenced;
  }

  /**
   * Returns the path of the current artifact.
   */
  currentPath(): string {
    return this.artifact.publicUrl;
  }

  /**
   * Returns the {@link QName} of a class, potentially asynchronously if the
   * class is imported from a different schema, in order to load the prefix.
   */
  resolveImportedClassName(classData: StructureModelClass): [imported: boolean, name: QName | Promise<QName>] {
    const importKey = classData.structureSchema ?? classData.specification;

    if (this.classIsImported(classData)) {
      const importDeclaration = this.imports[importKey];
      if (importDeclaration != null) {
        // Already imported; construct it using the prefix.
        return [true, this.getQName(importDeclaration.prefix, classData.technicalLabel)];
      }
      const artifacts = this.findArtifactsForImport(classData);
      if (artifacts.length > 0) {
        this.ensureSchemaImport(classData.structureSchema, classData.specification);
        const imported = this.imports[importKey] ?? this.imports[classData.structureSchema];
        return [true, this.getQName(imported.prefix, classData.technicalLabel)];
      }
    }
    return [false, [this.model.namespacePrefix, classData.technicalLabel]];
  }

  /**
   * Helper function to construct a {@link QName} from an asynchronously
   * obtained prefix.
   */
  async getQName(prefix: Promise<string>, name: string): Promise<QName> {
    return [await prefix, name];
  }

  /**
   * Helper function to obtain the namespace IRI of an asynchronously
   * obtained structure model.
   */
  async getModelNamespace(model: Promise<StructureModel>) {
    return (await model)?.namespace ?? null;
  }

  /**
   * Helper function to obtain the namespace prefix of an asynchronously
   * obtained structure model.
   */
  async getModelPrefix(model: Promise<StructureModel>) {
    return (await model)?.namespacePrefix ?? null;
  }

  /**
   * Returns the structure model from an imported schema.
   */
  async getImportedModel(iri: string): Promise<StructureModel> {
    const model = this.context.structureModels[iri];
    if (model != null) {
      return await structureModelAddXmlProperties(model, this.context.reader);
    }
    return null;
  }

  /**
   * Escape characters to produce a valid NCName for a template from its
   * class's PSM IRI.
   */
  classTemplateName(classData: StructureModelClass) {
    return "_" + classData.psmIri.replace(/[^-.\p{L}\p{N}]/gu, (s) => "_" + s.charCodeAt(0).toString(16).padStart(4, "0"));
  }

  /**
   * Create a template from a root class.
   */
  rootToTemplates(root: StructureModelSchemaRoot): XmlRootTemplate[] {
    const classes = root.classes;
    if (classes.length === 0) {
      return [];
    }

    const isInOr = root.isInOr || classes.length > 1;
    if (isInOr) {
      // OR roots are represented as one element with an inner choice in XSD.
      // Keep existing per-class root template behavior here.
      return classes.map((classData) => this.rootToTemplate(classData, null, null));
    }

    const minCardinality = root.cardinalityMin ?? 1;
    const maxCardinality = root.cardinalityMax ?? 1;
    const hasWrappingElement = root.enforceCollection || minCardinality !== 1 || maxCardinality !== 1;

    const classData = classes[0];
    const technicalLabel = root.technicalLabel ?? classData.technicalLabel ?? "element";
    const collectionElementName = hasWrappingElement ? ([null, root.collectionTechnicalLabel ?? "root"] as QName) : null;

    return [this.rootToTemplate(classData, technicalLabel, collectionElementName)];
  }

  rootToTemplate(classData: StructureModelClass, technicalLabel: string | null, collectionElementName: QName | null): XmlRootTemplate {
    // Ensure imported root classes are registered so their external templates are available.
    this.resolveImportedClassName(classData);

    return {
      classIris: classData.iris ?? [],
      elementName: [this.getNamespacePrefixForSchema(this.getOriginSchemaForEntity(classData)), technicalLabel ?? classData.technicalLabel],
      targetTemplate: this.classTemplateName(classData),
      collectionElementName,
    };
  }

  /**
   * Create a named template from a class.
   */
  classToTemplate(classData: StructureModelClass): XmlTemplate | null {
    if (classData.specification === XML_GML_NAMESPACE) {
      return null;
    }
    const [imported] = this.resolveImportedClassName(classData);
    if (imported) {
      return null;
    }
    const identityPolicy = classData.instancesHaveIdentity ?? this.generalOptions.instancesHaveIdentity;
    return {
      name: this.classTemplateName(classData),
      classIris: classData.iris ?? [],
      propertyMatches: classData.properties.map((propertyData) => this.propertyToMatch(propertyData, classData)),
      iriElementName: identityPolicy === "NEVER" ? null : [this.getNamespacePrefixForSchema(this.getOriginSchemaForEntity(classData)), iriElementName[1]],
    };
  }

  /**
   * Produces a match from a structure model property.
   */
  propertyToMatch(propertyData: StructureModelProperty, ownerClass: StructureModelClass | null = null): XmlMatch {
    const dataTypes = propertyData.dataTypes;
    if (dataTypes.length === 0) {
      throw new Error(`Property ${propertyData.psmIri} has no specified types.`);
    }

    // Check if this is a container property
    if (propertyData.propertyAsContainer) {
      return this.propertyToContainerMatch(propertyData, dataTypes, ownerClass);
    }

    // Enforce the same type (class or datatype)
    // for all types in the property range.
    const result =
      this.propertyToMatchCheckType(propertyData, (type) => type.isAssociation(), this.classPropertyToClassMatch, ownerClass) ??
      this.propertyToMatchCheckType(propertyData, (type) => type.isAttribute() && type.typeOfIds !== null, this.datatypePropertyToIriMatch, ownerClass) ??
      this.propertyToMatchCheckType(propertyData, (type) => type.isAttribute(), this.datatypePropertyToLiteralMatch, ownerClass);
    if (result == null) {
      throw new Error(`Property ${propertyData.psmIri} must use either only ` + "class types or only primitive types.");
    }
    return result;
  }

  /**
   * Construct a container match from a container property.
   * Containers group related elements (e.g., xs:sequence, xs:choice).
   */
  propertyToContainerMatch(propertyData: StructureModelProperty, dataTypes: StructureModelType[], ownerClass: StructureModelClass | null): XmlContainerMatch {
    if (!propertyData.propertyAsContainer) {
      throw new Error(`Property ${propertyData.psmIri} is not marked as a container.`);
    }
    if (dataTypes.length !== 1 || !dataTypes[0].isAssociation()) {
      throw new Error(`Container property ${propertyData.psmIri} must have exactly one ` + `class type, not ${dataTypes.length} type(s).`);
    }

    const containerClass = (dataTypes[0] as StructureModelComplexType).dataType;

    // The container class only contributes structure, not direct RDF triples.
    const innerMatches = containerClass.properties.map((containerProperty) => this.propertyToMatch(containerProperty, containerClass));
    return {
      interpretations: [],
      propertyIris: propertyData.iris ?? [],
      propertyName: this.propertyToQName(propertyData, ownerClass),
      isReverse: propertyData.isReverse,
      isAttribute: false,
      minCardinality: propertyData.cardinalityMin ?? 1,
      containerType: propertyData.propertyAsContainer,
      innerMatches,
    };
  }

  /**
   * Attempts to separate an IRI into a namespace part and a local part,
   * registers the namespace and returns a {@link QName} for use in RDF/XML.
   */
  iriToQName(iri: string): QName {
    const parts = namespaceFromIri(iri);
    if (parts == null) {
      throw new Error(`Cannot extract namespace from property ${iri}.`);
    }
    const [namespaceIri, localName] = parts;
    if (this.rdfNamespacesIris[namespaceIri] != null) {
      return [this.rdfNamespacesIris[namespaceIri], localName];
    }
    const ns = "ns" + this.rdfNamespaceCounter++;
    this.rdfNamespaces[ns] = namespaceIri;
    this.rdfNamespacesIris[namespaceIri] = ns;
    return [ns, localName];
  }

  /**
   * Calls {@link matchConstructor} if every type in {@link dataTypes}
   * matches {@link rangeChecker}, and constructs a match from the property.
   * @param propertyData The property in the structure model.
   * @param rangeChecker The type predicate.
   * @param matchConstructor The function constructing the type.
   * @returns The match created by {@link matchConstructor}.
   */
  propertyToMatchCheckType(
    propertyData: StructureModelProperty,
    rangeChecker: (rangeType: StructureModelType) => boolean,
    matchConstructor: (propertyData: StructureModelProperty, interpretations: QName[], propertyName: QName, dataTypes: StructureModelType[]) => XmlMatch,
    ownerClass: StructureModelClass | null,
  ): XmlMatch | null {
    const dataTypes = propertyData.dataTypes;
    if (dataTypes.every(rangeChecker)) {
      const propertyIris = propertyData.iris ?? [];
      const interpretations = propertyIris.map((propertyIri) => this.iriToQName(propertyIri));
      const propertyName = this.propertyToQName(propertyData, ownerClass);
      return matchConstructor.call(this, propertyData, interpretations, propertyName, dataTypes);
    }
    return null;
  }

  /**
   * Construct a class match from a class property.
   */
  classPropertyToClassMatch(propertyData: StructureModelProperty, interpretations: QName[], propertyName: QName, dataTypes: StructureModelComplexType[]): XmlClassMatch | XmlGmlLiteralMatch {
    if (dataTypes.length === 1 && dataTypes[0].dataType.specification === XML_GML_NAMESPACE) {
      // Handle this as gml literal
      this.usesGmlLiterals = true;
      const dataTypeIri = XML_GML_NAMESPACE + "#" + dataTypes[0].dataType.structureSchema;
      const wrappingElementName = dataTypeIri === DataPsmXmlEnvelopeType ? (["gml", "Envelope"] as QName) : null;

      const baseMatch = {
        interpretations: interpretations,
        propertyIris: propertyData.iris ?? [],
        propertyName: propertyName,
        isReverse: propertyData.isReverse,
        isAttribute: propertyData.xmlIsAttribute,
        minCardinality: propertyData.cardinalityMin ?? 1,
        dataTypeIri,
        wrappingElementName,
      };
      return {
        ...baseMatch,
        isGmlLiteral: true,
      } as XmlGmlLiteralMatch;
    }


    return {
      interpretations: interpretations,
      propertyIris: propertyData.iris ?? [],
      propertyName: propertyName,
      isReverse: propertyData.isReverse,
      isAttribute: propertyData.xmlIsAttribute,
      minCardinality: propertyData.cardinalityMin ?? 1,
      isDematerialized: propertyData.dematerialize,
      targetTemplates: dataTypes.map(this.classTargetTypeTemplate, this),
    };
  }

  /**
   * Create target class template information from a property's class type.
   */
  classTargetTypeTemplate(type: StructureModelComplexType): XmlClassTargetTemplate {
    const [, name] = this.resolveImportedClassName(type.dataType);
    return {
      templateName: this.classTemplateName(type.dataType),
      typeName: name,
      classIris: type.dataType.iris ?? [],
    };
  }

  datatypePropertyToIriMatch(propertyData: StructureModelProperty, interpretations: QName[], propertyName: QName, dataTypes: StructureModelPrimitiveType[]): XmlIriMatch {
    if (dataTypes.length > 1) {
      throw new Error(`Multiple datatypes on a property ${propertyData.psmIri} are ` + "not supported.");
    }
    return {
      interpretations: interpretations,
      propertyIris: propertyData.iris ?? [],
      propertyName: propertyName,
      isReverse: propertyData.isReverse,
      isAttribute: propertyData.xmlIsAttribute,
      minCardinality: propertyData.cardinalityMin ?? 1,
      isXmlIriMatch: true,
    };
  }

  /**
   * Returns true for types that can be converted to RDF literal of type
   * http://www.opengis.net/ont/geosparql#gmlLiteral. There can be many types
   * because there is no 1:1 mapping between RDF world and world of GML
   * (http://www.opengis.net/gml/3.2).
   *
   * For example, gml:GeometryPropertyType in XML can contain <gml:Point>,
   * <gml:MultiSurface> but cannot contain <gml:Envelope> (for that you need
   * gml:BoundingShapeType type of parent element). All of these can be
   * represented as serialized strings in RDF of type
   * http://www.opengis.net/ont/geosparql#gmlLiteral.
   */
  isTypeGmlLiteral(type: StructureModelType): boolean {
    return type.isAttribute() && isGmlLiteral(type.dataType);
  }

  /**
   * Construct a literal match from a class property.
   */
  datatypePropertyToLiteralMatch(propertyData: StructureModelProperty, interpretations: QName[], propertyName: QName, dataTypes: StructureModelPrimitiveType[]): XmlLiteralMatch | XmlWktLiteralMatch | XmlGmlLiteralMatch {
    if (dataTypes.length > 1) {
      throw new Error(`Multiple datatypes on a property ${propertyData.psmIri} are ` + "not supported.");
    }

    const baseMatch = {
      interpretations: interpretations,
      propertyIris: propertyData.iris ?? [],
      propertyName: propertyName,
      isReverse: propertyData.isReverse,
      isAttribute: propertyData.xmlIsAttribute,
      minCardinality: propertyData.cardinalityMin ?? 1,
      dataTypeIri: this.primitiveToIri(dataTypes[0]),
    };

    // Detect WKT literal types
    if (dataTypes[0]?.dataType === GEO_SPARQL_WKT_LITERAL) {
      this.usesWktLiterals = true;
      return {
        ...baseMatch,
        isWktLiteral: true,
      } as XmlWktLiteralMatch;
    }

    // This wont be used because GML literals are not represented as primitive types anymore due to transformation
    if (this.isTypeGmlLiteral(dataTypes[0])) {
      this.usesGmlLiterals = true;
      const dataTypeIri = this.primitiveToIri(dataTypes[0]);
      return {
        ...baseMatch,
        isGmlLiteral: true,
        wrappingElementName: dataTypeIri === DataPsmXmlEnvelopeType ? (["gml", "Envelope"] as QName) : null,
      } as XmlGmlLiteralMatch;
    }

    return baseMatch;
  }

  /**
   * Obtains the datatype IRI from a primitive type.
   */
  primitiveToIri(primitiveData: StructureModelPrimitiveType): string {
    if (primitiveData.dataType == null || primitiveData.dataType == OFN.text) {
      return null;
    }
    return simpleTypeMapIri[primitiveData.dataType] ?? primitiveData.dataType;
  }
}
