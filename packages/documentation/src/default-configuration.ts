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
    <h2>Introduction</h2>
    <p>This is introduction</p>
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
        <a href="{{{URL}}}">
          <figure>
            <img src="{{{URL}}}" alt="{{translate ./label}}" />
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
      <section>
      <h2>
        {{#iflng "cs"}}Specifikace struktury pro{{lng}}Data structure specification for{{/iflng}}
        {{translate humanLabel}}
      </h2>
      <p>{{translate humanDescription}}</p>

      {{#artifacts}}{{#getDocumentation}}{{> (useTemplate)}}{{/getDocumentation}}{{/artifacts}}
      </section>
    {{/structureModels}}

    {{> used-prefixes}}

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
  </table>

  {{#if backwardsRelationships}}
    <p>{{#iflng "cs"}}Zpětné asociace{{lng}}Backwards associations{{/iflng}}</p>
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
  </table>
</section>`,

    definitions: `{{#def "class"}}<a href="{{{href aggregation.id}}}">{{#translate aggregation.name}}{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}{{else}}<i>{{#iflng "cs"}}beze jména{{lng}}without assigned name{{/iflng}}</i>{{/translate}}</a>{{/def}}
{{#def "relation"}}<a href="{{{href aggregation.ends.1.iri}}}">{{#translate aggregation.ends.1.name}}{{translation}}{{#if otherLang}} (@{{otherLang}}){{/if}}{{else}}<i>{{#iflng "cs"}}beze jména{{lng}}without assigned name{{/iflng}}</i>{{/translate}}</a>{{/def}}
{{#def "cardinality"}}
  {{#if args.[0]}}
    [{{args.[0].[0]}}..{{#if args.[0].[1]}}{{args.[0].[1]}}{{else}}*{{/if}}]
  {{/if}}
{{/def}}`,

    attachments: `<section>
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
          <td><a href="{{{externalArtifacts.owl-vocabulary.[0].URL}}}">{{externalArtifacts.owl-vocabulary.[0].URL}}</a></td>
        </tr>
      {{/if}}
      {{#if externalArtifacts.dsv-profile}}
        <tr>
          <td>{{#iflng "cs"}}Aplikační profil{{lng}}Application profile{{/iflng}}</td>
          <td><a href="{{{externalArtifacts.dsv-profile.[0].URL}}}">{{externalArtifacts.dsv-profile.[0].URL}}</a></td>
        </tr>
      {{/if}}
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
