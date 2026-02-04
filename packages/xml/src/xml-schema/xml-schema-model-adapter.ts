import { pathRelative } from "@dataspecer/core/core/utilities/path-relative";
import { DataSpecificationConfiguration, DataSpecificationConfigurator, DefaultDataSpecificationConfiguration } from "@dataspecer/core/data-specification/configuration";
import { DataSpecification, DataSpecificationArtefact, DataSpecificationSchema } from "@dataspecer/core/data-specification/model";
import { ArtefactGeneratorContext } from "@dataspecer/core/generator";
import {
  StructureModelClass,
  StructureModelComplexType,
  StructureModelPrimitiveType,
  StructureModelProperty,
  StructureModelSchemaRoot,
  type StructureModel,
} from "@dataspecer/core/structure-model/model";
import { structureModelAddDefaultValues } from "@dataspecer/core/structure-model/transformation/add-default-values";
import { OFN, XSD, XSD_PREFIX } from "@dataspecer/core/well-known";
import { DefaultXmlConfiguration, XmlConfiguration, XmlConfigurator } from "../configuration.ts";
import { commonXmlNamespace, commonXmlPrefix, iriElementName, langStringName, QName, simpleTypeMapQName } from "../conventions.ts";
import { structureModelAddXmlProperties } from "../xml-structure-model/add-xml-properties.ts";
import { XmlStructureModel } from "../xml-structure-model/model/xml-structure-model.ts";
import {
  XmlSchema,
  XmlSchemaAnnotation,
  XmlSchemaAttribute,
  XmlSchemaComplexChoice,
  XmlSchemaComplexContainer,
  XmlSchemaComplexContent,
  XmlSchemaComplexContentElement,
  xmlSchemaComplexContentIsElement,
  xmlSchemaComplexContentIsItem,
  XmlSchemaComplexContentItem,
  XmlSchemaComplexSequence,
  XmlSchemaComplexType,
  XmlSchemaElement,
  XmlSchemaImportDeclaration,
  XmlSchemaLangStringType,
  XmlSchemaNamespaceDefinition,
  XmlSchemaSimpleItem,
  XmlSchemaSimpleItemList,
  XmlSchemaSimpleItemRestriction,
  xmlSchemaSimpleTypeDefinitionIsRestriction,
  xmlSchemaSimpleTypeDefinitionIsList,
  XmlSchemaSimpleType,
  XmlSchemaType,
  xmlSchemaTypeIsComplex,
  xmlSchemaTypeIsSimple,
} from "./xml-schema-model.ts";
import { XML_SCHEMA } from "./xml-schema-vocabulary.ts";
import { buildEntityOriginMap, type EntityOriginMap } from "./utils/entity-origin-map.ts";
import { multiplyMaxCardinality, multiplyMinCardinality } from "./utils/cardinality.ts";

/**
 * Information about a level in the profiling chain, linking
 * the structure model with its adapter and namespace.
 */
interface ProfilingLevelInfo {
  /**
   * The structure model at this level
   */
  model: XmlStructureModel;
  /**
   * The adapter that generates XSD for this level's namespace
   */
  adapter: XmlSchemaAdapter;
  /**
   * Index in the profiling chain (0 = base, higher = more derived)
   */
  index: number;
}

/**
 * Performs necessary transformations and prepares all the data.
 * todo: We need to do full transformation here including from the conceptual model.
 */
async function prepareStructureModel(rawModel: StructureModel, context: ArtefactGeneratorContext, configuration: DataSpecificationConfiguration): Promise<XmlStructureModel> {
  rawModel = structureModelAddDefaultValues(rawModel, configuration);
  const xmlModel = await structureModelAddXmlProperties(
    rawModel, context.reader
  );

  return xmlModel;
}

const XML_IMPORT = {
  namespace: "http://www.w3.org/XML/1998/namespace",
  schemaLocation: "http://www.w3.org/2001/xml.xsd",
  model: null,
} satisfies XmlSchemaImportDeclaration;


/**
 * Collects the full profiling chain of models, starting from the given model
 * and following the profiling references up to the base (non-profiling) model.
 * Returns array from base model to the current model (index 0 = base, last = current).
 *
 * Example: If C profiles B which profiles A, returns [A, B, C]
 */
async function collectProfilingChain(
  model: StructureModel,
  context: ArtefactGeneratorContext,
  mainArtifact: DataSpecificationArtefact,
): Promise<XmlStructureModel[]> {
  const chain: XmlStructureModel[] = [];

  let currentModelId: string | null = model.psmIri;
  while (currentModelId) {
    const structureModel = currentModelId === model.psmIri ? model : context.structureModels[currentModelId];

    const configuration = DataSpecificationConfigurator.merge(
      DefaultDataSpecificationConfiguration,
      DataSpecificationConfigurator.getFromObject(mainArtifact.configuration) // todo
    ) as DataSpecificationConfiguration;

    const profiledModel = await prepareStructureModel(structureModel, context, configuration) as XmlStructureModel;
    chain.push(profiledModel);

    // Go to the next profiled model (the one this model profiles)
    currentModelId = profiledModel.profiling.length > 0 ? profiledModel.profiling[0] : null;
  }

  // Reverse so that base model is first, current model is last
  return chain.reverse();
}


