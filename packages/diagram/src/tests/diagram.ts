import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { SemanticModelClass, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import type { SemanticModelClassProfile, SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { VisualEntity, VisualNode, VisualRelationship } from "@dataspecer/visual-model";

export function classEntity(id: string, name: string): SemanticModelClass {
  return { id, type: ["class"], iri: `https://example.org/${id}`, name: { en: name, cs: `${name} česky` }, description: {} };
}

export function relationship(id: string, name: string, domain: string, range: string): SemanticModelRelationship {
  return {
    id, type: ["relationship"], iri: null, name: {}, description: {},
    ends: [
      { iri: null, name: {}, description: {}, concept: domain, cardinality: [0, null] },
      { iri: `https://example.org/${id}`, name: { en: name }, description: {}, concept: range, cardinality: [1, 1] },
    ],
  };
}

export function node(id: string, entity: string, model: string, x: number, y: number, content: string[] = []): VisualNode {
  return { id, type: ["visual-node"], representedEntity: entity, model, position: { x, y, anchored: null }, content, visualModels: [] };
}

export function edge(id: string, entity: string, model: string, source: string, target: string): VisualRelationship {
  return { id, type: ["visual-relationship"], representedRelationship: entity, model, visualSource: source, visualTarget: target, waypoints: [] };
}

/** A vocabulary and an application profile with every supported drawing kind. */
export function diagramFixture() {
  const person = classEntity("Person", "Person");
  const organization = classEntity("Organization", "Organization");
  const name = relationship("name", "Name", person.id, "http://www.w3.org/2001/XMLSchema#string");
  const worksFor = relationship("worksFor", "Works for", person.id, organization.id);
  const profile: SemanticModelClassProfile = {
    id: "Employee", type: ["class-profile"], iri: "https://example.org/profile/Employee", profiling: [person.id],
    name: null, description: null, nameFromProfiled: person.id, descriptionFromProfiled: null,
    usageNote: null, usageNoteFromProfiled: null, externalDocumentationUrl: null,
    tags: [], controlledVocabularies: [],
  };
  const profileName: SemanticModelRelationshipProfile = {
    id: "employeeName", type: ["relationship-profile"],
    ends: name.ends.map((end, index) => ({
      ...end, iri: index ? "https://example.org/profile/employeeName" : null, concept: index ? end.concept! : profile.id,
      name: null, description: null, nameFromProfiled: name.id, descriptionFromProfiled: null,
      profiling: [name.id], cardinality: [1, 1], tags: index ? ["https://w3id.org/dsv/requirement-level#mandatory"] : [],
      usageNote: null, usageNoteFromProfiled: null, externalDocumentationUrl: null,
    })),
  };
  const models: Record<string, EntityRecord> = {
    vocabulary: {
      vocabulary: { id: "vocabulary", type: ["http://dataspecer.com/resources/local/semantic-model"], baseIri: "https://example.org/", modelAlias: "Vocabulary" } as EntityRecord[string],
      Person: person, Organization: organization, name, worksFor,
      generalization: { id: "generalization", type: ["generalization"], child: person.id, parent: organization.id } as EntityRecord[string],
    },
    profile: {
      profile: { id: "profile", type: ["http://dataspecer.com/resources/local/semantic-model"], baseIri: "https://example.org/profile/", modelAlias: "Profile" } as EntityRecord[string],
      Employee: profile, employeeName: profileName,
    },
    detail: {
      header: { id: "header", type: ["entity-model-type"], label: { en: "Header title" } } as EntityRecord[string],
    },
    _project_model: {
      detail: { id: "detail", type: ["project-model-entity"], label: { en: "Detail diagram", cs: "Detailní diagram" }, description: {}, modelType: "http://dataspecer.com/resources/local/visual-model", projectId: "project" } as EntityRecord[string],
    },
  };
  models.profile.Employee = { ...profile, type: ["class-profile", "aggregate"], name: { en: "Employee" } } as EntityRecord[string];
  models.profile.employeeName = {
    ...profileName, type: ["relationship-profile", "aggregate"],
    ends: profileName.ends.map((end, index) => ({ ...end, name: index ? { en: "Employee name" } : {} })),
  } as EntityRecord[string];
  const visual: EntityRecord<VisualEntity> = {
    person: node("person", "Person", "vocabulary", -100, -50, ["name"]),
    organization: node("organization", "Organization", "vocabulary", 420, -50),
    employee: node("employee", "Employee", "profile", -100, 230, ["employeeName"]),
    works: { ...edge("works", "worksFor", "vocabulary", "person", "organization"), waypoints: [{ x: 300, y: 70, anchored: null }] } as VisualRelationship,
    generalization: edge("generalization", "generalization", "vocabulary", "employee", "organization"),
    profileLink: { id: "profileLink", type: ["visual-profile-relationship"], entity: "Employee", model: "profile", visualSource: "employee", visualTarget: "person", waypoints: [] } as VisualEntity,
    diagram: { id: "diagram", type: ["visual-diagram-node"], representedVisualModel: "detail", position: { x: 750, y: 230, anchored: null } } as VisualEntity,
    modelColor: { id: "modelColor", type: ["http://dataspecer.com/resources/local/visual-model"], representedModel: "vocabulary", color: "#cbd5e1" } as VisualEntity,
    profileColor: { id: "profileColor", type: ["http://dataspecer.com/resources/local/visual-model"], representedModel: "profile", color: "#99f6e4" } as VisualEntity,
    group: { id: "group", type: ["visual-group"], content: ["employee"], anchored: true } as VisualEntity,
  };
  return { visual, models };
}
