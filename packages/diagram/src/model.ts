import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { PROJECT_MODEL_ID } from "@dataspecer/core/project-model";
import {
  isSemanticModelClass, isSemanticModelRelationship, isSemanticModelGeneralization,
  type SemanticModelClass, type SemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelClassProfile, isSemanticModelRelationshipProfile,
  type SemanticModelClassProfile, type SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { createColorGenerator, isModelVisualInformation, type VisualEntity } from "@dataspecer/visual-model";
import type { RenderOptions } from "./options.ts";

export type Models = Record<ModelIdentifier, EntityRecord>;
export type EntityReference = { modelId: ModelIdentifier; entity: Entity };
export type ClassEntity = SemanticModelClass | SemanticModelClassProfile;
export type RelationshipEntity = SemanticModelRelationship | SemanticModelRelationshipProfile;

export const isClass = (entity: Entity): entity is ClassEntity =>
  isSemanticModelClass(entity) || isSemanticModelClassProfile(entity);
export const isRelationship = (entity: Entity): entity is RelationshipEntity =>
  isSemanticModelRelationship(entity) || isSemanticModelRelationshipProfile(entity);
export const isGeneralization = isSemanticModelGeneralization;
export const isProfile = (entity: Entity): boolean =>
  isSemanticModelClassProfile(entity) || isSemanticModelRelationshipProfile(entity);

/** Selects the IRI-bearing end as the range, defaulting to the second end. */
export function relationshipEnds<T extends RelationshipEntity>(entity: T): {
  domain: T["ends"][number] | undefined;
  range: T["ends"][number] | undefined;
} {
  const [first, second] = entity.ends;
  return first?.iri !== null && first?.iri !== undefined
    ? { domain: second, range: first }
    : { domain: first, range: second };
}

/** Reads an optional entity field. */
function field(entity: Entity | undefined, name: string): unknown {
  return (entity as (Entity & Record<string, unknown>) | undefined)?.[name];
}

/** Selects a localized string without requiring a model wrapper. */
export function localize(value: unknown, language: string): string | null {
  if (typeof value === "string") return value || null;
  if (value === null || typeof value !== "object") return null;
  const entries = Object.entries(value).filter((entry): entry is [string, string] =>
    typeof entry[1] === "string" && entry[1].length > 0);
  for (const key of [language, language.split("-")[0], ""]) {
    const match = entries.find(([candidate]) => candidate === key);
    if (match) return match[1];
  }
  return entries[0] ? `${entries[0][1]}@${entries[0][0]}` : null;
}

/** Model-scoped lookup and presentation of already aggregated entities. */
export class DiagramModel {
  private readonly entitiesById = new Map<string, EntityReference[]>();
  private readonly colors = new Map<string, string>();
  private readonly prefixes: [string, string][];

  constructor(
    readonly models: Models,
    visual: EntityRecord<VisualEntity>,
    readonly options: RenderOptions,
  ) {
    this.prefixes = Object.entries(options.prefixes).sort(([a], [b]) => b.length - a.length);
    for (const [modelId, entities] of Object.entries(models)) {
      if (modelId === PROJECT_MODEL_ID) continue;
      for (const entity of Object.values(entities)) {
        const matches = this.entitiesById.get(entity.id) ?? [];
        matches.push({ modelId, entity });
        this.entitiesById.set(entity.id, matches);
      }
    }
    for (const entity of Object.values(visual)) {
      if (isModelVisualInformation(entity) && entity.color !== null) {
        this.colors.set(entity.representedModel, entity.color);
      }
    }
  }

  /** Resolves an explicitly model-qualified reference without cross-model fallback. */
  explicit(modelId: string, id: string): EntityReference | null {
    const entity = this.models[modelId]?.[id];
    if (entity) return { modelId, entity };
    this.options.onWarning(`Missing entity ${JSON.stringify(id)} in model ${JSON.stringify(modelId)}.`);
    return null;
  }

  /** Resolves unqualified references locally, then uniquely across models. */
  resolve(id: string, modelId: string, { warn = true } = {}): EntityReference | null {
    const local = this.models[modelId]?.[id];
    if (local) return { modelId, entity: local };
    const matches = this.entitiesById.get(id) ?? [];
    if (matches.length === 1) return matches[0];
    if (warn) {
      this.options.onWarning(`${matches.length ? "Ambiguous" : "Missing"} entity reference ${JSON.stringify(id)} from model ${JSON.stringify(modelId)}.`);
    }
    return null;
  }

  /** Resolves a diagram label from the project model, falling back to its identifier. */
  modelLabel(modelId: string): string {
    const project = this.models[PROJECT_MODEL_ID]?.[modelId];
    return localize(field(project, "label"), this.options.language) ?? modelId;
  }

  /** Applies namespace prefixes to an entity's absolute IRI. */
  iri(reference: EntityReference): string | null {
    const entity = reference.entity;
    const value = isRelationship(entity) ? relationshipEnds(entity).range?.iri : field(entity, "iri");
    return typeof value === "string" ? this.abbreviateIri(value) : null;
  }

  /** Abbreviates an absolute IRI using the longest matching namespace. */
  private abbreviateIri(iri: string): string {
    const prefix = this.prefixes.find(([namespace]) => iri.startsWith(namespace));
    return prefix ? `${prefix[1]}:${iri.slice(prefix[0].length)}` : iri;
  }

  /** Returns the entity's own resolved label rather than a vocabulary override. */
  entityLabel(reference: EntityReference): string {
    const entity = reference.entity;
    const value = isRelationship(entity) ? relationshipEnds(entity).range?.name : field(entity, "name");
    return localize(value, this.options.language) ?? this.iri(reference) ?? entity.id;
  }

  label(reference: EntityReference): string {
    if (this.options.labelMode === "iri") return this.iri(reference) ?? this.entityLabel(reference);
    if (this.options.labelMode === "vocabulary") {
      const roots = this.vocabulary(reference);
      if (roots.length) return roots.map(item => this.entityLabel(item)).join(", ");
    }
    return this.entityLabel(reference);
  }

  /** Follows preserved profile declarations without recomputing inherited values. */
  profiles(reference: EntityReference): EntityReference[] {
    const entity = reference.entity;
    let ids: string[] = [];
    if (isSemanticModelClassProfile(entity)) ids = entity.profiling;
    if (isSemanticModelRelationshipProfile(entity)) ids = relationshipEnds(entity).range?.profiling ?? [];
    return ids.flatMap(id => {
      const match = this.resolve(id, reference.modelId);
      return match ? [match] : [];
    });
  }

  profileLabels(reference: EntityReference): string[] {
    if (this.options.profileOfMode === "hidden") return [];
    return this.profiles(reference).map(item => this.options.profileOfMode === "iri"
      ? this.iri(item) ?? this.entityLabel(item) : this.entityLabel(item));
  }

  /** Collects original vocabulary entities, terminating cyclic profile graphs. */
  vocabulary(reference: EntityReference): EntityReference[] {
    const result: EntityReference[] = [];
    const visited = new Set<string>();
    const pending = [reference];
    while (pending.length) {
      const next = pending.pop()!;
      const key = JSON.stringify([next.modelId, next.entity.id]);
      if (visited.has(key)) continue;
      visited.add(key);
      const entity = next.entity;
      if (isProfile(entity)) {
        pending.push(...this.profiles(next).reverse());
      } else if (isClass(entity) || isRelationship(entity)) {
        result.push(next);
      }
    }
    return result;
  }

  color(reference: EntityReference): string {
    const modelId = this.options.colorMode === "vocabulary"
      ? this.vocabulary(reference)[0]?.modelId ?? reference.modelId : reference.modelId;
    return this.colors.get(modelId) ?? createColorGenerator().generateModelColor(modelId);
  }

  rangeLabel(reference: EntityReference, concept: string | null | undefined): string {
    if (!concept) return "";
    const builtin = [
      "http://www.w3.org/2001/XMLSchema#",
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      "http://www.w3.org/2000/01/rdf-schema#",
      "http://www.opengis.net/ont/geosparql#",
      "http://www.opengis.net/ont/sf#",
    ].some(namespace => concept.startsWith(namespace));
    const datatype = builtin ? this.abbreviateIri(concept)
      : concept === "https://ofn.gov.cz/zdroj/základní-datové-typy/2020-07-01/text" ? "Text" : null;
    const target = this.resolve(concept, reference.modelId, { warn: datatype === null });
    return target ? this.label(target) : datatype ?? concept;
  }

  mandatoryLevel(entity: Entity): "mandatory" | "recommended" | "optional" | null {
    if (!isSemanticModelRelationshipProfile(entity)) return null;
    const tags = relationshipEnds(entity).range?.tags ?? [];
    return (["mandatory", "recommended", "optional"] as const)
      .find(level => tags.includes(`https://w3id.org/dsv/requirement-level#${level}`)) ?? null;
  }
}

/** Formats an inclusive cardinality interval; a null upper bound is unbounded. */
export function cardinality(value: [number, number | null] | null | undefined): string {
  return value ? `[${value[0]}..${value[1] ?? "*"}]` : "";
}