/**
 * Converts a {@link StructureModel} to an array of {@link XmlSchema}s. For
 * non-profiling models, returns a single schema. For profiling schemas with
 * multiple namespaces, returns one schema per unique target namespace in the
 * profiling chain.
 *
 * The source of truth is always the LAST model in the profiling chain (the
 * current model). Elements are placed in the XSD corresponding to where they
 * were originally defined (traced via the profiling property), but their
 * properties come from the source of truth.
 */
export async function structureModelToXmlSchema(
  context: ArtefactGeneratorContext,
  specification: DataSpecification,
  artifact: DataSpecificationSchema,
  model: StructureModel
): Promise<XmlSchema[]> {
  // Step one: prepare all structure models in the profiling chain
  // profilingChain[0] = base model, profilingChain[last] = current model (source of truth)
  const profilingChain = await collectProfilingChain(model, context, artifact);

  // The source of truth is the LAST model (the current one we're generating for)
  const sourceOfTruthModel = profilingChain[profilingChain.length - 1];

  // TODO: options should be per model, but for now we use the same options for all
  const options = XmlConfigurator.merge(
    DefaultXmlConfiguration,
    XmlConfigurator.getFromObject(artifact.configuration)
  ) as XmlConfiguration;

  const commonXmlSchemaLocation = null;

  // Group models by namespace - models with the same namespace share an adapter
  // We use the first model in each namespace group as the "representative" model
  const namespaceToFirstModel = new Map<string, { model: XmlStructureModel; firstIndex: number }>();

  for (let i = 0; i < profilingChain.length; i++) {
    const profiledModel = profilingChain[i];
    const ns = profiledModel.namespace ?? "";
    if (!namespaceToFirstModel.has(ns)) {
      namespaceToFirstModel.set(ns, { model: profiledModel, firstIndex: i });
    }
  }

  // Create one adapter per unique namespace
  const namespaceToAdapter = new Map<string, XmlSchemaAdapter>();
  const uniqueNamespaces = Array.from(namespaceToFirstModel.keys());

  for (const ns of uniqueNamespaces) {
    const { model: namespaceModel } = namespaceToFirstModel.get(ns)!;
    const adapter = new XmlSchemaAdapter(
      context,
      artifact,
      sourceOfTruthModel, // Always use source of truth model for data
      namespaceModel, // todo not sure whether we need whole namespace model here
      options,
      commonXmlSchemaLocation,
    );
    namespaceToAdapter.set(ns, adapter);
  }

  // Create adapters array and profilingLevelInfos - map each level to its namespace's adapter
  const adapters: XmlSchemaAdapter[] = [];
  const profilingLevelInfos: ProfilingLevelInfo[] = [];

  for (let i = 0; i < profilingChain.length; i++) {
    const profiledModel = profilingChain[i];
    const ns = profiledModel.namespace ?? "";
    const adapter = namespaceToAdapter.get(ns)!;
    adapters.push(adapter);
    profilingLevelInfos.push({
      model: profiledModel,
      adapter: adapter,
      index: i
    });
  }

  // Build entity origin map to determine where each entity was first defined
  const entityOriginMap = buildEntityOriginMap(profilingChain);

  // Link adapters: each adapter knows about the adapters for derived profiles
  // We only need to set context once per unique adapter
  const processedAdapters = new Set<XmlSchemaAdapter>();
  for (let i = 0; i < adapters.length; i++) {
    const adapter = adapters[i];
    if (processedAdapters.has(adapter)) {
      continue;
    }
    processedAdapters.add(adapter);

    adapter.setProfilingContext(
      profilingLevelInfos,
      entityOriginMap,
    );
  }

  // Generate schema starting from the base adapter
  // The base adapter will coordinate with child adapters for elements in their namespaces
  await adapters[0].fromStructureModel();

  // Get unique adapters preserving order (first occurrence)
  const uniqueAdapters: XmlSchemaAdapter[] = [];
  const seenAdapters = new Set<XmlSchemaAdapter>();
  for (const adapter of adapters) {
    if (!seenAdapters.has(adapter)) {
      seenAdapters.add(adapter);
      uniqueAdapters.push(adapter);
    }
  }

  // Get all schemas
  const allSchemas = uniqueAdapters.map(adapter => adapter.getSchema());

  // Filter out empty non-main schemas that are not referenced by other schemas
  // The main schema is always the first one (base namespace)
  const referencedNamespaces = new Set<string>();

  // Collect all referenced namespaces from imports in all schemas
  for (const schema of allSchemas) {
    for (const imp of schema.imports) {
      if (imp.namespace) {
        referencedNamespaces.add(imp.namespace);
      }
    }
  }

  // Filter: keep main schema, and keep non-empty or referenced schemas
  const filteredSchemas = allSchemas.filter((schema, index) => {
    // Always keep the main schema (first one)
    if (index === 0) {
      return true;
    }
    // Keep if schema has elements or types
    const hasContent = schema.elements.length > 0 || schema.types.length > 0;
    // Keep if schema is referenced by another schema
    const isReferenced = referencedNamespaces.has(schema.targetNamespace);
    return hasContent || isReferenced;
  });

  return filteredSchemas;
}

