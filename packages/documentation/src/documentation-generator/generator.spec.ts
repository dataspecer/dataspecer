import { describe, expect, it } from "vitest";
import { CONTROLLED_VOCABULARY_TYPE, DEFAULT_CONTROLLED_VOCABULARY, type ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";
import { createDefaultProfileModelBuilder, type ProfileModelBuilder } from "@dataspecer/profile-model";
import { defaultConfiguration } from "../default-configuration.ts";
import { generateDocumentation } from "./generator.ts";

function createBuilder(): ProfileModelBuilder {
  return createDefaultProfileModelBuilder({ baseIdentifier: "test:", baseIri: null });
}

function vocabulary(id: string, title: string): ControlledVocabulary {
  return {
    ...DEFAULT_CONTROLLED_VOCABULARY,
    id,
    type: [CONTROLLED_VOCABULARY_TYPE],
    title,
    distribution: { downloadUrl: `https://example.com/${id}.rdf`, accessUrl: `https://example.com/${id}` },
  };
}

/**
 * Renders only the parts of the documentation that concern controlled
 * vocabularies, using the partials of the default configuration.
 */
async function render(
  builder: ProfileModelBuilder,
  vocabularies: ControlledVocabulary[],
  template: string,
  language: string = "en",
): Promise<string> {
  return await generateDocumentation(
    {
      label: {},
      models: [
        { id: "primary", isPrimary: true, entities: builder.build().getEntities() as never, baseIri: "", documentationUrl: null, title: null },
        // Every controlled vocabulary is a model of its own.
        ...vocabularies.map(item => ({ id: item.id, isPrimary: false, entities: { [item.id]: item } as never, baseIri: null, documentationUrl: null, title: null })),
      ],
      externalArtifacts: {},
      dsv: {},
      prefixMap: {},
    },
    { template, language, partials: defaultConfiguration.partials },
  );
}

const CLASS_PROFILE_TEMPLATE = `
{{#each semanticEntitiesByType.classProfiles}}[{{id}}: {{> controlled-vocabulary-list vocabularies=resolvedControlledVocabularies}}]{{/each}}`;

/**
 * Lists the assignments of each class profile as `[profile: id=qualifier+replaces ...]`.
 */
const ASSIGNMENT_LIST_TEMPLATE = `{{#each semanticEntitiesByType.classProfiles}}[{{id}}:{{#each resolvedControlledVocabularies}} {{id}}={{qualifier}}{{#if replaces}}+replaces{{/if}}{{/each}}]{{/each}}`;

describe("generateDocumentation controlled vocabularies", () => {

  it("Lists own assignments of a class profile with the vocabulary and qualifier.", async () => {
    const builder = createBuilder();
    const assignment = builder.controlledVocabularyAssignment({ vocabulary: "voc-a", qualifier: "RECOMMENDED" });
    builder.class({ id: "profile", controlledVocabularies: [assignment.identifier] });

    const html = await render(builder, [vocabulary("voc-a", "Vocabulary A")], CLASS_PROFILE_TEMPLATE);

    expect(html).toContain('<a href="https://example.com/voc-a">Vocabulary A</a>');
    expect(html).toContain("(RECOMMENDED)");
  });

  it("Includes assignments inherited from the profiled class profile.", async () => {
    const builder = createBuilder();
    const parentAssignment = builder.controlledVocabularyAssignment({ id: "parent-assignment", vocabulary: "voc-a", qualifier: "MAY" });
    const parent = builder.class({ id: "parent", controlledVocabularies: [parentAssignment.identifier] });
    builder.class({ id: "child" }).profile(parent);

    const html = await render(builder, [vocabulary("voc-a", "Vocabulary A")], ASSIGNMENT_LIST_TEMPLATE);

    expect(html).toContain("[child: parent-assignment=MAY]");
    expect(html).toContain("[parent: parent-assignment=MAY]");
  });

  it("Prefers the own assignment over an inherited one it replaces.", async () => {
    const builder = createBuilder();
    const parentAssignment = builder.controlledVocabularyAssignment({ id: "parent-assignment", vocabulary: "voc-a", qualifier: "MAY" });
    const childAssignment = builder.controlledVocabularyAssignment({
      id: "child-assignment",
      vocabulary: "voc-a",
      qualifier: "MUST",
      replaces: { kind: "local", target: parentAssignment.identifier },
    });
    const parent = builder.class({ id: "parent", controlledVocabularies: [parentAssignment.identifier] });
    builder.class({ id: "child", controlledVocabularies: [childAssignment.identifier] }).profile(parent);

    const html = await render(builder, [vocabulary("voc-a", "Vocabulary A")], ASSIGNMENT_LIST_TEMPLATE);

    expect(html).toContain("[child: child-assignment=MUST+replaces]");
    expect(html).toContain("[parent: parent-assignment=MAY]");
  });

  it("Skips ids that are not assignments.", async () => {
    const builder = createBuilder();
    builder.class({ id: "profile", controlledVocabularies: ["missing"] });

    const html = await render(builder, [], ASSIGNMENT_LIST_TEMPLATE);

    expect(html).toContain("[profile:]");
  });

  it("Shows the vocabulary id when the vocabulary is not available.", async () => {
    const builder = createBuilder();
    const assignment = builder.controlledVocabularyAssignment({ vocabulary: "unknown-vocabulary" });
    builder.class({ id: "profile", controlledVocabularies: [assignment.identifier] });

    const html = await render(builder, [], CLASS_PROFILE_TEMPLATE);

    expect(html).toContain("unknown-vocabulary");
    expect(html).not.toContain("<a href");
  });

  it("Derives the vocabularies of a relationship from its range and groups the usages by qualifier.", async () => {
    const builder = createBuilder();
    const assignment = builder.controlledVocabularyAssignment({ id: "assignment", vocabulary: "voc-a", qualifier: "AT_LEAST_1" });
    const domain = builder.class({ id: "domain" });
    const range = builder.class({ id: "range", controlledVocabularies: [assignment.identifier] });
    builder.property({ id: "relationship", name: { en: "property" } }).domain(domain).range(range);

    const html = await render(
      builder,
      [vocabulary("voc-a", "Vocabulary A")],
      `{{#each semanticEntitiesByType.relationshipProfiles}}[{{id}}:{{#each derivedControlledVocabularies}} {{id}}{{/each}}]{{/each}}
      {{#each controlledVocabularyUsagesByQualifier.AT_LEAST_1}}<{{id}} {{property.id}}>{{/each}}
      {{#if controlledVocabularyUsagesByQualifier.MUST}}unexpected{{/if}}`,
    );

    expect(html).toContain("[relationship: assignment]");
    expect(html).toContain("<assignment relationship>");
    expect(html).not.toContain("unexpected");
  });

  describe("chain of replaced assignments", () => {

    /**
     * Lists the assignments of the class profile `child` the way the class
     * profile documentation does, including the replaced assignments.
     */
    const CHAIN_TEMPLATE = `{{> definitions}}{{#each semanticEntitiesByType.classProfiles}}{{#ifEquals id "child"}}{{> controlled-vocabulary-list vocabularies=resolvedControlledVocabularies showReplaced=true}}{{/ifEquals}}{{/each}}`;

    function collapse(html: string): string {
      return html.replace(/\s+/g, " ");
    }

    it("Shows the assignments replaced through the ancestors as a nested hierarchy.", async () => {
      const builder = createBuilder();
      const grandparentAssignment = builder.controlledVocabularyAssignment({
        id: "grandparent-assignment", classProfile: "grandparent", vocabulary: "voc-a", qualifier: "MAY",
      });
      const parentAssignment = builder.controlledVocabularyAssignment({
        id: "parent-assignment", classProfile: "parent", vocabulary: "voc-a", qualifier: "RECOMMENDED",
        replaces: { kind: "local", target: grandparentAssignment.identifier },
      });
      const childAssignment = builder.controlledVocabularyAssignment({
        id: "child-assignment", classProfile: "child", vocabulary: "voc-a", qualifier: "MUST",
        replaces: { kind: "local", target: parentAssignment.identifier },
      });
      const grandparent = builder.class({ id: "grandparent", name: { en: "Grandparent" }, controlledVocabularies: [grandparentAssignment.identifier] });
      const parent = builder.class({ id: "parent", name: { en: "Parent" }, controlledVocabularies: [parentAssignment.identifier] }).profile(grandparent);
      builder.class({ id: "child", name: { en: "Child" }, controlledVocabularies: [childAssignment.identifier] }).profile(parent);

      const html = collapse(await render(builder, [vocabulary("voc-a", "Vocabulary A")], CHAIN_TEMPLATE));

      // The nearest replaced assignment comes first and each one is nested in the previous.
      expect(html).toMatch(/\(MUST, override\)[\s\S]*replaces controlled vocabulary assignment[\s\S]*\(RECOMMENDED\) of class profile[\s\S]*Parent[\s\S]*replaces controlled vocabulary assignment[\s\S]*\(MAY\) of class profile[\s\S]*Grandparent/);
      // A single assignment is not a list, so only the replaced assignments are nested.
      expect(html.match(/<ul/g)).toHaveLength(2);
      expect(html.match(/<\/ul>/g)).toHaveLength(2);
      expect(html.match(/<li>/g)).toHaveLength(2);
    });

    it("Shows an assignment replaced by a reference to an imported assignment.", async () => {
      const builder = createBuilder();
      const assignment = builder.controlledVocabularyAssignment({
        id: "child-assignment", classProfile: "child", vocabulary: "voc-a",
        replaces: { kind: "imported", iri: "http://example.com/imported-assignment" },
      });
      builder.class({ id: "child", controlledVocabularies: [assignment.identifier] });

      const html = collapse(await render(builder, [vocabulary("voc-a", "Vocabulary A")], CHAIN_TEMPLATE));

      expect(html).toContain('replaces imported assignment <a href="http://example.com/imported-assignment">');
      expect(html.match(/<ul/g)).toHaveLength(1);
    });

    it("Ends the chain when the replaced assignment is not in the models.", async () => {
      const builder = createBuilder();
      const assignment = builder.controlledVocabularyAssignment({
        id: "child-assignment", classProfile: "child", vocabulary: "voc-a",
        replaces: { kind: "local", target: "missing" },
      });
      builder.class({ id: "child", controlledVocabularies: [assignment.identifier] });

      const html = collapse(await render(builder, [vocabulary("voc-a", "Vocabulary A")], CHAIN_TEMPLATE));

      expect(html).not.toContain("replaces controlled vocabulary assignment");
      expect(html).not.toContain("<ul");
    });

    it("Does not show the chain in the list without the option, used for relationships.", async () => {
      const builder = createBuilder();
      const parentAssignment = builder.controlledVocabularyAssignment({ id: "parent-assignment", classProfile: "parent", vocabulary: "voc-a" });
      const childAssignment = builder.controlledVocabularyAssignment({
        id: "child-assignment", classProfile: "child", vocabulary: "voc-a",
        replaces: { kind: "local", target: parentAssignment.identifier },
      });
      const parent = builder.class({ id: "parent", controlledVocabularies: [parentAssignment.identifier] });
      builder.class({ id: "child", controlledVocabularies: [childAssignment.identifier] }).profile(parent);

      const html = await render(
        builder,
        [vocabulary("voc-a", "Vocabulary A")],
        `{{#each semanticEntitiesByType.classProfiles}}{{#ifEquals id "child"}}{{> controlled-vocabulary-list vocabularies=resolvedControlledVocabularies}}{{/ifEquals}}{{/each}}`,
      );

      expect(html).not.toContain("replaces controlled vocabulary assignment");
    });

  });

  describe("list of assignments", () => {

    it("Does not use a bullet list for a single assignment.", async () => {
      const builder = createBuilder();
      const assignment = builder.controlledVocabularyAssignment({ vocabulary: "voc-a" });
      builder.class({ id: "profile", controlledVocabularies: [assignment.identifier] });

      const html = await render(builder, [vocabulary("voc-a", "Vocabulary A")], CLASS_PROFILE_TEMPLATE);

      expect(html).toContain("Vocabulary A");
      expect(html).not.toContain("<ul");
    });

    it("Uses a bullet list for more assignments.", async () => {
      const builder = createBuilder();
      const first = builder.controlledVocabularyAssignment({ vocabulary: "voc-a" });
      const second = builder.controlledVocabularyAssignment({ vocabulary: "voc-b" });
      builder.class({ id: "profile", controlledVocabularies: [first.identifier, second.identifier] });

      const html = await render(
        builder,
        [vocabulary("voc-a", "Vocabulary A"), vocabulary("voc-b", "Vocabulary B")],
        CLASS_PROFILE_TEMPLATE,
      );

      expect(html.match(/<li>/g)).toHaveLength(2);
    });

  });

  describe("usage sentences", () => {

    const LINK = '<a href="https://example.com/voc-a">Vocabulary A</a>';

    /**
     * Renders the usage of the assignment for the class profile, or for the
     * property whose range is the class profile.
     */
    async function renderUsage(
      qualifier: "MUST" | "AT_LEAST_1" | "RECOMMENDED" | "MAY",
      partial: "controlled-vocabulary-class-profile-usage" | "controlled-vocabulary-property-usage",
      language: string = "en",
    ): Promise<string> {
      const builder = createBuilder();
      const assignment = builder.controlledVocabularyAssignment({ id: "assignment", classProfile: "range", vocabulary: "voc-a", qualifier });
      const domain = builder.class({ id: "domain" });
      const range = builder.class({ id: "range", controlledVocabularies: [assignment.identifier] });
      builder.property({ id: "relationship", name: { en: "property" } }).domain(domain).range(range);

      const template = partial === "controlled-vocabulary-class-profile-usage"
        ? `{{#each semanticEntitiesByType.classProfiles}}{{#ifEquals id "range"}}{{> ${partial} vocabularies=resolvedControlledVocabularies}}{{/ifEquals}}{{/each}}`
        : `{{#each semanticEntitiesByType.relationshipProfiles}}{{> ${partial} vocabularies=derivedControlledVocabularies}}{{/each}}`;
      return (await render(builder, [vocabulary("voc-a", "Vocabulary A")], template, language)).replace(/\s+/g, " ");
    }

    it.each([
      ["MUST", `This class profile MUST be represented in data by instances of ${LINK} controlled vocabulary.`],
      ["AT_LEAST_1", `This class profile MUST be represented in data by AT LEAST ONE instance of ${LINK} controlled vocabulary.`],
      ["RECOMMENDED", `It is RECOMMENDED that this class profile is represented in data by instances of ${LINK} controlled vocabulary.`],
      ["MAY", `This class profile MAY be represented in data by instances of ${LINK} controlled vocabulary.`],
    ] as const)("Describes the %s usage for a class profile.", async (qualifier, sentence) => {
      const html = await renderUsage(qualifier, "controlled-vocabulary-class-profile-usage");
      expect(html).toContain(sentence);
    });

    it.each([
      ["MUST", `The property MUST use as range values codes from ${LINK}.`, "Validation systems SHOULD produce errors."],
      ["AT_LEAST_1", `The property MUST have AT LEAST ONE value from ${LINK}.`, "This expectation makes the value space minimally constrained."],
      ["RECOMMENDED", `The property IS RECOMMENDED to use as range values codes from ${LINK}.`, "Recommending means expressing a strong preference."],
      ["MAY", `The property MAY use as range values codes from ${LINK}.`, "No validation in this case is also acceptable."],
    ] as const)("Describes the %s usage for a property.", async (qualifier, sentence, explanation) => {
      const html = await renderUsage(qualifier, "controlled-vocabulary-property-usage");
      expect(html).toContain(sentence);
      expect(html).toContain(explanation);
    });

    it("Describes the usage of a property in Czech.", async () => {
      const html = await renderUsage("RECOMMENDED", "controlled-vocabulary-property-usage", "cs");
      expect(html).toContain(`Pro vlastnost se DOPORUČUJE používat jako obor hodnot položky z ${LINK}.`);
      expect(html).not.toContain("The property");
    });

    it("Describes the usage in Czech.", async () => {
      const html = await renderUsage("MUST", "controlled-vocabulary-class-profile-usage", "cs");
      expect(html).toContain(`Tento profil třídy MUSÍ být v datech reprezentován položkami řízeného slovníku ${LINK}.`);
      expect(html).not.toContain("This class profile");
    });

  });

});
