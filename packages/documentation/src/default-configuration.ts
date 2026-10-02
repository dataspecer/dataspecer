import { DocumentationConfiguration } from "./configuration.ts";

export const defaultConfiguration: DocumentationConfiguration = {
  partials: {
    // [DOCUMENTATION_MAIN_TEMPLATE_PARTIAL]
    abstract: `<section id="abstract">
  <p>
  {{#iflng "cs"}}Tento soubor dokumentuje{{lng}}This file documents{{/iflng}}
  {{#translate label}}<strong>{{translation}}</strong>{{#if otherLang}} (@{{otherLang}}){{/if}}{{else}}<i>{{#iflng "cs"}}beze jména{{lng}}without assigned name{{/iflng}}</i>{{/translate}}.</p>
</section>`,
    introduction: `<section>
  {{#iflng "cs"}}<h2>Úvod</h2>
  <p>Toto je úvod</p>
  {{lng}}
  <h2>Introduction</h2>
  <p>This is introduction</p>
  {{/iflng}}
</section>`,
    localBiblio: `localBiblio: {
      "DCAT-AP": {
          title: "DCAT Application Profile for data portals in Europe",
          href: "https://semiceu.github.io/DCAT-AP/releases/3.0.1/",
          date: "2024"
      },
      "GeoDCAT-AP": {
          title: "GeoDCAT Application Profile for data portals in Europe",
          href: "https://semiceu.github.io/GeoDCAT-AP/releases/3.0.0/",
          date: "2024"
      },
      "DCAT-AP-HVD": {
          title: "DCAT-AP HVD Application Profile",
          href: "https://semiceu.github.io/DCAT-AP/releases/3.0.0-hvd/",
          date: "2024"
      }
  },`,
    specification: `{{> definitions}}
<!DOCTYPE html>
<html {{#iflng "cs"}}lang="cs"{{lng}}lang="en"{{/iflng}}>
  <head>
    {{> html-head}}
  </head>
  <body>
    <p class="copyright"></p>
    {{> abstract}}

    {{> introduction}}

    <section>
      <h2>{{#iflng "cs"}}Přehled{{lng}}Overview{{/iflng}}</h2>

      {{#each externalArtifacts.svg}}
        <a href="{{{relativePath URL}}}">
          <figure>
            <img src="{{{relativePath URL}}}" alt="{{translate ./label}}" />
            <figcaption>{{translate ./label}}</figcaption>
          </figure>
        </a>
      {{/each}}
    </section>

    {{#if classProfilesByTags.[https://w3id.org/dsv/class-role#main]}}
      <section>
        <h2>{{#iflng "cs"}}Hlavní profily tříd{{lng}}Main class profiles{{/iflng}}</h2>

        {{#each classProfilesByTags.[https://w3id.org/dsv/class-role#main]}}
          {{> class-profile}}
        {{/each}}
      </section>
    {{/if}}

    {{#if classProfilesByTags.[https://w3id.org/dsv/class-role#supportive]}}
      <section>
        <h2>{{#iflng "cs"}}Podpůrné profily třídy{{lng}}Supportive class profiles{{/iflng}}</h2>

        {{#each classProfilesByTags.[https://w3id.org/dsv/class-role#supportive]}}
          {{> class-profile}}
        {{/each}}
      </section>
    {{/if}}

    {{#if (non-empty classProfilesByTags.default)}}
      <section>
        {{#if (or classProfilesByTags.[https://w3id.org/dsv/class-role#main] classProfilesByTags.[https://w3id.org/dsv/class-role#supportive])}}
          <h2>{{#iflng "cs"}}Nezařazené profily tříd{{lng}}Other class profiles{{/iflng}}</h2>
        {{else}}
          <h2>{{#iflng "cs"}}Profily tříd{{lng}}Class profiles{{/iflng}}</h2>
        {{/if}}

        {{#each classProfilesByTags.default}}
          {{> class-profile}}
        {{/each}}
      </section>
    {{/if}}

    {{#if semanticEntitiesByType.classes}}
      <section>
        <h2>{{#iflng "cs"}}Třídy{{lng}}Classes{{/iflng}}</h2>

        {{#each locallyDefinedSemanticEntity}}
          {{#ifEquals type.[0] "class"}}
            {{> semantic-model-class}}
          {{/ifEquals}}
        {{/each}}
      </section>
    {{/if}}

    {{#if semanticEntitiesByType.relationships}}
      <section>
        <h2>{{#iflng "cs"}}Vlastnosti{{lng}}Properties{{/iflng}}</h2>
        {{#each locallyDefinedSemanticEntity}}
          {{#ifEquals type.[0] "relationship"}}
            {{> semantic-model-relationship}}
          {{/ifEquals}}
        {{/each}}
      </section>
    {{/if}}

    {{#structureModels}}
      <section id="{{anchor}}">
      <h2>
        {{#iflng "cs"}}Specifikace struktury pro{{lng}}Data structure specification for{{/iflng}}
        {{translate humanLabel}}
      </h2>
      <p>{{translate humanDescription}}</p>

      {{#artifacts}}{{#getDocumentation}}{{> (useTemplate)}}{{/getDocumentation}}{{/artifacts}}
      </section>
    {{/structureModels}}

    {{> used-prefixes}}

    {{#if (or controlledVocabularyUsagesByQualifier.must controlledVocabularyUsagesByQualifier.[at-least-one] controlledVocabularyUsagesByQualifier.recommended controlledVocabularyUsagesByQualifier.may)}}
      <section>
        <h2>{{#iflng "cs"}}Řízené slovníky{{lng}}Controlled vocabularies{{/iflng}}</h2>

        {{#if controlledVocabularyUsagesByQualifier.must}}
          <section>
            <h3>{{#iflng "cs"}}Vlastnosti s řízenými slovníky, které MUSÍ být použity{{lng}}Properties with controlled vocabularies that MUST be used{{/iflng}}</h3>
            {{> controlled-vocabulary-usage-table rows=controlledVocabularyUsagesByQualifier.must}}
          </section>
        {{/if}}

        {{#if controlledVocabularyUsagesByQualifier.[at-least-one]}}
          <section>
            <h3>{{#iflng "cs"}}Vlastnosti s řízenými slovníky, ze kterých MUSÍ být použit alespoň jeden{{lng}}Properties with controlled vocabularies where AT LEAST ONE must be used{{/iflng}}</h3>
            {{> controlled-vocabulary-usage-table rows=controlledVocabularyUsagesByQualifier.[at-least-one]}}
          </section>
        {{/if}}

        {{#if controlledVocabularyUsagesByQualifier.recommended}}
          <section>
            <h3>{{#iflng "cs"}}Vlastnosti s DOPORUČENÝMI řízenými slovníky{{lng}}Properties with RECOMMENDED controlled vocabularies{{/iflng}}</h3>
            {{> controlled-vocabulary-usage-table rows=controlledVocabularyUsagesByQualifier.recommended}}
          </section>
        {{/if}}

        {{#if controlledVocabularyUsagesByQualifier.may}}
          <section>
            <h3>{{#iflng "cs"}}Vlastnosti s řízenými slovníky, které MOHOU být použity{{lng}}Properties with controlled vocabularies that MAY be used{{/iflng}}</h3>
            {{> controlled-vocabulary-usage-table rows=controlledVocabularyUsagesByQualifier.may}}
          </section>
        {{/if}}
      </section>
    {{/if}}

    {{> attachments}}
  </body>
</html>`,

    "semantic-model-relationship": `<section id="{{anchor}}">
  <h4>{{#translate ends.1.name}}{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}{{else}}<i>{{#iflng "cs"}}beze jména{{lng}}without assigned name{{/iflng}}</i>{{/translate}}</h4>

  <table class="def">
    <tr>
      <td>IRI</td>
      <td><a href="{{{ends.1.iri}}}">{{prefixed ends.1.iri}}</a></td>
    </tr>
    {{#translate ends.1.name}}
    <tr>
      <td>{{#iflng "cs"}}Název{{lng}}Label{{/iflng}}</td>
      <td>{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}</td>
    </tr>
    {{/translate}}
    {{#translate ends.1.description}}
    <tr>
      <td>{{#iflng "cs"}}Definice{{lng}}Definition{{/iflng}}</td>
      <td>{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}</td>
    </tr>
    {{/translate}}
    <tr>
      <td>{{#iflng "cs"}}Definiční obor{{lng}}Domain{{/iflng}}</td>
      <td>
        <a href="{{{href ends.0.concept}}}">{{#semanticEntity ends.0.concept}}{{#translate name}}{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}{{else}}<i>{{#iflng "cs"}}beze jména{{lng}}without assigned name{{/iflng}}</i>{{/translate}}{{/semanticEntity}}</a>

        {{cardinality ends.0.cardinality}}
      </td>
    </tr>
    <tr>
      <td>{{#iflng "cs"}}Obor hodnot{{lng}}Range{{/iflng}}</td>
      <td>
        <a href="{{{href ends.1.concept}}}">{{#semanticEntity ends.1.concept}}{{#translate name}}{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}{{else}}<i>{{#iflng "cs"}}beze jména{{lng}}without assigned name{{/iflng}}</i>{{/translate}}{{else}}{{prefixed .}}{{/semanticEntity}}</a>

        {{cardinality ends.1.cardinality}}
      </td>
      </tr>
      {{#if (parentClasses id)}}
      <tr>
        <td>{{#iflng "cs"}}Rodičovské vlastnosti{{lng}}Subproperty of{{/iflng}}</td>
        <td>{{#each (parentClasses id)}}{{relation}}{{#unless @last}}, {{/unless}}{{/each}}</td>
      </tr>
      {{/if}}
      {{#if (subClasses id)}}
      <tr>
        <td>{{#iflng "cs"}}Podvlastnosti z tohoto slovníku{{lng}}Subproperties{{/iflng}}</td>
        <td>{{#each (subClasses id)}}{{relation}}{{#unless @last}}, {{/unless}}{{/each}}</td>
      </tr>
      {{/if}}
  </table>

</section>`,

    "semantic-model-class": `<section id="{{anchor}}">
  <h4>{{#translate name}}{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}{{else}}<i>{{#iflng "cs"}}beze jména{{lng}}without assigned name{{/iflng}}</i>{{/translate}}</h4>

  <table class="def">
    <tr>
      <td>IRI</td>
      <td><a href="{{{iri}}}">{{prefixed iri}}</a></td>
    </tr>
    {{#translate name}}
    <tr>
      <td>{{#iflng "cs"}}Název{{lng}}Label{{/iflng}}</td>
      <td>{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}</td>
    </tr>
    {{/translate}}
    {{#translate description}}
    <tr>
      <td>{{#iflng "cs"}}Definice{{lng}}Definition{{/iflng}}</td>
      <td>{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}</td>
    </tr>
    {{/translate}}
    {{#if (parentClasses id)}}
    <tr>
      <td>{{#iflng "cs"}}Rodičovské třídy{{lng}}Subclass of{{/iflng}}</td>
      <td>{{#each (parentClasses id)}}{{class}}{{#unless @last}}, {{/unless}}{{/each}}</td>
    </tr>
    {{/if}}
    {{#if (subClasses id)}}
    <tr>
      <td>{{#iflng "cs"}}Podtřídy z tohoto slovníku{{lng}}Subclasses{{/iflng}}</td>
      <td>{{#each (subClasses id)}}{{class}}{{#unless @last}}, {{/unless}}{{/each}}</td>
    </tr>
    {{/if}}
  </table>

  {{#if relationships}}
    <p><strong>{{#iflng "cs"}}Vlastnosti{{lng}}Properties{{/iflng}}</strong></p>
    <p>{{#iflng "cs"}}Pro tuto třídu jsou definovány následující vlastnosti: {{lng}}For this class the following properties are defined: {{/iflng}}{{#each relationships}}{{relation}}{{#unless @last}}, {{/unless}}{{#if @last}}.{{/if}}{{/each}}</p>
  {{/if}}
</section>`,

    "class-profile": `<section id="{{anchor}}">
  <h4>{{#translate aggregation.name}}{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}{{else}}<i>{{#iflng "cs"}}beze jména{{lng}}without assigned name{{/iflng}}</i>{{/translate}}</h4>

  <table class="def">
    <tr>
      <td>{{#iflng "cs"}}IRI profilovaných tříd{{lng}}Profiled class IRI(s){{/iflng}}</td>
      <td>
        {{#each aggregation.conceptIris}}
          {{#if @index}}<br />{{/if}}
          <a href="{{{.}}}">{{prefixed .}}</a>
        {{/each}}
      </td>
    </tr>
    <tr>
      <td>IRI</td>
      <td><a href="{{{iri}}}">{{prefixed iri}}</a></td>
    </tr>
    {{#translate aggregation.name}}
    <tr>
      <td>{{#iflng "cs"}}Název{{lng}}Label{{/iflng}}</td>
      <td>{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}</td>
    </tr>
    {{/translate}}
    {{#translate aggregation.description}}
    <tr>
      <td>{{#iflng "cs"}}Definice{{lng}}Definition{{/iflng}}</td>
      <td>{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}</td>
    </tr>
    {{/translate}}
    {{#def "profilesClassChain" "isGeneralization"}}
      {{#if isGeneralization}}
        {{#iflng "cs"}}specializuje{{lng}}specializes{{/iflng}}
        {{else}}
        {{#iflng "cs"}}profiluje{{lng}}profiles{{/iflng}}
      {{/if}}
      {{#ifEquals ./type.[0] "class"}}{{#iflng "cs"}}třídu{{lng}}class{{/iflng}}{{/ifEquals}}
      {{#ifEquals ./type.[0] "class-profile"}}{{#iflng "cs"}}profil{{lng}}class profile{{/iflng}}{{/ifEquals}}
      {{class}} (<a href="{{{./iri}}}">{{prefixed ./iri}}</a>)
      {{#if (and (not ./descriptionFromProfiled) (non-empty ./description))}}
        <br />{{#iflng "cs"}}Definice: {{lng}}Definition: {{/iflng}}<i>{{translate ./description}}</i>
      {{/if}}
      {{#if (or ./aggregationParents (parentClasses ./id))}}
        <ul style="list-style-type: disclosure-closed;">
          {{#each ./aggregationParents}}
            <li>
              {{#semanticEntity ./id}}
                {{profilesClassChain}}
              {{/semanticEntity}}
            </li>
          {{/each}}
          {{#each (parentClasses ./id)}}
            <li>
              {{#semanticEntity ./id}}
                {{profilesClassChain true}}
              {{/semanticEntity}}
            </li>
          {{/each}}
        </ul>
      {{/if}}
    {{/def}}

    {{#if (or ./aggregationParents (parentClasses ./id))}}
      <tr>
        <td>{{#iflng "cs"}}Hierarchie{{lng}}Hierarchy{{/iflng}}</td>
        <td>
          <ul style="list-style-type: disclosure-closed; padding-left: 0; margin: 0;">
            {{#each aggregationParents}}
              {{#semanticEntity ./id}}
                <li>
                  {{profilesClassChain}}
                </li>
              {{/semanticEntity}}
            {{/each}}
            {{#each (parentClasses ./id)}}
              <li>
                {{profilesClassChain true}}
              </li>
            {{/each}}
          </ul>
        </td>
      </tr>
    {{/if}}

    {{#translate usageNote}}
    <tr>
      <td>{{#iflng "cs"}}Popis použití v profilu{{lng}}Usage note{{/iflng}}</td>
      <td>{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}</td>
    </tr>
    {{/translate}}
    {{#if resolvedControlledVocabularies}}
    <tr>
      <td>{{#iflng "cs"}}Řízené slovníky{{lng}}Controlled vocabularies{{/iflng}}</td>
      <td>{{> controlled-vocabulary-list vocabularies=resolvedControlledVocabularies showReplaced=true}}</td>
    </tr>
    <tr>
      <td>{{#iflng "cs"}}Použití řízených slovníků{{lng}}Controlled vocabulary usage{{/iflng}}</td>
      <td>{{> controlled-vocabulary-class-profile-usage vocabularies=resolvedControlledVocabularies}}</td>
    </tr>
    {{/if}}
  </table>

  {{#if relationships}}
    <p><strong>{{#iflng "cs"}}Vlastnosti{{lng}}Properties{{/iflng}}</strong></p>
    <p>{{#iflng "cs"}}Pro tento profil třídy jsou definovány následující vlastnosti: {{lng}}For this class profile the following properties are defined: {{/iflng}}{{#each relationships}}{{relation}}{{#unless @last}}, {{/unless}}{{#if @last}}.{{/if}}{{/each}}</p>
  {{/if}}

  {{#if backwardsRelationships}}
    <p><strong>{{#iflng "cs"}}Zpětné asociace{{lng}}Backwards associations{{/iflng}}</strong></p>
    <ul>
      {{#each backwardsRelationships}}
        <li>{{#iflng "cs"}}z domény{{lng}}from domain{{/iflng}} <a href="{{{href ends.0.concept}}}"></a> → <a href="{{{href id}}}"></a></li>
      {{/each}}
    </ul>
  {{/if}}

  {{#each relationships}}
    {{> relationship-profile}}
  {{/each}}

</section>`,

    "controlled-vocabulary-list": `{{#if (equals vocabularies.length 1)}}
  {{#each vocabularies}}{{> controlled-vocabulary-list-item showReplaced=../showReplaced documentedClassProfile=../id}}{{/each}}
{{else}}
  <ul>
    {{#each vocabularies}}
      <li>{{> controlled-vocabulary-list-item showReplaced=../showReplaced documentedClassProfile=../id}}</li>
    {{/each}}
  </ul>
{{/if}}`,

    "controlled-vocabulary-list-item": `{{> controlled-vocabulary-link}} ({{qualifierLabel qualifier}}{{#if replaces}}, {{#iflng "cs"}}přepsáno{{lng}}override{{/iflng}}{{/if}})
{{#if showReplaced}}
  {{! An assignment of another class profile is inherited from the profiled class profile, which can be in a nested specification. }}
  {{#unless (equals classProfile documentedClassProfile)}}
    <br />{{#iflng "cs"}}Převzato z profilovaného profilu třídy{{lng}}Taken from the profiled class profile{{/iflng}}
    {{#semanticEntity classProfile}}{{class}}{{else}}{{.}}{{/semanticEntity}}
  {{/unless}}
  {{> controlled-vocabulary-imported-replaces}}
  {{! The replaced assignments are a list, shown as a hierarchy: each opens a nested list, all are closed after the last one. }}
  {{#each (replacedAssignments .)}}
    <ul style="list-style-type: disclosure-closed;"><li>
    {{> controlled-vocabulary-replaced-assignment}}
    {{> controlled-vocabulary-imported-replaces}}
  {{/each}}
  {{#each (replacedAssignments .)}}
    </li></ul>
  {{/each}}
{{/if}}`,

    "controlled-vocabulary-link": `{{#semanticEntity vocabulary}}<a href="{{{distribution.accessUrl}}}">{{title}}</a>{{else}}{{.}}{{/semanticEntity}}`,

    "controlled-vocabulary-replaced-assignment": `{{#iflng "cs"}}nahrazuje přiřazení řízeného slovníku{{lng}}replaces controlled vocabulary assignment{{/iflng}}
{{> controlled-vocabulary-link}} ({{qualifierLabel qualifier}}) {{#iflng "cs"}}profilu třídy{{lng}}of class profile{{/iflng}}
{{#semanticEntity classProfile}}{{class}}{{else}}{{.}}{{/semanticEntity}}`,

    "controlled-vocabulary-imported-replaces": `{{#ifEquals replaces.kind "imported"}}
  <ul style="list-style-type: disclosure-closed;"><li>
    {{#iflng "cs"}}nahrazuje importované přiřazení{{lng}}replaces imported assignment{{/iflng}}
    <a href="{{{replaces.iri}}}">{{replaces.iri}}</a>
  </li></ul>
{{/ifEquals}}`,

    "controlled-vocabulary-property-usage": `{{#each vocabularies}}
  <p>
  {{#ifEquals qualifier "must"}}
    {{#iflng "cs"}}Vlastnost MUSÍ používat jako obor hodnot položky z {{> controlled-vocabulary-link}}.{{lng}}The property MUST use as range values codes from {{> controlled-vocabulary-link}}.{{/iflng}}<br />
    {{#iflng "cs"}}Toto očekávání znamená, že prostor hodnot je uzavřen vzhledem k řízenému slovníku. Validační systémy BY MĚLY vytvářet chyby. Všechny profily v ekosystému MUSÍ předcházet konfliktům vytvářením podvlastností.{{lng}}This expectation results in that the value space is closed under the controlled vocabulary. Validation systems SHOULD produce errors. All profiles in the ecosystem MUST avoid conflicts by creating subproperties.{{/iflng}}
  {{/ifEquals}}
  {{#ifEquals qualifier "at-least-one"}}
    {{#iflng "cs"}}Vlastnost MUSÍ mít ALESPOŇ JEDNU hodnotu z {{> controlled-vocabulary-link}}.{{lng}}The property MUST have AT LEAST ONE value from {{> controlled-vocabulary-link}}.{{/iflng}}<br />
    {{#iflng "cs"}}Toto očekávání jen minimálně omezuje prostor hodnot. Validační systémy BY MĚLY vytvářet varování.{{lng}}This expectation makes the value space minimally constrained. Validation systems SHOULD produce warnings.{{/iflng}}
  {{/ifEquals}}
  {{#ifEquals qualifier "recommended"}}
    {{#iflng "cs"}}Pro vlastnost se DOPORUČUJE používat jako obor hodnot položky z {{> controlled-vocabulary-link}}.{{lng}}The property IS RECOMMENDED to use as range values codes from {{> controlled-vocabulary-link}}.{{/iflng}}<br />
    {{#iflng "cs"}}Prostor hodnot je uzavřen vzhledem k řízenému slovníku, ale jiné hodnoty jsou tolerovány. Doporučení vyjadřuje silnou preferenci. Aby byl tento silnější směr ke sjednocení hodnot viditelný ve výměnách dat, validační systémy BY MĚLY vytvářet varování.{{lng}}The value space is closed under the controlled vocabulary, but other values are tolerated. Recommending means expressing a strong preference. To make this stronger direction towards harmonisation visible in the data exchanges, validation systems SHOULD produce warnings.{{/iflng}}
  {{/ifEquals}}
  {{#ifEquals qualifier "may"}}
    {{#iflng "cs"}}Vlastnost MŮŽE používat jako obor hodnot položky z {{> controlled-vocabulary-link}}.{{lng}}The property MAY use as range values codes from {{> controlled-vocabulary-link}}.{{/iflng}}<br />
    {{#iflng "cs"}}Prostor hodnot je uzavřen vzhledem k řízenému slovníku, ale jiné hodnoty jsou přijímány. Toto očekávání je spíše nápověda k použití. Protože zde není vyjádřena ani povinnost, ani silné doporučení, je použití jiných číselníků ve všech případech platné. Validační systémy proto MOHOU vytvářet varování, ale uživatelé je mohou ignorovat. Také žádná validace není v tomto případě přijatelná.{{lng}}The value space is closed under the controlled vocabulary, but other values are accepted. This expectation is more a hint to be used. As there is no obligation nor strong suggestion expressed here, the use of other codelists is valid in all cases. Therefore validation systems MAY produce warnings but users are free to ignore them. No validation in this case is also acceptable.{{/iflng}}
  {{/ifEquals}}
  </p>
{{/each}}`,

    "controlled-vocabulary-class-profile-usage": `{{#each vocabularies}}
  <p>
  {{#ifEquals qualifier "must"}}
    {{#iflng "cs"}}Tento profil třídy MUSÍ být v datech reprezentován položkami řízeného slovníku {{> controlled-vocabulary-link}}.{{lng}}This class profile MUST be represented in data by instances of {{> controlled-vocabulary-link}} controlled vocabulary.{{/iflng}}
  {{/ifEquals}}
  {{#ifEquals qualifier "at-least-one"}}
    {{#iflng "cs"}}Tento profil třídy MUSÍ být v datech reprezentován ALESPOŇ JEDNOU položkou řízeného slovníku {{> controlled-vocabulary-link}}.{{lng}}This class profile MUST be represented in data by AT LEAST ONE instance of {{> controlled-vocabulary-link}} controlled vocabulary.{{/iflng}}
  {{/ifEquals}}
  {{#ifEquals qualifier "recommended"}}
    {{#iflng "cs"}}DOPORUČUJE se, aby byl tento profil třídy v datech reprezentován položkami řízeného slovníku {{> controlled-vocabulary-link}}.{{lng}}It is RECOMMENDED that this class profile is represented in data by instances of {{> controlled-vocabulary-link}} controlled vocabulary.{{/iflng}}
  {{/ifEquals}}
  {{#ifEquals qualifier "may"}}
    {{#iflng "cs"}}Tento profil třídy MŮŽE být v datech reprezentován položkami řízeného slovníku {{> controlled-vocabulary-link}}.{{lng}}This class profile MAY be represented in data by instances of {{> controlled-vocabulary-link}} controlled vocabulary.{{/iflng}}
  {{/ifEquals}}
  </p>
{{/each}}`,

    "controlled-vocabulary-usage-table": `<table class="def">
  <thead>
    <tr>
      <th>{{#iflng "cs"}}Vlastnost{{lng}}Property{{/iflng}}</th>
      <th>{{#iflng "cs"}}Použito pro profil třídy{{lng}}Used for class profile{{/iflng}}</th>
      <th>{{#iflng "cs"}}Řízený slovník{{lng}}Controlled vocabulary{{/iflng}}</th>
      <th>{{#iflng "cs"}}Přepsáno{{lng}}Override{{/iflng}}</th>
    </tr>
  </thead>
  <tbody>
    {{#each rows}}
      <tr>
        <td>{{#with property}}{{relation}}{{/with}}</td>
        <td>{{#semanticEntity property.ends.1.concept}}{{class}}{{else}}{{.}}{{/semanticEntity}}</td>
        <td>{{> controlled-vocabulary-link}}</td>
        <td>{{#if replaces}}{{#iflng "cs"}}ano{{lng}}yes{{/iflng}}{{/if}}</td>
      </tr>
    {{/each}}
  </tbody>
</table>`,

    "relationship-profile": `<section id="{{anchor}}">
  <h4>{{#translate aggregation.ends.1.name}}{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}{{else}}<i>{{#iflng "cs"}}beze jména{{lng}}without assigned name{{/iflng}}</i>{{/translate}}</h4>

  <table class="def">
    <tr>
      <td>{{#iflng "cs"}}IRI profilovaných vztahů{{lng}}Profiled relationship IRI(s){{/iflng}}</td>
      <td>
        {{#each aggregation.ends.1.conceptIris}}
          {{#if @index}}<br />{{/if}}
          <a href="{{{.}}}">{{prefixed .}}</a>
        {{/each}}
      </td>
    </tr>
    <tr>
      <td>IRI</td>
      <td><a href="{{{ends.1.iri}}}">{{prefixed ends.1.iri}}</a></td>
    </tr>
    {{#translate aggregation.ends.1.name}}
    <tr>
      <td>{{#iflng "cs"}}Název{{lng}}Label{{/iflng}}</td>
      <td>{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}</td>
    </tr>
    {{/translate}}
    {{#translate aggregation.ends.1.description}}
    <tr>
      <td>{{#iflng "cs"}}Definice{{lng}}Definition{{/iflng}}</td>
      <td>{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}</td>
    </tr>
    {{/translate}}
    <tr>
      <td>{{#iflng "cs"}}Definiční obor{{lng}}Domain{{/iflng}}</td>
      <td>
        <a href="{{{href aggregation.ends.0.concept}}}">{{#semanticEntity aggregation.ends.0.concept}}{{#translate aggregation.name}}{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}{{else}}<i>{{#iflng "cs"}}beze jména{{lng}}without assigned name{{/iflng}}</i>{{/translate}}{{/semanticEntity}}</a>

        {{cardinality aggregation.ends.0.cardinality}}
      </td>
    </tr>
    <tr>
      <td>{{#iflng "cs"}}Obor hodnot{{lng}}Range{{/iflng}}</td>
      <td>
        <a href="{{{href aggregation.ends.1.concept}}}">{{#semanticEntity aggregation.ends.1.concept}}{{#translate aggregation.name}}{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}{{else}}<i>{{#iflng "cs"}}beze jména{{lng}}without assigned name{{/iflng}}</i>{{/translate}}{{else}}{{prefixed .}}{{/semanticEntity}}</a>

        {{cardinality aggregation.ends.1.cardinality}}
    </td>
    </tr>

    {{#def "profilesRelationshipChain" "isGeneralization"}}
      {{#if isGeneralization}}
        {{#iflng "cs"}}specializuje{{lng}}specializes{{/iflng}}
        {{else}}
        {{#iflng "cs"}}profiluje{{lng}}profiles{{/iflng}}
      {{/if}}
      {{#ifEquals type.[0] "relationship"}}{{#iflng "cs"}}vlastnost{{lng}}property{{/iflng}}{{/ifEquals}}
      {{#ifEquals type.[0] "relationship-profile"}}{{#iflng "cs"}}profil{{lng}}property profile{{/iflng}}{{/ifEquals}}
      {{relation}} (<a href="{{{ends.1.iri}}}">{{prefixed ends.1.iri}}</a>)
      {{#if (and (not ./ends.1.descriptionFromProfiled) (non-empty ./ends.1.description))}}
        <br />{{#iflng "cs"}}Definice: {{lng}}Definition: {{/iflng}}<i>{{translate ./ends.1.description}}</i>
      {{/if}}
      {{#if (or ./aggregationParents (parentClasses ./id))}}
        <ul style="list-style-type: disclosure-closed;">
          {{#each ./aggregationParents}}
            <li>
              {{#semanticEntity ./id}}
                {{profilesRelationshipChain}}
              {{/semanticEntity}}
            </li>
          {{/each}}
          {{#each (parentClasses ./id)}}
            <li>
              {{#semanticEntity ./id}}
                {{profilesRelationshipChain true}}
              {{/semanticEntity}}
            </li>
          {{/each}}
        </ul>
      {{/if}}
    {{/def}}


    {{#if (or ./aggregationParents (parentClasses ./id))}}
      <tr>
        <td>{{#iflng "cs"}}Hierarchie{{lng}}Hierarchy{{/iflng}}</td>
        <td>
          <ul style="list-style-type: disclosure-closed; padding-left: 0; margin: 0;">
            {{#each ./aggregationParents}}
              {{#semanticEntity ./id}}
                <li>
                  {{profilesRelationshipChain}}
                </li>
              {{/semanticEntity}}
            {{/each}}
            {{#each (parentClasses ./id)}}
              <li>
                {{profilesRelationshipChain true}}
              </li>
            {{/each}}
          </ul>
        </td>
      </tr>
    {{/if}}

    {{#translate aggregation.ends.1.usageNote}}
    <tr>
      <td>{{#iflng "cs"}}Popis použití v profilu{{lng}}Usage note{{/iflng}}</td>
      <td>{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}</td>
    </tr>
    {{/translate}}
    {{#if derivedControlledVocabularies}}
    <tr>
      <td>{{#iflng "cs"}}Řízené slovníky{{lng}}Controlled vocabularies{{/iflng}}</td>
      <td>{{> controlled-vocabulary-list vocabularies=derivedControlledVocabularies}}</td>
    </tr>
    <tr>
      <td>{{#iflng "cs"}}Použití řízených slovníků{{lng}}Controlled vocabulary usage{{/iflng}}</td>
      <td>{{> controlled-vocabulary-property-usage vocabularies=derivedControlledVocabularies}}</td>
    </tr>
    {{/if}}
  </table>
</section>`,

    definitions: `{{#def "class"}}<a href="{{{href aggregation.id}}}">{{#translate aggregation.name}}{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}{{else}}<i>{{#iflng "cs"}}beze jména{{lng}}without assigned name{{/iflng}}</i>{{/translate}}</a>{{/def}}
{{#def "relation"}}<a href="{{{href aggregation.ends.1.iri}}}">{{#translate aggregation.ends.1.name}}{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}{{else}}<i>{{#iflng "cs"}}beze jména{{lng}}without assigned name{{/iflng}}</i>{{/translate}}</a>{{/def}}
{{#def "cardinality"}}
  {{#if args.[0]}}
    [{{args.[0].[0]}}..{{#if args.[0].[1]}}{{args.[0].[1]}}{{else}}*{{/if}}]
  {{/if}}
{{/def}}`,

    attachments: `<section id="{{#iflng "cs"}}přílohy{{lng}}attachments{{/iflng}}">
  <h2>{{#iflng "cs"}}Přílohy{{lng}}Attachments{{/iflng}}</h2>
  {{#iflng "cs"}}
    <p>Součástí této specifikace jsou následující přílohy.</p>
  {{lng}}
    <p>This specification includes the following attachments.</p>
  {{/iflng}}
  <table class="def">
    <thead>
      <tr>
        <th>{{#iflng "cs"}}Příloha{{lng}}Attachment{{/iflng}}</th>
        <th>{{#iflng "cs"}}Odkaz{{lng}}Link{{/iflng}}</th>
      </tr>
    </thead>
    <tbody>
      {{#if externalArtifacts.owl-vocabulary}}
        <tr>
          <td>{{#iflng "cs"}}Slovník{{lng}}Vocabulary{{/iflng}}</td>
          <td><a href="{{{relativePath externalArtifacts.owl-vocabulary.[0].URL}}}">{{relativePath externalArtifacts.owl-vocabulary.[0].URL}}</a></td>
        </tr>
      {{/if}}
      {{#if externalArtifacts.dsv-profile}}
        <tr>
          <td>{{#iflng "cs"}}Aplikační profil{{lng}}Application profile{{/iflng}}</td>
          <td><a href="{{{relativePath externalArtifacts.dsv-profile.[0].URL}}}">{{relativePath externalArtifacts.dsv-profile.[0].URL}}</a></td>
        </tr>
      {{/if}}
      {{#each externalArtifacts.shacl-profile}}
        <tr>
          <td>{{#iflng "cs"}}SHACL validační pravidla{{lng}}SHACL validation rules{{/iflng}}</td>
          <td><a href="{{{relativePath URL}}}">{{relativePath URL}}</a></td>
        </tr>
      {{/each}}
      {{#if externalArtifacts.catalog}}
        <tr>
          <td>{{#iflng "cs"}}Katalog řízených slovníků{{lng}}Controlled vocabulary catalog{{/iflng}}</td>
          <td><a href="{{{relativePath externalArtifacts.catalog.[0].URL}}}">{{relativePath externalArtifacts.catalog.[0].URL}}</a></td>
        </tr>
      {{/if}}
      {{#each externalArtifacts.structure-model}}
        <tr>
          <td>{{#iflng "cs"}}Popis strukturálního modelu{{lng}}Description of structure model{{/iflng}}</td>
          <td><a href="{{{relativePath URL}}}">{{relativePath URL}}</a></td>
        </tr>
      {{/each}}
      {{#each externalArtifacts.ldes-operations}}
        <tr>
          <td>{{#iflng "cs"}}Serializace změn v LDES formátu{{lng}}List of changes in LDES format{{/iflng}}</td>
          <td><a href="{{{relativePath URL}}}">{{relativePath URL}}</a></td>
        </tr>
      {{/each}}
        {{#artifacts}}
        <tr><td>{{translate title}}</td><td><a href="{{{relativePath}}}">{{relativePathAsText}}</a></td></tr>
        {{/artifacts}}
    </tbody>
  </table>
</section>`,

    "used-prefixes": `<section>
  <h2>{{#iflng "cs"}}Použité prefixy{{lng}}Used prefixes{{/iflng}}</h2>
  <table id="table-namespaces" class="simple">
    <thead><tr><th>Prefix</th><th>Namespace IRI</th></tr></thead>
    <tbody>
      {{#each usedPrefixes}}
        <tr><td><code>{{prefix}}</code></td><td><a href="{{{iri}}}"><code>{{iri}}</code></a></td></tr>
      {{/each}}
    </tbody>
  </table>
</section>`,
    "respecConfig": `// All config options at https://respec.org/docs/
var respecConfig = {
  specStatus: "base",
  editors: [{ name: "Dataspecer", url: "https://dataspecer.com" }],
  //github: "some-org/mySpec",
  shortName: "todo",
  historyURI: null,
  //thisVersion: "https://xx.github.io/yy/",
  //latestVersion: "https://xx.github.io/yy/",
  //publishDate: "2025-09-29",
  //github: "https://github.com/org/repo",
  //xref: "web-platform",
  //group: "my-working-group",
  //otherLinks: [{
  //    key: "Repository",
  //    data: [{
  //        value: "GitHub",
  //        href: "https://github.com/org/repo"
  //    }],
  //}],
  {{> localBiblio}}
};`,

    "html-head": `<meta charset="utf-8" />
<title>{{translate label}}</title>
<meta name="color-scheme" content="light dark">
<script type="application/ld+json">
  {{{json dsv}}}
</script>
<script
  src="https://www.w3.org/Tools/respec/respec-w3c"
  class="remove"
  defer
></script>
<script class="remove">
{{> respecConfig}}
</script>

<style>
  .figure img, .sidefigure img, figure img, .figure object, .sidefigure object, figure object, img, .img {
    max-width: 100%;
    margin: auto;
    height: auto;
  }

  table.simple {
    margin: auto;
    border-spacing: 0;
    border-collapse: collapse;
  }

  table.simple th {
    padding: 3px 10px;
    text-align: left;
  }

  table.simple td {
    border-top: 1px solid #ddd;
    padding: 3px 10px;
  }
</style>`,
  },
};