/**
 * This class contains functions to process all parts of a {@link XmlStructureModel}
 * and create an instance of {@link XmlSchema}.
 *
 * Each adapter is responsible for generating XSD content for a specific namespace
 * level in the profiling chain. The adapter uses data from the source of truth model
 * but generates elements in its own namespace based on where entities originate.
 */
class XmlSchemaAdapter {
  private context: ArtefactGeneratorContext;
  private specifications: { [iri: string]: DataSpecification };
  private artifact: DataSpecificationSchema;
  /**
   * The source of truth model - contains the actual data (properties, cardinality, etc.)
   * This is always the final/current model in the profiling chain.
   */
  private model: XmlStructureModel;
  /**
   * The namespace model - determines the namespace for this adapter.
   * This is the model at this level in the profiling chain.
   */
  private namespaceModel: XmlStructureModel;
  private options: XmlConfiguration;
  private commonXmlSchemaLocation: string;

  private usesLangString: boolean;
  private imports: { [specification: string]: XmlSchemaImportDeclaration };
  /**
   * Defined namespace and its prefix
   */
  private namespaces: Record<string, string>;
  private types: Record<string, XmlSchemaType>;
  private elements: XmlSchemaElement[] = [];

  /**
   * All profiling level information for the chain.
   */
  private profilingLevelInfos: ProfilingLevelInfo[] = [];
  /**
   * Mapping from entity PSM IRI to the level index where it was originally defined.
   */
  private entityOriginMap: EntityOriginMap = new Map();

  /**
   * Creates a new instance of the adapter, for a particular structure model.
   * @param context The context of generation, used to access other models.
   * @param artifact The artifact describing the output of the generator.
   * @param sourceOfTruthModel The model containing the actual data (source of truth).
   * @param namespaceModel The model that determines the namespace for this adapter.
   * @param options Additional options to the generator.
   * @param commonXmlSchemaLocation Location of common XML schema.
   */
  constructor(
    context: ArtefactGeneratorContext,
    artifact: DataSpecificationSchema,
    sourceOfTruthModel: XmlStructureModel,
    namespaceModel: XmlStructureModel,
    options: XmlConfiguration,
    commonXmlSchemaLocation: string,
  ) {
    this.context = context;
    this.specifications = context.specifications;
    this.artifact = artifact;
    this.model = sourceOfTruthModel;
    this.namespaceModel = namespaceModel;
    this.options = options;
    this.commonXmlSchemaLocation = commonXmlSchemaLocation;

    this.imports = {};
    this.namespaces = {
      // Required namespace
      "http://www.w3.org/2001/XMLSchema": "xs",
      // Required namespace
      "http://www.w3.org/2007/XMLSchema-versioning": "vc"
    };
    this.types = {};

    // Use namespace from the namespace model (the model at this level in the chain)
    if (this.namespaceModel.namespace && this.namespaceModel.namespacePrefix) {
      this.namespaces[this.namespaceModel.namespace] = this.namespaceModel.namespacePrefix;
    }

    if (this.options.generateSawsdl) {
      this.namespaces["http://www.w3.org/ns/sawsdl"] = "sawsdl";
    }
  }

  /**
   * Sets the profiling context for this adapter.
   * @param levelInfos All profiling level information.
   * @param entityOriginMap Mapping from entity PSM IRI to origin level index.
   */
  setProfilingContext(
    levelInfos: ProfilingLevelInfo[],
    entityOriginMap: EntityOriginMap,
  ) {
    this.profilingLevelInfos = levelInfos;
    this.entityOriginMap = entityOriginMap;
  }

  /**
   * Gets the level index where an entity was originally defined.
   * Uses the entityOriginMap built from all models in the profiling chain.
   */
  private getEntityOriginLevel(entity: StructureModelClass | StructureModelProperty): number {
    const psmIri = entity.psmIri;
    if (psmIri && this.entityOriginMap.has(psmIri)) {
      return this.entityOriginMap.get(psmIri);
    }

    // Fallback: if entity has no profiling, it's new in the source of truth (last level)
    // If it has profiling, assume it came from the base level
    if (entity.profiling.length === 0) {
      return this.profilingLevelInfos.length - 1;
    }
    return 0;
  }

  /**
   * Gets the adapter that should define an element for the given entity.
   * The element should be defined in the XSD of the namespace where
   * the entity was originally defined (traced via profiling).
   */
  private getAdapterForEntity(entity: StructureModelClass | StructureModelProperty): XmlSchemaAdapter {
    const originLevel = this.getEntityOriginLevel(entity);
    return this.profilingLevelInfos[originLevel]?.adapter ?? this;
  }

  /**
   * Returns the namespace prefix for a given known namespace and imports it if not disabled.
   */
  private getAndImportHelperNamespace(namespaceKind: "xsd" | "xml" | "common", doImport: boolean): string {
    if (namespaceKind === "xsd") {
      this.namespaces["http://www.w3.org/2001/XMLSchema"] = "xs";
      if (doImport) {
        // There is a special case for this namespace.
        // It is never imported.
      }
      return "xs";
    }

    if (namespaceKind === "xml") {
      this.namespaces["http://www.w3.org/XML/1998/namespace"] = "xml";
      if (doImport) {
        this.imports["http://www.w3.org/XML/1998/namespace"] = XML_IMPORT;
      }
      return "xml";
    }

    if (namespaceKind === "common") {
      this.namespaces[commonXmlNamespace] = commonXmlPrefix;
      if (doImport) {
        this.imports[commonXmlNamespace] = {
          namespace: commonXmlNamespace,
          schemaLocation: this.commonXmlSchemaLocation,
          model: null,
        };
      }
      return commonXmlPrefix;
    }

    namespaceKind satisfies never;
  }

