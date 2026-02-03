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
  XmlSchemaSimpleItemRestriction,
  XmlSchemaSimpleType,
  XmlSchemaType,
  xmlSchemaTypeIsComplex,
  xmlSchemaTypeIsSimple,
} from "./xml-schema-model.ts";
import { XML_SCHEMA } from "./xml-schema-vocabulary.ts";
import type { MissingRefError } from "ajv";
import { getExtensionSchemaPath } from "./xml-schema-generator.ts";

function multiplyMinCardinality(a: number, b: number): number {
  return a * b;
}

function multiplyMaxCardinality(a: number | null, b: number | null): number | null {
  if (a === null || b === null) {
    return null;
  }
  return a * b;
}

/**
 * Converts a {@link XmlStructureModel} to an {@link XmlSchema}.
 */
export async function structureModelToXmlSchema(
  context: ArtefactGeneratorContext,
  specification: DataSpecification,
  artifact: DataSpecificationSchema,
  model: XmlStructureModel
): Promise<{
    mainSchema: XmlSchema,
    profilingExtensionsSchema: XmlSchema | null,
  }> {
  const options = XmlConfigurator.merge(DefaultXmlConfiguration, XmlConfigurator.getFromObject(artifact.configuration)) as XmlConfiguration;

  // Adds default values regarding the instancesHaveIdentity
  const globalConfiguration = DataSpecificationConfigurator.merge(
    DefaultDataSpecificationConfiguration,
    DataSpecificationConfigurator.getFromObject(artifact.configuration)
  ) as DataSpecificationConfiguration;
  model = structureModelAddDefaultValues(model, globalConfiguration) as XmlStructureModel;

  // // Find common XML artifact
  // const commonXmlArtefact = specification.artefacts.find((a) => a.generator === XML_COMMON_SCHEMA_GENERATOR);
  // if (!commonXmlArtefact) {
  //   throw new Error("XML generator requires common xml schema artifact");
  // }
  // const commonXmlSchemaLocation = pathRelative(
  //   artifact.publicUrl,
  //   commonXmlArtefact.publicUrl,
  //   true // todo: we need better resolution whether the path should be absolute or not
  // );
  const commonXmlSchemaLocation = null;

  /**
   * Whether this is a regular XML schema or the profiling one
   */
  const isProfiling = model.profiling.length > 0;
  const profiledModel = isProfiling ? await prepareStructureModel(context.structureModels[model.profiling[0]], context, globalConfiguration) as XmlStructureModel : null;

  const adapter = new XmlSchemaAdapter(context, specification, artifact, model, options, commonXmlSchemaLocation, profiledModel);
  return await adapter.fromStructureModel();
}

/**
 * Performs necessary transformations and prepares all the data.
 *
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
 * This class contains functions to process all parts of a {@link XmlStructureModel}
 * and create an instance of {@link XmlSchema}.
 */
class XmlSchemaAdapter {
  private context: ArtefactGeneratorContext;
  private specifications: { [iri: string]: DataSpecification };
  private artifact: DataSpecificationSchema;
  private model: XmlStructureModel;
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

  private profiledModel: XmlStructureModel | null = null;

  private adapterForExtensionSchema: XmlSchemaAdapter | null = null;

