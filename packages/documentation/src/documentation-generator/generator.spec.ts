import { describe, expect, it } from "vitest";
import { CONTROLLED_VOCABULARY_TYPE, DEFAULT_CONTROLLED_VOCABULARY, type ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";
import { createDefaultProfileModelBuilder, type ProfileModelBuilder } from "@dataspecer/profile-model";
import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
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
  nestedSpecifications: { builder: ProfileModelBuilder, documentationUrl: string }[] = [],
): Promise<string> {
  return await generateDocumentation(
    {
      label: {},
      models: [
        { id: "primary", isPrimary: true, entities: builder.build().getEntities() as never, baseIri: "", documentationUrl: null, title: null },
        // Nested specifications have their own documentation.
        ...nestedSpecifications.map((item, index) => ({ id: `nested-${index}`, isPrimary: false, entities: item.builder.build().getEntities() as never, baseIri: "", documentationUrl: item.documentationUrl, title: null })),
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
    const assignment = builder.controlledVocabularyAssignment({ vocabulary: "voc-a", qualifier: "recommended" });
    builder.class({ id: "profile", controlledVocabularies: [assignment.identifier] });

    const html = await render(builder, [vocabulary("voc-a", "Vocabulary A")], CLASS_PROFILE_TEMPLATE);

    expect(html).toContain('<a href="#cv-Vocabulary-A">Vocabulary A</a> (RECOMMENDED)');
  });

  it("Includes assignments inherited from the profiled class profile.", async () => {
    const builder = createBuilder();
    const parentAssignment = builder.controlledVocabularyAssignment({ id: "parent-assignment", vocabulary: "voc-a", qualifier: "may" });
    const parent = builder.class({ id: "parent", controlledVocabularies: [parentAssignment.identifier] });
    builder.class({ id: "child" }).profile(parent);

    const html = await render(builder, [vocabulary("voc-a", "Vocabulary A")], ASSIGNMENT_LIST_TEMPLATE);

    expect(html).toContain("[child: parent-assignment=may]");
    expect(html).toContain("[parent: parent-assignment=may]");
  });

  it("Prefers the own assignment over an inherited one it replaces.", async () => {
    const builder = createBuilder();
    const parentAssignment = builder.controlledVocabularyAssignment({ id: "parent-assignment", vocabulary: "voc-a", qualifier: "may" });
    const childAssignment = builder.controlledVocabularyAssignment({
      id: "child-assignment",
      vocabulary: "voc-a",
      qualifier: "must",
      replaces: { kind: "local", target: parentAssignment.identifier },
    });
    const parent = builder.class({ id: "parent", controlledVocabularies: [parentAssignment.identifier] });
    builder.class({ id: "child", controlledVocabularies: [childAssignment.identifier] }).profile(parent);

    const html = await render(builder, [vocabulary("voc-a", "Vocabulary A")], ASSIGNMENT_LIST_TEMPLATE);

    expect(html).toContain("[child: child-assignment=must+replaces]");
    expect(html).toContain("[parent: parent-assignment=may]");
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
    const assignment = builder.controlledVocabularyAssignment({ id: "assignment", vocabulary: "voc-a", qualifier: "at-least-one" });
    const domain = builder.class({ id: "domain" });
    const range = builder.class({ id: "range", controlledVocabularies: [assignment.identifier] });
    builder.property({ id: "relationship", name: { en: "property" } }).domain(domain).range(range);

    const html = await render(
      builder,
      [vocabulary("voc-a", "Vocabulary A")],
      `{{#each semanticEntitiesByType.relationshipProfiles}}[{{id}}:{{#each derivedControlledVocabularies}} {{id}}{{/each}}]{{/each}}
      {{#each controlledVocabularyUsagesByQualifier.[at-least-one]}}<{{property.id}} {{#each vocabularies}}{{id}}{{/each}}>{{/each}}
      {{#if controlledVocabularyUsagesByQualifier.must}}unexpected{{/if}}`,
    );

    expect(html).toContain("[relationship: assignment]");
    expect(html).toContain("<relationship assignment>");
    expect(html).not.toContain("unexpected");
  });

  describe("usage rows", () => {

    /**
     * Lists the rows of the qualifier as `<domains > range : vocabularies>`.
     */
    const ROWS_TEMPLATE = (qualifier: string) =>
      `{{#each controlledVocabularyUsagesByQualifier.${qualifier}}}<{{property.id}} [{{#each domains}}{{.}} {{/each}}]> {{range}} : {{#each vocabularies}}{{id}} {{/each}}>{{/each}}`;

    function collapse(html: string): string {
      return html.replace(/\s+/g, " ");
    }

    it("Merges the relationships of a property with different domains into one row.", async () => {
      const builder = createBuilder();
      const assignment = builder.controlledVocabularyAssignment({ id: "assignment", vocabulary: "voc-a", qualifier: "may" });
      const range = builder.class({ id: "range", controlledVocabularies: [assignment.identifier] });
      const domainA = builder.class({ id: "domain-a" });
      const domainB = builder.class({ id: "domain-b" });
      builder.property({ id: "relationship-a", iri: "http://example.com/coverage" }).domain(domainA).range(range);
      builder.property({ id: "relationship-b", iri: "http://example.com/coverage" }).domain(domainB).range(range);

      const html = collapse(await render(builder, [vocabulary("voc-a", "Vocabulary A")], ROWS_TEMPLATE("may")));

      expect(html.match(/<relationship-/g)).toHaveLength(1);
      expect(html).toContain("<relationship-a [domain-a domain-b ]> range : assignment >");
    });

    it("Keeps properties with different IRIs or different ranges in separate rows.", async () => {
      const builder = createBuilder();
      const assignment = builder.controlledVocabularyAssignment({ id: "assignment", vocabulary: "voc-a", qualifier: "may" });
      const rangeA = builder.class({ id: "range-a", controlledVocabularies: [assignment.identifier] });
      const rangeB = builder.class({ id: "range-b", controlledVocabularies: [assignment.identifier] });
      const domain = builder.class({ id: "domain" });
      builder.property({ id: "same-iri-a", iri: "http://example.com/one" }).domain(domain).range(rangeA);
      builder.property({ id: "same-iri-b", iri: "http://example.com/one" }).domain(domain).range(rangeB);
      builder.property({ id: "other-iri", iri: "http://example.com/two" }).domain(domain).range(rangeA);

      const html = collapse(await render(builder, [vocabulary("voc-a", "Vocabulary A")], ROWS_TEMPLATE("may")));

      expect(html.match(/<(same-iri-a|same-iri-b|other-iri) /g)).toHaveLength(3);
    });

    it("Lists all vocabularies of the range in the row and each one once.", async () => {
      const builder = createBuilder();
      const first = builder.controlledVocabularyAssignment({ id: "first", vocabulary: "voc-a", qualifier: "may" });
      const second = builder.controlledVocabularyAssignment({ id: "second", vocabulary: "voc-b", qualifier: "may" });
      const range = builder.class({ id: "range", controlledVocabularies: [first.identifier, second.identifier] });
      const domainA = builder.class({ id: "domain-a" });
      const domainB = builder.class({ id: "domain-b" });
      builder.property({ id: "relationship-a", iri: "http://example.com/coverage" }).domain(domainA).range(range);
      builder.property({ id: "relationship-b", iri: "http://example.com/coverage" }).domain(domainB).range(range);

      const html = collapse(await render(
        builder,
        [vocabulary("voc-a", "Vocabulary A"), vocabulary("voc-b", "Vocabulary B")],
        ROWS_TEMPLATE("may"),
      ));

      expect(html).toContain("range : first second >");
      expect(html.match(/first/g)).toHaveLength(1);
    });

    it("Renders the domains, range and vocabularies with links, and marks overrides inline.", async () => {
      const builder = createBuilder();
      const parentAssignment = builder.controlledVocabularyAssignment({ id: "parent-assignment", classProfile: "parent-range", vocabulary: "voc-a", qualifier: "may" });
      const childAssignment = builder.controlledVocabularyAssignment({
        id: "child-assignment", classProfile: "range", vocabulary: "voc-b", qualifier: "may",
        replaces: { kind: "local", target: parentAssignment.identifier },
      });
      const parentRange = builder.class({ id: "parent-range", controlledVocabularies: [parentAssignment.identifier] });
      const range = builder.class({ id: "range", name: { en: "Range class" }, controlledVocabularies: [childAssignment.identifier] }).profile(parentRange);
      const domainA = builder.class({ id: "domain-a", name: { en: "Domain A" } });
      const domainB = builder.class({ id: "domain-b", name: { en: "Domain B" } });
      builder.property({ id: "relationship-a", iri: "http://example.com/coverage", name: { en: "coverage" } }).domain(domainA).range(range);
      builder.property({ id: "relationship-b", iri: "http://example.com/coverage", name: { en: "coverage" } }).domain(domainB).range(range);

      const html = collapse(await render(
        builder,
        [vocabulary("voc-a", "Vocabulary A"), vocabulary("voc-b", "Vocabulary B")],
        `{{> definitions}}{{> controlled-vocabulary-usage-table rows=controlledVocabularyUsagesByQualifier.may}}`,
      ));

      expect(html).toContain("Property domain");
      expect(html.match(/<tr>/g)).toHaveLength(2);
      expect(html).toMatch(/Domain A<\/a>, <a[^>]*>Domain B<\/a>/);
      expect(html).toMatch(/<div><a href="#cv-Vocabulary-B">Vocabulary B<\/a> \(override\)<\/div>/);
      expect(html).not.toContain("Override");
    });

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
        id: "grandparent-assignment", classProfile: "grandparent", vocabulary: "voc-a", qualifier: "may",
      });
      const parentAssignment = builder.controlledVocabularyAssignment({
        id: "parent-assignment", classProfile: "parent", vocabulary: "voc-a", qualifier: "recommended",
        replaces: { kind: "local", target: grandparentAssignment.identifier },
      });
      const childAssignment = builder.controlledVocabularyAssignment({
        id: "child-assignment", classProfile: "child", vocabulary: "voc-a", qualifier: "must",
        replaces: { kind: "local", target: parentAssignment.identifier },
      });
      const grandparent = builder.class({ id: "grandparent", name: { en: "Grandparent" }, controlledVocabularies: [grandparentAssignment.identifier] });
      const parent = builder.class({ id: "parent", name: { en: "Parent" }, controlledVocabularies: [parentAssignment.identifier] }).profile(grandparent);
      builder.class({ id: "child", name: { en: "Child" }, controlledVocabularies: [childAssignment.identifier] }).profile(parent);

      const html = collapse(await render(builder, [vocabulary("voc-a", "Vocabulary A")], CHAIN_TEMPLATE));

      // The nearest replaced assignment comes first and each one is nested in the previous.
      expect(html).toMatch(/\(MUST, override\)[\s\S]*replaces controlled vocabulary assignment[\s\S]*\(RECOMMENDED\) of class profile[\s\S]*Parent[\s\S]*replaces controlled vocabulary assignment[\s\S]*\(MAY\) of class profile[\s\S]*Grandparent/);
      // A single assignment is not a list, so only the replaced assignments are nested.
      expect(html).toContain("</a> (MUST, override)");
      expect(html).toContain("</a> (RECOMMENDED) of class profile");
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

  describe("list of controlled vocabularies", () => {

    const LIST_TEMPLATE = "{{> controlled-vocabularies-table}}";

    function collapse(html: string): string {
      return html.replace(/\s+/g, " ");
    }

    it("Lists each used vocabulary once with its name, IRI and links.", async () => {
      const builder = createBuilder();
      const first = builder.controlledVocabularyAssignment({ vocabulary: "voc-a", qualifier: "must" });
      const second = builder.controlledVocabularyAssignment({ vocabulary: "voc-a", qualifier: "may" });
      builder.class({ id: "profile-1", controlledVocabularies: [first.identifier] });
      builder.class({ id: "profile-2", controlledVocabularies: [second.identifier] });

      const html = collapse(await render(
        builder,
        [{ ...vocabulary("voc-a", "Vocabulary A"), conformsToSkos: true, references: "https://example.com/scheme", documentation: "https://example.com/docs" }],
        LIST_TEMPLATE,
      ));

      expect(html.match(/<tr id=/g)).toHaveLength(1);
      expect(html).toContain('<tr id="cv-Vocabulary-A"> <td>Vocabulary A</td> <td>https://example.com/scheme</td>');
      expect(html).toContain('<a href="https://example.com/voc-a">Access URL</a>');
      expect(html).toContain('<a href="https://example.com/docs">Documentation</a>');
    });

    it("Shows the IRI only for vocabularies conforming to SKOS and the documentation link only when present.", async () => {
      const builder = createBuilder();
      const assignment = builder.controlledVocabularyAssignment({ vocabulary: "voc-a" });
      builder.class({ id: "profile", controlledVocabularies: [assignment.identifier] });

      const html = collapse(await render(
        builder,
        [{ ...vocabulary("voc-a", "Vocabulary A"), conformsToSkos: false, references: "https://example.com/download", documentation: null }],
        LIST_TEMPLATE,
      ));

      expect(html).not.toContain("https://example.com/download");
      expect(html).not.toContain("Documentation");
    });

    it("Lists a vocabulary of an assignment no relationship points to, and sorts by name.", async () => {
      const builder = createBuilder();
      const first = builder.controlledVocabularyAssignment({ vocabulary: "voc-b" });
      const second = builder.controlledVocabularyAssignment({ vocabulary: "voc-a" });
      builder.class({ id: "profile", controlledVocabularies: [first.identifier, second.identifier] });

      const html = await render(
        builder,
        [vocabulary("voc-b", "Vocabulary B"), vocabulary("voc-a", "Vocabulary A")],
        LIST_TEMPLATE,
      );

      expect(html.indexOf("Vocabulary A")).toBeGreaterThan(-1);
      expect(html.indexOf("Vocabulary A")).toBeLessThan(html.indexOf("Vocabulary B"));
    });

    it("Does not list vocabularies that no assignment uses.", async () => {
      const builder = createBuilder();
      const assignment = builder.controlledVocabularyAssignment({ vocabulary: "voc-a" });
      builder.class({ id: "profile", controlledVocabularies: [assignment.identifier] });

      const html = await render(
        builder,
        [vocabulary("voc-a", "Vocabulary A"), vocabulary("voc-unused", "Unused vocabulary")],
        LIST_TEMPLATE,
      );

      expect(html).toContain("Vocabulary A");
      expect(html).not.toContain("Unused vocabulary");
    });

    it("Lists a vocabulary used only by a replaced assignment.", async () => {
      const builder = createBuilder();
      const parentAssignment = builder.controlledVocabularyAssignment({ id: "parent-assignment", classProfile: "parent", vocabulary: "voc-a" });
      const childAssignment = builder.controlledVocabularyAssignment({
        id: "child-assignment", classProfile: "child", vocabulary: "voc-b",
        replaces: { kind: "local", target: parentAssignment.identifier },
      });
      const parent = builder.class({ id: "parent", controlledVocabularies: [parentAssignment.identifier] });
      builder.class({ id: "child", controlledVocabularies: [childAssignment.identifier] }).profile(parent);

      const html = await render(
        builder,
        [vocabulary("voc-a", "Vocabulary A"), vocabulary("voc-b", "Vocabulary B")],
        LIST_TEMPLATE,
      );

      expect(html).toContain("Vocabulary A");
      expect(html).toContain("Vocabulary B");
    });

    it("Makes the anchors of vocabularies with the same title unique.", async () => {
      const builder = createBuilder();
      const first = builder.controlledVocabularyAssignment({ vocabulary: "voc-a" });
      const second = builder.controlledVocabularyAssignment({ vocabulary: "voc-b" });
      builder.class({ id: "profile", controlledVocabularies: [first.identifier, second.identifier] });

      const html = await render(
        builder,
        [vocabulary("voc-a", "Same title"), vocabulary("voc-b", "Same title")],
        `{{#each controlledVocabularies}}[{{id}}={{cvAnchor id}}]{{/each}}`,
      );

      expect(html).toContain("[voc-a=cv-Same-title]");
      expect(html).toContain("[voc-b=cv-Same-title-2]");
    });

    it("Links to the row of the vocabulary in the list.", async () => {
      const builder = createBuilder();
      const assignment = builder.controlledVocabularyAssignment({ vocabulary: "voc-a" });
      builder.class({ id: "profile", controlledVocabularies: [assignment.identifier] });

      const html = collapse(await render(builder, [vocabulary("voc-a", "Vocabulary A")], `${CLASS_PROFILE_TEMPLATE}${LIST_TEMPLATE}`));

      expect(html).toContain('<a href="#cv-Vocabulary-A">Vocabulary A</a>');
      expect(html).toContain('<tr id="cv-Vocabulary-A">');
    });

  });

  describe("usage sentences", () => {

    const LINK = '<a href="#cv-Vocabulary-A">Vocabulary A</a>';

    /**
     * Renders the usage of the assignment for the class profile, or for the
     * property whose range is the class profile.
     */
    async function renderUsage(
      qualifier: Qualifier,
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
      ["must", `This class profile MUST be represented in data by instances of ${LINK} controlled vocabulary.`],
      ["at-least-one", `This class profile MUST be represented in data by AT LEAST ONE instance of ${LINK} controlled vocabulary.`],
      ["recommended", `It is RECOMMENDED that this class profile is represented in data by instances of ${LINK} controlled vocabulary.`],
      ["may", `This class profile MAY be represented in data by instances of ${LINK} controlled vocabulary.`],
    ] as const)("Describes the %s usage for a class profile.", async (qualifier, sentence) => {
      const html = await renderUsage(qualifier, "controlled-vocabulary-class-profile-usage");
      expect(html).toContain(sentence);
    });

    it.each([
      ["must", `The property MUST use as range values codes from ${LINK}.`, "Validation systems SHOULD produce errors."],
      ["at-least-one", `The property MUST have AT LEAST ONE value from ${LINK}.`, "This expectation makes the value space minimally constrained."],
      ["recommended", `The property IS RECOMMENDED to use as range values codes from ${LINK}.`, "Recommending means expressing a strong preference."],
      ["may", `The property MAY use as range values codes from ${LINK}.`, "No validation in this case is also acceptable."],
    ] as const)("Describes the %s usage for a property.", async (qualifier, sentence, explanation) => {
      const html = await renderUsage(qualifier, "controlled-vocabulary-property-usage");
      expect(html).toContain(sentence);
      expect(html).toContain(explanation);
    });

    it("Describes the usage of a property in Czech.", async () => {
      const html = await renderUsage("recommended", "controlled-vocabulary-property-usage", "cs");
      expect(html).toContain(`Pro vlastnost se DOPORUČUJE používat jako obor hodnot položky z ${LINK}.`);
      expect(html).not.toContain("The property");
    });

    it("Describes the usage in Czech.", async () => {
      const html = await renderUsage("must", "controlled-vocabulary-class-profile-usage", "cs");
      expect(html).toContain(`Tento profil třídy MUSÍ být v datech reprezentován položkami řízeného slovníku ${LINK}.`);
      expect(html).not.toContain("This class profile");
    });

  });

  describe("usage table", () => {

    /**
     * Renders the usage table for a property whose range is a class profile
     * that has the assignment of its own or inherited from a profiled class profile.
     */
    async function renderUsageTable(inherited: boolean): Promise<string> {
      const builder = createBuilder();
      const assignment = builder.controlledVocabularyAssignment({
        id: "assignment", classProfile: inherited ? "owner" : "range", vocabulary: "voc-a", qualifier: "must",
      });
      const domain = builder.class({ id: "domain", name: { en: "Domain class" } });
      const owner = builder.class({ id: "owner", name: { en: "Owner class" }, controlledVocabularies: inherited ? [assignment.identifier] : [] });
      const range = builder.class({ id: "range", name: { en: "Range class" }, controlledVocabularies: inherited ? [] : [assignment.identifier] }).profile(owner);
      builder.property({ id: "relationship", name: { en: "property" } }).domain(domain).range(range);

      return (await render(
        builder,
        [vocabulary("voc-a", "Vocabulary A")],
        `{{> definitions}}{{> controlled-vocabulary-usage-table rows=controlledVocabularyUsagesByQualifier.must}}`,
      )).replace(/\s+/g, " ");
    }

    // The domain and the range are separate columns of the row.
    const DOMAIN_CELL = /<td><a[^>]*>Domain class<\/a><\/td> <td><a[^>]*>Range class<\/a><\/td>/;

    it("Shows the domain and the class profile that is the range of the property.", async () => {
      const html = await renderUsageTable(false);

      expect(html).toMatch(DOMAIN_CELL);
    });

    it("Shows the range class profile, not the one that owns an inherited assignment.", async () => {
      const html = await renderUsageTable(true);

      expect(html).toMatch(DOMAIN_CELL);
      expect(html).not.toContain("Owner class");
    });

  });

  describe("origin of an inherited assignment", () => {

    const CLASS_PROFILE_ROW_TEMPLATE = `{{> definitions}}{{#each semanticEntitiesByType.classProfiles}}{{#ifEquals id "child"}}{{> controlled-vocabulary-list vocabularies=resolvedControlledVocabularies showReplaced=true}}{{/ifEquals}}{{/each}}`;

    it("Links the class profile in the nested specification that the assignment is taken from.", async () => {
      const nested = createBuilder();
      const assignment = nested.controlledVocabularyAssignment({ id: "assignment", classProfile: "owner", vocabulary: "voc-a", qualifier: "must" });
      const owner = nested.class({ id: "owner", iri: "http://example.com/nested#Owner", name: { en: "Owner class" }, controlledVocabularies: [assignment.identifier] });

      const builder = createBuilder();
      builder.class({ id: "child", name: { en: "Child class" } }).profile(owner);

      const html = (await render(
        builder,
        [vocabulary("voc-a", "Vocabulary A")],
        CLASS_PROFILE_ROW_TEMPLATE,
        "en",
        [{ builder: nested, documentationUrl: "https://example.com/nested/" }],
      )).replace(/\s+/g, " ");

      expect(html).toContain("Taken from the profiled class profile");
      expect(html).toContain('<a href="https://example.com/nested/#Owner">Owner class</a>');
    });

    it("Says it in Czech.", async () => {
      const nested = createBuilder();
      const assignment = nested.controlledVocabularyAssignment({ id: "assignment", classProfile: "owner", vocabulary: "voc-a" });
      const owner = nested.class({ id: "owner", name: { en: "Owner class" }, controlledVocabularies: [assignment.identifier] });
      const builder = createBuilder();
      builder.class({ id: "child" }).profile(owner);

      const html = await render(
        builder,
        [vocabulary("voc-a", "Vocabulary A")],
        CLASS_PROFILE_ROW_TEMPLATE,
        "cs",
        [{ builder: nested, documentationUrl: "https://example.com/nested/" }],
      );

      expect(html).toContain("Převzato z profilovaného profilu třídy");
      expect(html).not.toContain("Taken from");
    });

    it("Does not say it for an assignment of the class profile itself.", async () => {
      const builder = createBuilder();
      const assignment = builder.controlledVocabularyAssignment({ id: "assignment", classProfile: "child", vocabulary: "voc-a" });
      builder.class({ id: "child", controlledVocabularies: [assignment.identifier] });

      const html = await render(builder, [vocabulary("voc-a", "Vocabulary A")], CLASS_PROFILE_ROW_TEMPLATE);

      expect(html).not.toContain("Taken from");
    });

    it("Does not say it in the list without the option, used for properties.", async () => {
      const nested = createBuilder();
      const assignment = nested.controlledVocabularyAssignment({ id: "assignment", classProfile: "owner", vocabulary: "voc-a" });
      const owner = nested.class({ id: "owner", controlledVocabularies: [assignment.identifier] });
      const builder = createBuilder();
      builder.class({ id: "child" }).profile(owner);

      const html = await render(
        builder,
        [vocabulary("voc-a", "Vocabulary A")],
        `{{#each semanticEntitiesByType.classProfiles}}{{#ifEquals id "child"}}{{> controlled-vocabulary-list vocabularies=resolvedControlledVocabularies}}{{/ifEquals}}{{/each}}`,
        "en",
        [{ builder: nested, documentationUrl: "https://example.com/nested/" }],
      );

      expect(html).toContain("Vocabulary A");
      expect(html).not.toContain("Taken from");
    });

  });

});