  /**
   * Returns <iri> element for given class or null if the element should be skipped.
   */
  private getIriElementOrAttribute(forStructureModelClass: StructureModelClass): XmlSchemaComplexContentElement | XmlSchemaAttribute | null {
    let skipIri = false;
    skipIri ||= forStructureModelClass.instancesHaveIdentity === "NEVER";
    skipIri ||= (forStructureModelClass.iris === null || forStructureModelClass.iris.length === 0);

    if (skipIri) {
      return null;
    }

    const useElementInsteadOfAttribute = !this.options.elementIriAsAttribute;

    // Todo implement configuration for this.
    const useIriFromExternalXsd = false;

    if (useIriFromExternalXsd) {
      this.getAndImportHelperNamespace("common", true);
    }

    const type = forStructureModelClass.regex ? {
      entityType: "type",
      name: null,
      annotation: null,
      simpleDefinition: {
        xsType: "restriction",
        base: [this.getAndImportHelperNamespace("xsd", true), "anyURI"],
        pattern: forStructureModelClass.regex,
        contents: [],
      } as XmlSchemaSimpleItemRestriction,
      } satisfies XmlSchemaSimpleType : {
      entityType: "type",
      name: [this.getAndImportHelperNamespace("xsd", true), "anyURI"],
      annotation: null,
    } satisfies XmlSchemaType;

    if (useElementInsteadOfAttribute) {
      return {
        cardinalityMin: forStructureModelClass.instancesHaveIdentity === "ALWAYS" ? 1 : 0,
        effectiveCardinalityMin: forStructureModelClass.instancesHaveIdentity === "ALWAYS" ? 1 : 0,
        cardinalityMax: 1,
        effectiveCardinalityMax: 1,
        semanticRelationToParentElement: null,
        element: {
          entityType: "element",
          name: iriElementName,
          annotation: null,
          type: useIriFromExternalXsd ? null : type,
        } satisfies XmlSchemaElement,
      } satisfies XmlSchemaComplexContentElement;
    } else {
      const attribute = new XmlSchemaAttribute();
      attribute.name = iriElementName;
      attribute.type = useIriFromExternalXsd ? null : type;
      attribute.annotation = null;
      attribute.isRequired = forStructureModelClass.instancesHaveIdentity === "ALWAYS";
      return attribute;
    }
  };

  /**
   * Generates full XML Schema from the structure model, provided configuration
   * and other models.
   *
   * todo: We suppose that all roots belong here. Normally, we should check
   * whether they belong to this ns or other and thus we should reference them.
   */
  public async fromStructureModel(): Promise<void> {
    for (const root of this.model.roots) {
      let rootElement = await this.rootToElement(root);
      if (!this.model.skipRootElement) {
        this.elements.push(rootElement);
      }
    }
  }

  /**
   * Returns the final generated schema. You need to call at least one of the
   * methods to actually generate something, otherwise the schema will be empty.
   */
  getSchema(): XmlSchema {
    return {
      targetNamespace: this.namespaceModel.namespace,
      targetNamespacePrefix: this.namespaceModel.namespacePrefix,
      elements: this.elements,
      defineLangString: this.usesLangString,
      imports: Object.values(this.imports),
      namespaces: Object.entries(this.namespaces).map(([namespace, prefix]) => ({
        namespace,
        prefix,
      })) satisfies XmlSchemaNamespaceDefinition[],
      types: Object.values(this.types),
      commonXmlSchemaLocation: this.commonXmlSchemaLocation,
      options: this.options,
    };
  }

  /**
   * Creates an {@link XmlSchemaElement} from given
   * {@link StructureModelSchemaRoot} including the rest of the structure.
   *
   * To make things clear, an XML element is de facto an association. This
   * nicely corresponds to StructureModelSchemaRoot which is de facto a "root
   * edge" of the structure model.
   */
  private async rootToElement(root: StructureModelSchemaRoot): Promise<XmlSchemaElement> {
    const minCardinality = root.cardinalityMin ?? 1;
    const maxCardinality = root.cardinalityMax ?? 1;
    const hasWrappingElement = root.enforceCollection || minCardinality !== 1 || maxCardinality !== 1;
    const isInOr = root.isInOr || root.classes.length > 1;
    const wrappingElementName = root.collectionTechnicalLabel ?? "root";

    // We use the technical label from root, but if not provided, we use the
    // label of the referenced element
    const referencedElementTechnicalLabel = isInOr ? root.orTechnicalLabel : root.classes[0].technicalLabel;
    const technicalLabel = root.technicalLabel ?? referencedElementTechnicalLabel ?? "element";

    let rootElement = {
      entityType: "element",
      name: [null, technicalLabel],
      type: await this.objectTypeToSchemaType(root),
      annotation: null,
    } satisfies XmlSchemaElement;

    this.extractType(rootElement);

    if (hasWrappingElement) {
      const complexContent = {
        cardinalityMin: minCardinality,
        cardinalityMax: maxCardinality,
        element: rootElement,
        semanticRelationToParentElement: null,
        effectiveCardinalityMax: maxCardinality,
        effectiveCardinalityMin: minCardinality,
      } satisfies XmlSchemaComplexContentElement;

      const type = {
        entityType: "type",
        name: null, // This type is not need to be extracted
        complexDefinition: {
          xsType: "sequence",
          contents: [complexContent],
          xsAny: false,
        } as XmlSchemaComplexSequence,
        mixed: false,
        abstract: null,
        annotation: null,
        attributes: [], // No attributes - this is just a wrapping element
      } satisfies XmlSchemaComplexType;

      const wrappingElement = {
        entityType: "element",
        name: [null, wrappingElementName],
        type: type,
        annotation: null,
      } as XmlSchemaElement;

      return wrappingElement;
    } else {
      return rootElement;
    }
  }