  /**
   * Creates a new instance of the adapter, for a particular structure model.
   * @param context The context of generation, used to access other models.
   * @param specification The specification containing the structure model.
   * @param artifact The artifact describing the output of the generator.
   * @param model The structure model.
   * @param options Additional options to the generator.
   * @param profiledModel
   */
  constructor(
    context: ArtefactGeneratorContext,
    specification: DataSpecification,
    artifact: DataSpecificationSchema,
    model: XmlStructureModel,
    options: XmlConfiguration,
    commonXmlSchemaLocation: string,
    profiledModel: XmlStructureModel | null = null,
  ) {
    this.context = context;
    this.specifications = context.specifications;
    this.artifact = artifact;
    this.model = model;
    this.options = options;
    this.commonXmlSchemaLocation = commonXmlSchemaLocation;
    this.profiledModel = profiledModel;

    this.imports = {};
    this.namespaces = {
      // Required namespace
      "http://www.w3.org/2001/XMLSchema": "xs",
      // Required namespace
      "http://www.w3.org/2007/XMLSchema-versioning": "vc"
    };
    this.types = {};

    if (this.profiledModel && this.profiledModel.namespace && this.profiledModel.namespacePrefix) {
      this.namespaces[this.profiledModel.namespace] = this.profiledModel.namespacePrefix;
    } else if (this.model.namespace && this.model.namespacePrefix) {
      this.namespaces[this.model.namespace] = this.model.namespacePrefix;
    }

    if (this.options.generateSawsdl) {
      this.namespaces["http://www.w3.org/ns/sawsdl"] = "sawsdl";
    }
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
   * Generates full XML Schema from the structure model, provided configuration and other models.
   */
  public async fromStructureModel(): Promise<{
    mainSchema: XmlSchema,
    profilingExtensionsSchema: XmlSchema | null,
  }> {
    /**
     * If we are in the profiling mode (meaning we generate the main schema), we also create model adapter for the extension schema.
     */
    if (this.profiledModel) {
      this.adapterForExtensionSchema = new XmlSchemaAdapter(
        this.context,
        null as DataSpecification, // not used
        this.artifact,
        this.model,
        this.options,
        this.commonXmlSchemaLocation,
        null, // Here we are in non-profiling mode
      );

      const extensionImport: XmlSchemaImportDeclaration = {
        namespace: this.model.namespace,
        schemaLocation: pathRelative(this.artifact.publicUrl, getExtensionSchemaPath(this.artifact.publicUrl), true),
        model: null,
      };
      this.imports[extensionImport.namespace] = extensionImport;

      if (this.model.namespace && this.model.namespacePrefix) {
        const extensionNamespace: XmlSchemaNamespaceDefinition = {
          namespace: this.model.namespace,
          prefix: this.model.namespacePrefix,
        }
        this.namespaces[extensionNamespace.namespace] = extensionNamespace.prefix;
      }
    }

    // Generate for each root element

    for (const root of this.model.roots) {
      let rootElement = await this.rootToElement(root);
      if (!this.model.skipRootElement) {
        this.elements.push(rootElement);
      }
    }

    return {
      mainSchema: this.getSchema(),
      profilingExtensionsSchema: this.adapterForExtensionSchema ? this.adapterForExtensionSchema.getSchema() : null,
    };
  }

  private getSchema(): XmlSchema {
    return {
      targetNamespace: (this.profiledModel || this.model).namespace,
      targetNamespacePrefix: (this.profiledModel || this.model).namespacePrefix,
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
        const element = {
          entityType: "element",
          name: [null, cls.technicalLabel],
          type: await this.singleClassToType(cls),
          annotation: null,
        } satisfies XmlSchemaElement;
        if (this.options.extractAllTypes) {
          this.extractType(element);
        } else if (xmlSchemaTypeIsComplex(element.type)) {
          element.type.name = null;
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
        annotation: null,
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
        const attribute = {
          name: [null, property.technicalLabel],
          type: await this.objectTypeToSchemaType(property) as XmlSchemaSimpleType,
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
      let element: XmlSchemaElement;

      if (property.profiling.length === 0 && this.profiledModel) {
        const extensionSchemaElement = await this.adapterForExtensionSchema!.getElementForNormalProperty(property);
        this.adapterForExtensionSchema!.elements.push(extensionSchemaElement);

        // Make it as ref
        element = {...extensionSchemaElement};
        element.type = null;
        element.name = [this.model.namespacePrefix, element.name[1]];
        element.annotation = null;
      } else {
        element = await this.getElementForNormalProperty(property);
      }

      return {
        cardinalityMin: property.cardinalityMin ?? 0,
        cardinalityMax: property.cardinalityMax ?? null,
        effectiveCardinalityMin: property.cardinalityMin ?? 0,
        effectiveCardinalityMax: property.cardinalityMax ?? null,
        semanticRelationToParentElement: property.semanticPath ?? [], // It is a relation from complex content to this relation
        element: element,
      } satisfies XmlSchemaComplexContentElement;
    }
  }

  private async getElementForNormalProperty(property: StructureModelProperty): Promise<XmlSchemaElement> {
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
      name: [this.model.namespacePrefix, typeName],
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
        return [this.model.namespacePrefix, type[1]];
      }
    }
    return type;
  }
}
