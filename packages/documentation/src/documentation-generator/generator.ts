import { isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship } from '@dataspecer/core-v2/semantic-model/concepts';
// @ts-ignore
import { Entities, Entity, InMemoryEntityModel } from "@dataspecer/core-v2/entity-model";
import { SemanticModelAggregator } from "@dataspecer/core-v2/semantic-model/aggregator";
import { LanguageString, SemanticModelClass, SemanticModelEntity, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile, SemanticModelClassProfile, SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { getTranslation } from "@dataspecer/core-v2/utils/language";
import { createHandlebarsAdapter, HandlebarsAdapter } from "@dataspecer/handlebars-adapter";

export interface DocumentationGeneratorConfiguration {
  template: string;
  language: string;
  partials: Record<string, string>;
}

type ClassLike = SemanticModelClass | SemanticModelClassProfile;
type RelationshipLike = SemanticModelRelationship | SemanticModelRelationshipProfile;

function normalizeLabel(label: string) {
  // We do not want to convert it to lower case because classes and relations may have identical name but different case as it is common convention in RDF.
  return label.replace(/ /g, "-");
}

function getLastChunkFromIri(iri: string | null | undefined): string | null {
  if (!iri) {
    return null;
  }

  const last = Math.max(iri.lastIndexOf("#"), iri.lastIndexOf("/"));
  if (last === -1) {
    return iri;
  }
  if (last + 1 === iri.length) {
    return null;
  }
  return iri.substring(last + 1);
}

interface ModelDescription {
  isPrimary: boolean;
  documentationUrl: string | null;
  entities: Record<string, SemanticModelEntity>;
  baseIri: string | null;
}

const PREFIX_MAP: Record<string, string> = {
  "http://www.w3.org/ns/adms#": "adms",
  "http://purl.org/dc/elements/1.1/": "dc",
  "http://www.w3.org/ns/dcat#": "dcat",
  "http://purl.org/dc/terms/": "dcterms",
  "http://purl.org/dc/dcmitype/": "dctype",
  "http://xmlns.com/foaf/0.1/": "foaf",
  "http://www.w3.org/ns/locn#": "locn",
  "http://www.w3.org/ns/odrl/2/": "odrl",
  "http://www.w3.org/2002/07/owl#": "owl",
  "http://www.w3.org/ns/prov#": "prov",
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
  "http://www.w3.org/2000/01/rdf-schema#": "rdfs",
  "http://www.w3.org/2004/02/skos/core#": "skos",
  "http://spdx.org/rdf/terms#": "spdx",
  "http://www.w3.org/2006/time#": "time",
  "http://www.w3.org/2006/vcard/ns#": "vcard",
  "http://www.w3.org/2001/XMLSchema#": "xsd",
};

export type DocumentationGeneratorInputModel = {
  // Name of the specification
  label: LanguageString,
  models: ModelDescription[],
  externalArtifacts: Record<string, {
    type: string,
    URL: string,
    label?: LanguageString,
  }[]>,
  // Data specification vocabulary in JSON with JSON-LD context
  dsv: object,
  prefixMap: Record<string, string>,
};

export async function generateDocumentation(
  inputModel: DocumentationGeneratorInputModel,
  configuration: DocumentationGeneratorConfiguration,
  addData?: (adapter: HandlebarsAdapter) => object,
): Promise<string> {
  const localPrefixMap = {...PREFIX_MAP, ...inputModel.prefixMap};

  // Deep clone of models as we will modify them
  const models = structuredClone(inputModel.models);

  // Primary semantic model
  const semanticModel = {} as Entities
  for (const model of models) {
    if (model.isPrimary) {
      Object.assign(semanticModel, model.entities);
    }
  }

  // Create an aggregator and pass all models to it to effectively work with application profiles
  const aggregator = new SemanticModelAggregator();
  for (const model of models) {
    const entityModel = new InMemoryEntityModel();
    entityModel.change(model.entities, []);
    aggregator.addModel(entityModel);
  }
  const aggregatedEntities = aggregator.getView().getEntities();

  // Modify semantic model to include aggregated entities
  // We need to modify all the models
  for (const model of models) {
    for (const entity of Object.values(model.entities)) {
      const entityWithAggregation = entity as Entity & {aggregation?: Entity, aggregationParents?: Entity[]};
      entityWithAggregation.aggregation = aggregatedEntities[entity.id]?.aggregatedEntity!;
      entityWithAggregation.aggregationParents = aggregatedEntities[entity.id]?.sources.map(s => s.aggregatedEntity);
    }
  }

  // Add all relationships to each entity
  // We know, that each relationship profile MUST have its concept present in the model so we do not need to enumerate rest
  for (const entity of Object.values(semanticModel)) {
    if (isSemanticModelRelationshipProfile(entity)) {
      {
        const conceptId = entity.ends[0]?.concept;
        if (conceptId) {
          const concept = semanticModel[conceptId] as ClassLike & {relationships?: RelationshipLike[]};
          if (concept) {
            concept.relationships = concept.relationships || [];
            concept.relationships.push(entity);
          }
        }
      }
      {
        const conceptId = entity.ends[1]?.concept;
        if (conceptId) {
          const concept = semanticModel[conceptId] as ClassLike & {backwardsRelationships?: RelationshipLike[]};
          if (concept) {
            concept.backwardsRelationships = concept.backwardsRelationships || [];
            concept.backwardsRelationships.push(entity);
          }
        }
      }
    }
  }

  const handlebarsAdapter = createHandlebarsAdapter();

  const data = {
    ...(addData?.(handlebarsAdapter)),
    label: inputModel.label,
    locallyDefinedSemanticEntity: semanticModel,
    dsv: inputModel.dsv,

    // The goal of the given documentation
    target: {
      vocabulary: true,
      applicationProfile: false,
    },

    externalArtifacts: inputModel.externalArtifacts,

    // List of used prefixes in the document.
    usedPrefixes: [] as {
      iri: string,
      prefix: string,
    }[],

    // Lang
    lang: configuration.language,
    language: configuration.language,
  };

  /**
   * Shortens IRIs by using prefixes and remebers them for future use.
   */
  data['prefixed'] =  function(iri?: string) {
    if (!iri) {
      return iri;
    }

    const last = Math.max(iri.lastIndexOf("#"), iri.lastIndexOf("/"));
    if (last === -1) {
      return iri;
    }

    const prefix = iri.substring(0, last + 1);
    const suffix = iri.substring(last + 1);

    // todo - use prefixes from the model
    if (Object.hasOwn(localPrefixMap, prefix)) {
      if (!data.usedPrefixes.find(p => p.iri === prefix)) {
        data.usedPrefixes.push({
          iri: prefix,
          prefix: localPrefixMap[prefix]!,
        });
      }
      return localPrefixMap[prefix] + ":" + suffix;
    }

    return iri;
  };

  data['semanticEntity'] =  function(input: string, options: Handlebars.HelperOptions) {
    let entity: SemanticModelEntity | null = null;
    for (const model of models) {
      if (Object.hasOwn(model.entities, input)) {
        entity = model.entities[input]!;
        break;
      }
      const entityByIri = Object.values(model.entities).find(entity => entity.iri === input);
      if (entityByIri) {
        entity = entityByIri;
        break;
      }
    }

    return entity ? options.fn(entity) : options.inverse(input);
  };

  function getAnchorForLocalEntity(entity: SemanticModelEntity): string | null {
    if (isSemanticModelRelationship(entity) || isSemanticModelRelationshipProfile(entity)) {
      // @ts-ignore
      const {ok, translation} = getTranslation(entity.aggregation.ends[1].name, [configuration.language]);
      const normalizedTranslation = ok ? normalizeLabel(translation) : null;

      return getLastChunkFromIri(entity.ends[1]?.iri) || normalizedTranslation || entity.id;
    }

    if (isSemanticModelClass(entity) || isSemanticModelClassProfile(entity)) {
      // @ts-ignore
      const {ok, translation} = getTranslation(entity.aggregation.name, [configuration.language]);
      const normalizedTranslation = ok ? normalizeLabel(translation) : null;

      return getLastChunkFromIri(entity.iri) || normalizedTranslation || entity.id;
    }

    // Fallback
    return null;
  }

  /**
   * Generates link for the given entity.
   */
  data['href'] =  function(input: string, options: Handlebars.HelperOptions) {
    // todo: handle external links

    let inModel: ModelDescription | null = null;
    for (const model of models) {
      if (Object.hasOwn(model.entities, input)) {
        inModel = model;
        break;
      }
      // Hotfix because AP usage links to IRI not to ID
      // todo inspect
      const entity = Object.values(model.entities).find(entity => entity.iri === input ||
        ((isSemanticModelRelationship(entity) || isSemanticModelRelationshipProfile(entity)) && entity.ends.some(end => end.iri === input))
      );
      if (entity) {
        inModel = model;
        input = entity.id;
        break;
      }
    }
    const entity = inModel?.entities[input];

    if (inModel && entity) {
      if (inModel.isPrimary) {
        const anchor = getAnchorForLocalEntity(entity);
        return "#" + anchor;
      } else {
        if (inModel.documentationUrl) {
          const anchor = getAnchorForLocalEntity(entity);
          return inModel.documentationUrl + "#" + anchor;
        } else {
          return input;
        }
      }
    }

    // Last option
    return input;
  };

  /**
   * Generates anchor for the given entity that can be used as a link target.
   *
   * It does not contain the # character. It is intended to be used as an id attribute.
   */
  data['anchor'] =  function(this: SemanticModelEntity) {
    // todo: handle colisions if multiple classes are named the same
    // todo: handle custom anchors
    // todo: handle stability of anchors - if new entitity with the same name is added, the anchor to the previous entity should not change

    const anchor = getAnchorForLocalEntity(this);
    if (anchor) {
      return anchor;
    }

    // Last option
    return this.id;
  };

  data['parentClasses'] =  function(id: string) {
    let entities: SemanticModelEntity[] = [];
    for (const model of models) {
      for (const entity of Object.values(model.entities)) {
        if (isSemanticModelGeneralization(entity)) {
          if (entity.child === id) {
            // Find entity in other model
            for (const model of models) {
              if (Object.hasOwn(model.entities, entity.parent)) {
                entities.push(model.entities[entity.parent]!);
              }
            }
          }
        }
      }
    }
    return entities;
  };

  data['subClasses'] =  function(id: string) {
    let entities: SemanticModelEntity[] = [];
    for (const model of models) {
      for (const entity of Object.values(model.entities)) {
        if (isSemanticModelGeneralization(entity)) {
          if (entity.parent === id) {
            model.entities[entity.child] && entities.push(model.entities[entity.child]!);
          }
        }
      }
    }
    return entities;
  };

  const result = await handlebarsAdapter.render(configuration.template, data, configuration.partials);
  return result;
}