  /**
   * Converts object type to schema type.
   * The issue is that the "object" is encoded in the parent association therefore the input is either {@link StructureModelSchemaRoot} or {@link StructureModelProperty}.
   */
  private async objectTypeToSchemaType(property: StructureModelSchemaRoot | StructureModelProperty): Promise<XmlSchemaType> {
    // We know that this type belongs here, because we were called with it.

    let isInOr: boolean;
    let choices: (StructureModelClass | StructureModelPrimitiveType)[];
    if (property instanceof StructureModelSchemaRoot) {
      isInOr = property.isInOr || property.classes.length > 1;
      choices = property.classes;
    } else {
      isInOr = property.isInOr || property.dataTypes.length > 1;
      choices = property.dataTypes.map((dt) => (dt.isAssociation() ? dt.dataType : (dt as StructureModelPrimitiveType)));
    }

    // There is this special handling for primitive types
    // todo: make this more clear
    if (choices.every((c) => c instanceof StructureModelPrimitiveType)) {
      return this.datatypePropertyToType(property as StructureModelProperty, choices as StructureModelPrimitiveType[]);
    }

    if (isInOr) {
      if (property.isReferencing) {
        // We are in property, not root

        const referencedClass = await this.getImportedTypeForEntity(property as StructureModelProperty);
        referencedClass[1] = property.orTechnicalLabel ?? "type";

        return {
          entityType: "type",
          name: referencedClass,
          annotation: null,
        } satisfies XmlSchemaType;
      }

      const contents = [] as XmlSchemaComplexContent[];
      for (const cls of choices) {
        if (cls instanceof StructureModelPrimitiveType) {
          throw new Error("Primitive types are not allowed in OR");
        }

        let element: XmlSchemaElement;

        if (cls.isReferenced) {
          // For referenced classes, create an element with the imported type
          const importedTypeName = await this.getImportedTypeForEntity(cls);
          element = {
            entityType: "element",
            name: [null, cls.technicalLabel],
            type: {
              entityType: "type",
              name: importedTypeName,
              annotation: this.getAnnotation(cls),
            } satisfies XmlSchemaType,
            annotation: null, // this.getAnnotation(cls)
          } satisfies XmlSchemaElement;
        } else {
          // For inline classes, create a normal element with type definition
          element = {
            entityType: "element",
            name: [null, cls.technicalLabel],
            type: await this.singleClassToType(cls),
            annotation: this.getAnnotation(cls),
          } satisfies XmlSchemaElement;
          if (this.options.extractAllTypes) {
            this.extractType(element);
          } else if (xmlSchemaTypeIsComplex(element.type)) {
            element.type.name = null;
          }
        }

        const complexContent = {
          cardinalityMin: 1,
          cardinalityMax: 1,
          effectiveCardinalityMin: 1,
          effectiveCardinalityMax: 1,
          semanticRelationToParentElement: null,
          element: element,
        } satisfies XmlSchemaComplexContentElement;
        contents.push(complexContent);
      }

      const type = {
        entityType: "type",
        // We will use the technical label of OR or we will fallback to the association
        name: [null, property.orTechnicalLabel ?? "type"],
        annotation: property instanceof StructureModelProperty ? this.getAnnotation(property) : null,
        mixed: false,
        abstract: null,
        complexDefinition: {
          xsType: "choice",
          contents: contents,
        } as XmlSchemaComplexChoice,
        attributes: [], // no attributes here, this is a choice in or
      } satisfies XmlSchemaComplexType;

      return type;
    } else {
      const type = choices[0] as StructureModelClass;
      return await this.singleClassToType(type);
    }
  }

