import { assertNot, LanguageString } from "@dataspecer/core/core";
import { pathRelative } from "@dataspecer/core/core/utilities/path-relative";
import { DataSpecificationArtefact, DataSpecificationSchema } from "@dataspecer/core/data-specification/model";
import { ArtefactGeneratorContext } from "@dataspecer/core/generator";
import { StructureModel, StructureModelClass, StructureModelComplexType, StructureModelProperty } from "@dataspecer/core/structure-model/model";
import { OFN } from "@dataspecer/core/well-known";
import { DefaultJsonConfiguration, JsonConfiguration, JsonConfigurator } from "../configuration";
import { JSON_LD_GENERATOR } from "./json-ld-generator";
import { AggregatedEntityInApplicationProfileAggregator, LocalEntityWrapped, splitProfileToConcepts } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { SemanticModelClass, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { SemanticModelClassProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";

// JSON-LD version
const VERSION = 1.1;

function tryPrefix(iri: string, prefixes: Record<string, string>): string {
  const prefix = Object.entries(prefixes).sort(
    (a, b) => b[1].length - a[1].length
  ).find(([_, v]) => iri.startsWith(v));
  if (prefix) {
    return `${prefix[0]}:${iri.substring(prefix[1].length)}`;
  }
  return iri;
}

function pickTypeLabel(text: LanguageString, configuration: JsonConfiguration): string | null {
  let label = text[configuration.jsonDefaultTypeKeyMappingHumanLabelLang];
  if (!label) {
    console.warn(`JSON-LD Generator: There is no ${configuration.jsonDefaultTypeKeyMappingHumanLabelLang} label for given entity.`);
    label = text[Object.keys(text)[0]];
  }
  if (label) {
    return label;
  } else {
    return null
  }
}

function getPrefixesForContext(localPrefixes: Record<string, string>, parentPrefixes: Record<string, string> = {}) {
  const prefixes = {};
  for (const [prefix, iri] of Object.entries(localPrefixes)) {
    if (iri !== parentPrefixes[prefix]) {
      prefixes[prefix] = tryPrefix(iri, {...parentPrefixes, ...Object.fromEntries(Object.entries(localPrefixes).filter(([k, _]) => k !== prefix))});
    }
  }
  return prefixes;
}

/**
 * Returns string array that is used for the @type key in the JSON-LD context and JSON schema.
 */
export function getClassTypeKey(cls: LocalEntityWrapped<SemanticModelClass | SemanticModelClassProfile>, structureClass: StructureModelClass, configuration: JsonConfiguration): string[] {
  const concepts = splitProfileToConcepts(cls);
  const mappingType = configuration.jsonDefaultTypeKeyMapping;

  if (mappingType === "technical-label" && concepts.length <= 1) {
    return [structureClass.technicalLabel];
  }

  if (mappingType === "human-label") {
    return concepts.map(concept => pickTypeLabel(concept.aggregatedEntity.name, configuration));
  }

  throw new Error(`Unknown mapping type ${mappingType}`);
}

export class JsonLdAdapter {
  protected model: StructureModel;
  protected context: ArtefactGeneratorContext;
  protected artefact: DataSpecificationArtefact;
  protected configuration: JsonConfiguration;
  protected semanticModel: Record<string, LocalEntityWrapped>;

  constructor(model: StructureModel, context: ArtefactGeneratorContext, artefact: DataSpecificationArtefact, semanticModel: Record<string, LocalEntityWrapped>) {
    this.model = model;
    this.context = context;
    this.artefact = artefact;
    this.configuration = JsonConfigurator.merge(
        DefaultJsonConfiguration,
        JsonConfigurator.getFromObject(artefact.configuration)
    ) as JsonConfiguration;
    this.semanticModel = semanticModel;
  }

  public generate = async () => {
    const result = this.getContext();
    const context = result["@context"];

    if (this.model.roots.length > 1) {
      console.warn("JSON-LD generator: Multiple schema roots not supported.");
    }

    const prefixes = {
      // Pre-defined prefixes
      "xsd": "http://www.w3.org/2001/XMLSchema#",

      ...this.model.jsonLdDefinedPrefixes
    };

    const rootClasses = this.model.roots[0].classes;
    // Iterate over all classes in root OR
    this.generateClassesContext(rootClasses, context, prefixes);

    // Clean the object of undefined values
    return this.optimize(result);
  }

  protected generatePropertyContext(property: StructureModelProperty, context: object, prefixes: Record<string, string>) {
    const contextData = {};

    const firstDataType = property.dataTypes[0];

    if (firstDataType.isAttribute()) {
      contextData["@id"] = tryPrefix(property.cimIri, prefixes);

      if (firstDataType.dataType === OFN.text || (firstDataType.dataType === OFN.rdfLangString && firstDataType.jsonUseKeyValueForLangString)) {
        contextData["@container"] = "@language";
      } else {
        const mapped = typeMapping[firstDataType.dataType];
        contextData["@type"] = (tryPrefix(mapped ?? firstDataType.dataType, prefixes) ?? undefined);
      }
    }

    if (firstDataType.isAssociation()) {
      if (property.isReverse) {
        contextData["@reverse"] = tryPrefix(property.cimIri, prefixes);
      } else {
        contextData["@id"] = tryPrefix(property.cimIri, prefixes);
      }

      if (firstDataType.dataType.properties.length > 0 || firstDataType.dataType.emptyAsComplex) {
        if ((this.model.psmIri !== firstDataType.dataType.structureSchema || firstDataType.dataType.isReferenced) && !this.configuration.dereferenceContext) {
          if (property.cardinalityMax !== 1) {
            contextData["@container"] = "@set";
          }
          const artefact = findArtefactForImport(this.context, firstDataType.dataType);
          contextData["@context"] = pathRelative(this.artefact.publicUrl, artefact.publicUrl);
        } else {
          if (property.cardinalityMax === 1) {
            contextData["@type"] = "@id";
          } else {
            contextData["@container"] = "@set";
          }

          // Deal with OR
          if (property.dataTypes.length === 1) {
            // Check if the class is empty
            if (firstDataType.dataType.properties.length === 0) {
              contextData["@type"] = "@id";
            } else {
              const localContext = {}
              contextData["@context"] = localContext;
              this.generateClassesContext([firstDataType.dataType], localContext, prefixes);
            }
          } else {
            const localContext = {};
            this.generateClassesContext(property.dataTypes.map(dt => (dt as StructureModelComplexType).dataType), localContext, prefixes);
            contextData["@context"] = localContext;
          }
        }
      } else {
        // This is a codelist
        contextData["@type"] = "@id";
        if (property.cardinalityMax !== 1) {
          contextData["@container"] = "@set";
        }
      }
    }

    context[property.technicalLabel] = contextData;
  }

  /**
   * Fills the given context with context of given classes.
   * The trick is that if classes share something or are profiles, then we need to separate them.
   */
  protected generateClassesContext(classes: StructureModelClass[], context: object, prefixes: Record<string, string>) {
    const GOES_TO_PARENT = "";
    const mappingToProperties: Record<string, Set<StructureModelProperty>> = {
      // this is parent context
      [GOES_TO_PARENT]: new Set()
    };
    const mappingToTypeName: Record<string, string> = {};
    const idToIri: Record<string, string> = {};

    for (const cls of classes) {
      const contextType = cls.instancesSpecifyTypes === "NEVER" ? "PROPERTY-SCOPED" : (cls.instancesSpecifyTypes === "OPTIONAL" ? "BOTH" : "TYPE-SCOPED");
      console.log("JSON-LD generator: context type", contextType);
      const propertiesUseParentContext = contextType !== "TYPE-SCOPED";

      const semanticClassWrapped = this.semanticModel[cls.pimIri] as LocalEntityWrapped<SemanticModelClass>;

      const classConcepts = splitProfileToConcepts(semanticClassWrapped);

      // For each "real class"
      if (contextType !== "PROPERTY-SCOPED") {
        for (const concept of classConcepts) {
          const iri = concept.aggregatedEntity.iri;
          if (!mappingToProperties[iri]) {
            mappingToProperties[iri] = new Set();
          }
          mappingToTypeName[iri] = pickTypeLabel(concept.aggregatedEntity.name, this.configuration);
          if (this.configuration.jsonDefaultTypeKeyMapping === "technical-label") {
            if (classConcepts.length > 1) {
              console.warn("JSON-LD generator: Technical labels as type keys are not supported for multiprofiles. Fallback to class name.");
            } else {
              mappingToTypeName[iri] = cls.technicalLabel;
            }
          }
          idToIri[concept.aggregatedEntity.id] = iri;
        }
      }

      for (const property of cls.properties) {
        // For each property we need to find the original concepts (not
        // profile) and assign them to appropriate classes

        const semanticPropertyWrapped = this.semanticModel[property.pimIri] as AggregatedEntityInApplicationProfileAggregator<SemanticModelRelationship>;
        const concepts = splitProfileToConcepts(semanticPropertyWrapped);

        if (concepts.length > 1) {
          throw new Error("JSON-LD generator: Multiprofile for relationships is not supported by JSON generators!");
        }

        const relationshipConceptWrapped = concepts[0] as LocalEntityWrapped<SemanticModelRelationship>;
        const sourceSemanticId = relationshipConceptWrapped.aggregatedEntity.ends[property.isReverse ? 1 : 0].concept;

        if (idToIri[sourceSemanticId] && mappingToProperties[idToIri[sourceSemanticId]] && !propertiesUseParentContext) {
          mappingToProperties[idToIri[sourceSemanticId]].add(property);
        } else {
          mappingToProperties[GOES_TO_PARENT].add(property);
        }
      }
    }

    // Now generate the context

    // 1. Generate user-defined prefixes
    for (const cls of classes) {
      Object.assign(context, getPrefixesForContext(cls.jsonLdDefinedPrefixes, prefixes));
      prefixes = {...prefixes, ...cls.jsonLdDefinedPrefixes};
    }

    // 2. Generate properties that do not belong to specific class
    for (const property of mappingToProperties[GOES_TO_PARENT]) {
      this.generatePropertyContext(property, context, prefixes);
    }

    // 3. Generate classes with their properties
    for (const iri of Object.keys(mappingToProperties).filter(k => k !== GOES_TO_PARENT)) {
      const classContext = {
        "@id": tryPrefix(iri, prefixes),
      };
      context[mappingToTypeName[iri]] = classContext;
      const contextForProperties = {};
      classContext["@context"] = contextForProperties;
      for (const property of mappingToProperties[iri]) {
        this.generatePropertyContext(property, contextForProperties, prefixes);
      }
    }
  }

  protected getContext(): object {
    const context = {
      "@version": VERSION,

      //"rootcontainer": "@graph", // todo add support for root containers

      ...getPrefixesForContext(this.model.jsonLdDefinedPrefixes)
    };

    if (this.configuration.jsonIdKeyAlias) {
      context[this.configuration.jsonIdKeyAlias] = "@id";
    }
    if (this.configuration.jsonTypeKeyAlias) {
      context[this.configuration.jsonTypeKeyAlias] = "@type";
    }
    if (this.configuration.jsonLdBaseUrl) {
      context["@base"] = this.configuration.jsonLdBaseUrl;
    }
    if (this.configuration.jsonRootCardinality === "object-with-array") {
      context[this.configuration.jsonRootCardinalityObjectKey] = "@graph";
    }

    return {
      "@context" : context,
    }
  }

  /**
   * Optimizes resulting context by removing unnecessary constructs such as
   * undefined or object with only @id keyword
   */
  protected optimize(obj: object): object {
    const newObj = {};
    Object.keys(obj).forEach((key) => {
      if (Array.isArray(obj[key])) {
        newObj[key] = obj[key].map(v => this.optimize(v));
      } else if (obj[key] === Object(obj[key])) {
        newObj[key] = this.optimize(obj[key]);
        if (Object.keys(newObj[key]).length === 1 && newObj[key]["@id"]) {
          newObj[key] = newObj[key]["@id"];
        }
      } else if (obj[key] !== undefined) {
        newObj[key] = obj[key];
      }
    });
    return newObj;
  }
}

function findArtefactForImport(
  context: ArtefactGeneratorContext,
  modelClass: StructureModelClass
): DataSpecificationArtefact | null {
  const targetSpecification = context.specifications[modelClass.specification];
  assertNot(
    targetSpecification === undefined,
    `Missing specification ${modelClass.specification}`
  );
  for (const candidate of targetSpecification.artefacts) {
    if (candidate.generator !== JSON_LD_GENERATOR) {
      continue;
    }
    const candidateSchema = candidate as DataSpecificationSchema;
    if (modelClass.structureSchema !== candidateSchema.psm) {
      continue;
    }
    // TODO We should check that the class is root here.
    return candidate;
  }
  return null;
}

const typeMapping: Record<string, string> = {
  [OFN.boolean]: "http://www.w3.org/2001/XMLSchema#boolean",
  [OFN.date]: "http://www.w3.org/2001/XMLSchema#date",
  [OFN.time]: "http://www.w3.org/2001/XMLSchema#time",
  [OFN.dateTime]: "http://www.w3.org/2001/XMLSchema#dateTimeStamp",
  [OFN.integer]: "http://www.w3.org/2001/XMLSchema#integer",
  [OFN.decimal]: "http://www.w3.org/2001/XMLSchema#decimal",
  [OFN.url]: "http://www.w3.org/2001/XMLSchema#anyURI",
  [OFN.string]: "http://www.w3.org/2001/XMLSchema#string",
};
