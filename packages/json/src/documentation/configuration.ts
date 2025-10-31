export const MAIN_JSON_PARTIAL = "json-documentation";

export const defaultJsonPartials: Record<string, string> = {
  [MAIN_JSON_PARTIAL]: `<section id="{{anchor}}">

{{#def "json-tree-or-link"}}
  {{#if isMain}}
    <a href="#{{./anchor}}"></a>
  {{else}}
    {{json-tree}}
  {{/if}}
{{/def}}

{{#def "json-tree"}}
  {{#if (equals type "object")}}{{json-tree-object}}{{/if}}
  {{#if (equals type "const")}}{{json-tree-const}}{{/if}}
  {{#if (equals type "array")}}{{json-tree-array}}{{/if}}
  {{#if (equals type "string")}}{{json-tree-string}}{{/if}}
  {{#if (equals type "boolean")}}{{#iflng "cs"}}boolean (ano/ne){{lng}}boolean (yes/no){{/iflng}}{{/if}}
  {{#if (equals type "enum")}}{{#iflng "cs"}}enum{{lng}}enum{{/iflng}}{{/if}}
  {{#if (equals type "ref")}}{{json-tree-ref}}{{/if}}
  {{#if (equals type "numeric")}}{{json-tree-numeric}}{{/if}}
  {{#if (equals type "any")}}{{json-tree-any}}{{/if}}
{{/def}}

{{#def "json-tree-ref"}}
  {{#if fromExternalSpecification}}
    {{#iflng "cs"}}jež je definován v referencovaném schématu <a href="{{link}}">{{link}}</a>.{{lng}}which is defined in the referenced schema <a href="{{link}}">{{link}}</a>.{{/iflng}}
  {{else}}
    {{#iflng "cs"}}dle <a href="{{link}}"></a>{{lng}}according to <a href="{{link}}"></a>{{/iflng}}
  {{/if}}
{{/def}}

{{#def "json-tree-any"}}
  {{xof}}
{{/def}}

{{#def "json-tree-const"}}
  {{#iflng "cs"}}konstantní hodnota{{lng}}constant value{{/iflng}}
  {{#if multiline}}
    <pre><code>{{const}}</code></pre>
  {{else}}
    <code>{{const}}</code>
  {{/if}}
{{/def}}

{{#def "json-tree-string"}}
  {{#iflng "cs"}}řetězec{{lng}}string{{/iflng}}
  {{#if format}}({{#iflng "cs"}}formát: <code>{{format}}</code>{{lng}}format: <code>{{format}}</code>{{/iflng}}){{/if}}
  {{#if pattern}}({{#iflng "cs"}}dle regulárního výrazu{{lng}}by regular expression{{/iflng}}: <code>{{{pattern}}}</code>){{/if}}

  {{#with structureEntity}}
    (<a href="{{#with pimClass}}{{href pimIri}}{{/with}}">{{translate ./humanLabel}}</a>)
  {{/with}}
{{/def}}

{{#def "json-tree-numeric"}}
  {{#iflng "cs"}}
    číslo {{#if integerOnly}}(pouze celé číslo){{else}}(vč. desetinného){{/if}}
  {{lng}}
    number {{#if integerOnly}}(integer only){{else}}(including fractional){{/if}}
  {{/iflng}}
{{/def}}

{{#def "json-tree-object"}}
  <strong>
    {{#iflng "cs"}}objekt{{lng}}object{{/iflng}}
  </strong>
  {{#if properties}}
    {{#iflng "cs"}}s vlastnostmi{{lng}}with properties{{/iflng}} (<code>properties</code>):
    <ul>
      {{#each properties}}
        <li style="list-style-type: disclosure-closed;">
          <code>{{key}}</code>:
          {{#if ./semanticEntity}}
            (<a href="{{href ./semanticEntity.pimIri}}" label="{{translate ./structureEntity.humanDescription}}">{{translate ./structureEntity.humanLabel}}</a>)
          {{/if}}
          {{#if required}}{{#iflng "cs"}}povinná{{lng}}required{{/iflng}}{{else}}{{#iflng "cs"}}nepovinná{{lng}}optional{{/iflng}}{{/if}}
          {{#iflng "cs"}}položka typu{{lng}}item of type{{/iflng}}

          {{#with value}}{{json-tree-or-link}}{{/with}}
        </li>
      {{/each}}
    </ul>
  {{/if}}
  {{xof}}
{{/def}}

{{#def "xof"}}
  {{#if oneOf}}
    {{#iflng "cs"}}právě jedno z následujících{{lng}}exactly one of the following{{/iflng}} (<code>oneOf</code>):
    <ul>
      {{#each oneOf}}
        <li>{{json-tree-or-link}}</li>
      {{/each}}
    </ul>
  {{/if}}

  {{#if anyOf}}
    {{#iflng "cs"}}alespoň jedno z následujících{{lng}}at least one of the following{{/iflng}} (<code>anyOf</code>):
    <ul>
      {{#each anyOf}}
        <li>{{json-tree-or-link}}</li>
      {{/each}}
    </ul>
  {{/if}}

  {{#if allOf}}
    {{#iflng "cs"}}všechno z následujících{{lng}}all of the following{{/iflng}} (<code>allOf</code>):
    <ul>
      {{#each allOf}}
        <li>{{json-tree-or-link}}</li>
      {{/each}}
    </ul>
  {{/if}}
{{/def}}

{{#def "json-tree-array"}}
  {{#iflng "cs"}}
    pole hodnot <code>{{cardinalityText}}</code> typu {{#with items}}{{json-tree-or-link}}{{/with}}
    {{#if contains}}, které musí obsahovat alespoň jednu položku typu {{#with contains}}{{json-tree-or-link}}{{/with}}{{/if}}
  {{lng}}
    array of values <code>{{cardinalityText}}</code> of type {{#with items}}{{json-tree-or-link}}{{/with}}
    {{#if contains}}, which must contain at least one item of type {{#with contains}}{{json-tree-or-link}}{{/with}}{{/if}}
  {{/iflng}}
{{/def}}


  <h1>
    {{#iflng "cs"}}
      JSON struktura pro{{lng}}
      JSON structure for
    {{/iflng}}
    {{translate structureModel.humanLabel}}
  </h1>

    <dl>
      <dt>IRI</dt>
      <dd><code>{{id}}</code></dd>
      <dt>{{#iflng "cs"}}Definováno v{{lng}}Defined in{{/iflng}}</dt>
      <dd><code><a href="{{artifact.json-schema.relativePath}}">{{artifact.json-schema.relativePath}}</a></code></dd>
      {{#with dialect}}
        <dt>{{#iflng "cs"}}Verze použitého jazyka{{lng}}Language version used{{/iflng}}</dt>
        <dd><a href="{{specificationUrl}}" target="_blank">{{number}}</a> (metaschema IRI: <code>{{metaschemaIri}}</code>)</dd>
      {{/with}}
    </dl>

  {{#with root}}
    <h2>{{#iflng "cs"}}Kořen{{lng}}Root{{/iflng}}</h2>
    {{#iflng "cs"}}Kořenem JSON schématu je{{lng}}The root of the JSON schema is{{/iflng}}
    {{json-tree-or-link}}
  {{/with}}

  {{#each mainClasses}}
    <section id="{{./anchor}}">
      <h2>
        {{#iflng "cs"}}Objekt{{lng}}Object{{/iflng}} <i>{{translate structureEntity.humanLabel}}</i>
      </h2>

      <table class="def">
        {{#translate structureEntity.humanDescription}}
          <tr>
            <th>{{#iflng "cs"}}Popis{{lng}}Description{{/iflng}}</th>
            <td>{{translation}}</td>
          </tr>
        {{/translate}}

        {{#with ./semanticEntity}}
          <tr>
            <th>{{#iflng "cs"}}Interpretace{{lng}}Interpretation{{/iflng}}</th>
            <td><a href="{{href pimIri}}">{{translate humanLabel}}</a></td>
          </tr>
        {{/with}}
      </table>

      {{json-tree}}
    </section>
  {{/each}}
</section>`,
};