  /**
   * Transforms {@link StructureModelClass} to {@link XmlSchemaType} and returns it.
   * The class may be referenced.
   */
  private async singleClassToType(cls: StructureModelClass): Promise<XmlSchemaType> {
    if (cls.isReferenced) {
      return {
        entityType: "type",
        name: await this.getImportedTypeForEntity(cls),
        annotation: this.getAnnotation(cls),
      } satisfies XmlSchemaType;
    } else {
      let complexDefinition = await this.propertiesToComplexSequence(cls.properties, "sequence");
      let iriAsAttribute: XmlSchemaAttribute | null = null;

      // Inject IRI into the sequence as hardcoded first element
      if (complexDefinition) {
        const iriElement = this.getIriElementOrAttribute(cls);
        if (iriElement && iriElement instanceof XmlSchemaAttribute) {
          iriAsAttribute = iriElement;
        } else if (iriElement) {
          complexDefinition.contents = [iriElement as XmlSchemaComplexContentElement, ...complexDefinition.contents];
        }
      }

      // Inject xs:any if open content is allowed
      if (!cls.isClosed) {
        complexDefinition.xsAny = {
          cardinalityMin: 0,
          cardinalityMax: null,
          processContents: "lax",
          /**
           * Other means any namespace except the target namespace. When doing
           * extension schema during profiling, the ideal would be to exclude
           * both original and profiled namespaces. This is however not
           * supported by XML Schema. Therefore we keep other as well.
           */
          namespace: "##other",
        };
      }

      const attributes = await this.propertiesToAttributes(cls.properties);
      if (iriAsAttribute) {
        attributes.unshift(iriAsAttribute);
      }
      const type = {
        entityType: "type",
        name: [null, cls.technicalLabel],
        annotation: this.getAnnotation(cls),
        mixed: false,
        abstract: null,
        complexDefinition,
        attributes,
      } satisfies XmlSchemaComplexType;
      return type;
    }
  }

  /**
   * Helper function that returns {@link QName} for a class that is referenced.
   */
  private async getImportedTypeForEntity(entity: StructureModelClass | StructureModelProperty): Promise<QName> {
    const structureSchema = (entity as StructureModelClass).structureSchema || (entity as StructureModelProperty).referencingStructureSchema;
    const specification = (entity as StructureModelClass).specification || (entity as StructureModelProperty).referencingSpecification;
    const importDeclaration = this.imports[structureSchema];

    // Already imported
    if (importDeclaration) {
      return [this.namespaces[importDeclaration.namespace], entity.technicalLabel];
    }

    // Find the artefact and import
    const artefact = this.findArtefactForImport(structureSchema, specification);
    if (artefact) {
      const model = await this.getImportedModel(structureSchema);
      const prefix = model?.namespacePrefix ?? null;
      const namespace = model?.namespace ?? null;
      this.imports[structureSchema] = {
        namespace: namespace,
        schemaLocation: pathRelative(this.currentPath(), artefact.publicUrl, specification !== this.model.specification),
        model,
      };
      if (namespace && prefix) {
        this.namespaces[namespace] = prefix;
      }
      return [prefix, entity.technicalLabel];
    }

    // Fallback with error
    return [null, entity.technicalLabel];
  }

  /**
   * Creates an xs:list simple type wrapping a given item type.
   * Used for multi-valued attributes.
   */
  private createListType(itemType: QName): XmlSchemaSimpleType {
    const listDefinition: XmlSchemaSimpleItemList = {
      xsType: "list",
      itemType: itemType,
      contents: [],
    };
    
    return {
      entityType: "type",
      name: null,
      annotation: null,
      simpleDefinition: listDefinition,
    };
  }

  /**
   * Helper function that converts a property list to a complex sequence. You need to specify the type of the sequence.
   * For example "sequence" or "choice".
   */
  private async propertiesToComplexSequence(properties: StructureModelProperty[], xsType: string): Promise<XmlSchemaComplexSequence> {
    const contents = [];
    for (const property of properties) {
      if (!property.xmlIsAttribute) {
        contents.push(await this.propertyToComplexContentElement(property));
      }
    }
    return {
      xsType: xsType,
      contents,
    } as XmlSchemaComplexSequence;
  }

  /**
   * todo: what about sub-containers?
   */
  private async propertiesToAttributes(properties: StructureModelProperty[]): Promise<XmlSchemaAttribute[]> {
    const attributes: XmlSchemaAttribute[] = [];
    for (const property of properties) {
      if (property.xmlIsAttribute) {
        let type = await this.objectTypeToSchemaType(property) as XmlSchemaSimpleType;
        
        // Check if this attribute has multi-cardinality (max > 1 or unbounded)
        // In XML Schema, multi-valued attributes must use xs:list
        const cardinalityMax = property.cardinalityMax;
        const isMultiValued = cardinalityMax === null || cardinalityMax > 1;
        
        if (isMultiValued) {
          // Get the item type - either from the type's name or from an inline definition
          let itemType: QName;
          
          if (type.name != null) {
            // Named type reference
            itemType = type.name;
          } else if (xmlSchemaTypeIsSimple(type)) {
            // Inline simple type - for now, we extract the base type if it's a restriction
            // or use xs:string as a fallback
            const simpleDefinition = type.simpleDefinition;
            if (xmlSchemaSimpleTypeDefinitionIsRestriction(simpleDefinition)) {
              itemType = simpleDefinition.base;
            } else {
              // For other cases (union, etc.), default to xs:string
              itemType = [this.getAndImportHelperNamespace("xsd", true), "string"];
            }
          } else {
            // Fallback to xs:string for unrecognized types
            itemType = [this.getAndImportHelperNamespace("xsd", true), "string"];
          }
          
          // Wrap in xs:list
          type = this.createListType(itemType);
        }

        const attribute = {
          name: [null, property.technicalLabel],
          type: type,
          annotation: this.getAnnotation(property),
          isRequired: property.cardinalityMin > 0,
        } satisfies XmlSchemaAttribute;

        attributes.push(attribute);
      }
    }

    return attributes;
  }

  /**
   * This function is used when iterating over class properties.
   * Generates complex content element containing element.
   * This does not handle dematerialization!
   *
   * For profiling support:
   * - Determines where the property was originally defined using entityOriginMap
   * - If the property originates from this adapter's level, define it here
   * - If it originates from a different level, delegate to that adapter and create a reference
   */
  private async propertyToComplexContentElement(property: StructureModelProperty): Promise<XmlSchemaComplexContentElement | XmlSchemaComplexContentItem | null> {
    /**
     * Property is either RELATION or a CONTAINER
     */
    const container = property.propertyAsContainer;

    if (container) {
      // This is hack for container
      const thisCardinalityMin = property.cardinalityMin ?? 0;
      const thisCardinalityMax = property.cardinalityMax ?? null;

      const containerContents = (property.dataTypes[0] as StructureModelComplexType).dataType.properties;
      const item = await this.propertiesToComplexSequence(containerContents, container);

      // Propagate effective cardinality by finding all elements
      const lookupContents = [...item.contents];
      for (const content of lookupContents) {
        if (xmlSchemaComplexContentIsElement(content)) {
          content.effectiveCardinalityMin = multiplyMinCardinality(content.effectiveCardinalityMin, thisCardinalityMin);
          content.effectiveCardinalityMax = multiplyMaxCardinality(content.effectiveCardinalityMax, thisCardinalityMax);
        } else if (xmlSchemaComplexContentIsItem(content)) {
          const lookup = [...(content.item as XmlSchemaComplexContainer)?.contents];
          lookupContents.push(...lookup);
        }
      }

      return {
        cardinalityMin: thisCardinalityMin,
        cardinalityMax: thisCardinalityMax, // It is a relation from complex content to this relation
        item: item,
      } satisfies XmlSchemaComplexContentItem;
    } else {
      // Determine which adapter should define this element
      const hasProfilingChain = this.profilingLevelInfos.length > 1;
      const targetAdapter = hasProfilingChain ? this.getAdapterForEntity(property) : this;

      if (targetAdapter !== this) {
        // Property should be defined in a different adapter's namespace
        // Define the element in the target adapter
        const targetElement = await targetAdapter.getElementForNormalProperty(property);
        targetAdapter.addElement(targetElement);

        // Import the target namespace into this adapter
        this.importNamespace(targetAdapter.namespaceModel);

        // Create a reference to this element
        const refElement = {
          entityType: "element",
          name: [targetAdapter.namespaceModel.namespacePrefix, targetElement.name[1]],
          type: null, // Reference, no type definition
          annotation: null,
        } satisfies XmlSchemaElement;

        return {
          cardinalityMin: property.cardinalityMin ?? 0,
          cardinalityMax: property.cardinalityMax ?? null,
          effectiveCardinalityMin: property.cardinalityMin ?? 0,
          effectiveCardinalityMax: property.cardinalityMax ?? null,
          semanticRelationToParentElement: property.semanticPath ?? [],
          element: refElement,
        } satisfies XmlSchemaComplexContentElement;
      }

      // Property belongs to this namespace - define it here
      const element = await this.getElementForNormalProperty(property);

      return {
        cardinalityMin: property.cardinalityMin ?? 0,
        cardinalityMax: property.cardinalityMax ?? null,
        effectiveCardinalityMin: property.cardinalityMin ?? 0,
        effectiveCardinalityMax: property.cardinalityMax ?? null,
        semanticRelationToParentElement: property.semanticPath ?? [],
        element: element,
      } satisfies XmlSchemaComplexContentElement;
    }
  }

  /**
   * Adds an element to this adapter's element list (for external use by other adapters).
   */
  public addElement(element: XmlSchemaElement): void {
    this.elements.push(element);
  }

  /**
   * Imports a namespace from another model into this adapter.
   */
  private importNamespace(otherModel: XmlStructureModel): void {
    if (otherModel.namespace && otherModel.namespacePrefix) {
      this.namespaces[otherModel.namespace] = otherModel.namespacePrefix;

      // Create an import declaration for the extension schema
      const extensionSchemaLocation = this.getExtensionSchemaLocation(otherModel);
      this.imports[otherModel.namespace] = {
        namespace: otherModel.namespace,
        schemaLocation: extensionSchemaLocation,
        model: otherModel,
      };
    }
  }

  /**
   * Gets the schema location for an extension schema file.
   */
  private getExtensionSchemaLocation(model: XmlStructureModel): string {
    // Generate extension schema path based on namespace prefix
    const basePath = this.artifact.outputPath;
    const suffix = `.${model.namespacePrefix}-extension.xsd`;
    if (basePath.endsWith(".xsd")) {
      return basePath.replace(/\.xsd$/, suffix);
    } else {
      return basePath + suffix;
    }
  }

  /**
   * Creates an element for a normal (non-container) property.
   * This method is public to allow other adapters in the profiling chain
   * to delegate element creation.
   */
  public async getElementForNormalProperty(property: StructureModelProperty): Promise<XmlSchemaElement> {
    const element = {
      entityType: "element",
      name: [null, property.technicalLabel],
      type: await this.objectTypeToSchemaType(property),
      annotation: this.getAnnotation(property),
    } as XmlSchemaElement;

    if (this.options.extractAllTypes) {
      this.extractType(element);
    } else if (xmlSchemaTypeIsComplex(element.type)) {
      element.type.name = null;
    }

    return element;
  }

  private extractType(element: XmlSchemaElement) {
    // Only if the type is not already inlined
    if (!xmlSchemaTypeIsComplex(element.type) && !xmlSchemaTypeIsSimple(element.type)) {
      return;
    }

    const typeName = element.type.name[1];
    const type = element.type;
    this.types[typeName] = type;

    element.type = {
      entityType: "type",
      name: [this.namespaceModel.namespacePrefix, typeName],
      annotation: null,
    };
  }

  private findArtefactForImport(structureSchema: string, specification: string): DataSpecificationArtefact | null {
    const targetSpecification = this.specifications[specification];
    if (targetSpecification == null) {
      throw new Error(`Missing specification ${specification}`);
    }
    for (const candidate of targetSpecification.artefacts) {
      if (candidate.generator !== XML_SCHEMA.Generator) {
        continue;
      }
      const candidateSchema = candidate as DataSpecificationSchema;
      if (structureSchema !== candidateSchema.psm) {
        continue;
      }
      // TODO We should check that the class is root here.
      return candidate;
    }
    return null;
  }

  /**
   * Returns the path of the current artifact.
   */
  private currentPath(): string {
    return this.artifact.publicUrl;
  }

  /**
   * Returns the structure model from an imported schema.
   */
  private async getImportedModel(iri: string): Promise<XmlStructureModel> {
    const model = this.context.structureModels[iri];
    if (model != null) {
      return await structureModelAddXmlProperties(model, this.context.reader);
    }
    return null;
  }

  /**
   * Produces an {@link XmlSchemaAnnotation} from a class or property,
   * storing its interpretation, name, and description.
   */
  private getAnnotation(data: StructureModelClass | StructureModelProperty): XmlSchemaAnnotation {
    // Annotation uses xml:lang and therefore we need to import it
    this.getAndImportHelperNamespace("xml", false);

    const isElement = data instanceof StructureModelClass;
    const isType = data instanceof StructureModelProperty;
    const generateAnnotation = (isElement && this.options.generateElementAnnotations) || (isType && this.options.generateTypeAnnotations);
    return {
          modelReference: this.options.generateSawsdl ? data.iris : null,
          metaTitle: generateAnnotation ? data.humanLabel : null,
          metaDescription: generateAnnotation ? data.humanDescription : null,
          metaUsageNote: generateAnnotation ? data.usageNote : null,
          structureModelEntity: data,
        };
  }

  /**
   * Creates a simple type from a datatype property.
   */
  private datatypePropertyToType(propertyData: StructureModelProperty, dataTypes: StructureModelPrimitiveType[]): XmlSchemaType {
    if (dataTypes.length === 1 && !propertyData.isInOr) {
      if ([OFN.text, "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"].includes(dataTypes[0].dataType)) {
        // This is language string
        const langStringType: XmlSchemaLangStringType = {
          entityType: "type",
          specialType: "langString",
          name: null,
          annotation: null,
        };
        // Uses xml lang
        this.getAndImportHelperNamespace("xml", true);
        return langStringType;
      }

      if (dataTypes[0].regex && [XSD.string, XSD.anyURI, XSD.anyURI].includes(dataTypes[0].dataType)) {
        // todo: check whether regex is shown
        return {
          name: null,
          annotation: null,
          simpleDefinition: {
            xsType: "restriction",
            base: this.primitiveToQName(dataTypes[0]),
            pattern: dataTypes[0].regex,
            contents: [],
          } as XmlSchemaSimpleItem,
        } as XmlSchemaSimpleType;
      }

      return {
        entityType: "type",
        name: this.primitiveToQName(dataTypes[0]),
        annotation: null, // No annotation for primitive types.
      };
    }
    // Use the union of all the datatypes.
    const simpleType: XmlSchemaSimpleType = {
      entityType: "type",
      name: null,
      annotation: null,
      simpleDefinition: {
        xsType: "union",
        contents: dataTypes.map(this.primitiveToQName, this),
      },
    };
    return simpleType;
  }

  /**
   * Obtains the {@link QName} corresponding to a primitive type.
   */
  private primitiveToQName(primitiveData: StructureModelPrimitiveType): QName {
    if (primitiveData.dataType == null) {
      // No type defined.
      return [this.getAndImportHelperNamespace("xsd", true), "anySimpleType"];
    }
    const type: QName = primitiveData.dataType.startsWith(XSD_PREFIX)
      ? // Type inside XSD is used.
        [this.getAndImportHelperNamespace("xsd", true), primitiveData.dataType.substring(XSD_PREFIX.length)]
      : // An internally mapped type (from OFN) is used, if defined.
        simpleTypeMapQName[primitiveData.dataType] ?? [this.getAndImportHelperNamespace("xsd", true), "anySimpleType"];
    if (type === langStringName) {
      // todo: For now this wont happen as language string shall be caught by the parent function
      // Defined langString if it is used.
      this.usesLangString = true;
      if (type[0] == null) {
        return [this.namespaceModel.namespacePrefix, type[1]];
      }
    }
    return type;
  }
}
