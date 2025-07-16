export const MAIN_XML_PARTIAL = "xml-documentation";

export const defaultXmlPartials: Record<string, string> = {
  [MAIN_XML_PARTIAL]: `{{#def "xml-meaning" "annotation"}}
  {{#if (or (get-semantic-class annotation) (non-empty annotation.metaTitle) (non-empty annotation.metaDescription))}}
    <dt>{{#iflng "cs"}}Význam{{lng}}Meaning{{/iflng}}</dt>
    {{#if (or (non-empty annotation.metaTitle) (non-empty annotation.metaDescription))}}
      <dd>
        <a href="{{#get-semantic-class annotation}}{{href pimIri}}{{/get-semantic-class}}">{{translate annotation.metaTitle}}</a>
        {{#if (non-empty annotation.metaDescription)}}({{translate annotation.metaDescription}}){{/if}}
      </dd>
    {{/if}}
  {{/if}}
{{/def}}

{{#def "xml-qname" "name"}}{{#if name.[0]}}{{name.[0]}}:{{/if}}{{name.[1]}}{{/def}}

{{#def "xml-content-type" "type"}}
{{#if (equals type "choice")}} - {{#iflng "cs"}}výběr jednoho elementu z množiny{{lng}}choice of one element from the set{{/iflng}}{{/if}}
{{#if (equals type "sequence")}} - {{#iflng "cs"}}elementy v tomto pořadí{{lng}}elements in this order{{/iflng}}{{/if}}
{{/def}}

{{#def "xml-schema-complex-content" "contents"}}
  <ul style="margin-top: 0;">
    {{#contents}}
      <li>
        {{#if element}}
          element <a href="{{xml-href element}}"><code>&lt;{{element.name.[1]}}&gt;</code></a> [{{cardinalityMin}}..{{#if cardinalityMax}}{{cardinalityMax}}{{else}}*{{/if}}]
        {{/if}}
        {{#item}}
          {{#if (or (equals xsType "sequence") (equals xsType "choice") )}}
            {{#if (equals xsType "sequence")}}{{#iflng "cs"}}sekvence{{lng}}sequence{{/iflng}}{{/if}}{{#if (equals xsType "choice")}}{{#iflng "cs"}}výběr jednoho prvku{{lng}}choice of one item{{/iflng}}{{/if}} [{{../cardinalityMin}}..{{#if ../cardinalityMax}}{{../cardinalityMax}}{{else}}*{{/if}}]
            <ul>
              {{xml-schema-complex-content contents}}
            </ul>
          {{else}}
            {{xml-type}} [{{../cardinalityMin}}..{{#if ../cardinalityMax}}{{../cardinalityMax}}{{else}}*{{/if}}]
          {{/if}}
        {{/item}}
      </li>
    {{/contents}}
  </ul>
{{/def}}

{{#def "xml-complex-definition" "complexDefinition"}}
  {{#if complexDefinition.contents}}
    <dt>{{#iflng "cs"}}Obsah{{lng}}Content{{/iflng}} {{xml-content-type complexDefinition.xsType}}</dt>
    {{xml-schema-complex-content complexDefinition.contents}}
  {{/if}}
{{/def}}

{{#def "xml-type"}}
  <div style="margin-left: 40px;">
    {{#if (and (not simpleDefinition) (not complexDefinition))}}
      <dt>{{#iflng "cs"}}Obsah{{lng}}Content{{/iflng}}</dt>
      <dd>
        {{#if (equals name.[1] "langString")}}
          {{#iflng "cs"}}Obsahem elementue je <i>Řetězec s označením jazyka</i>.{{lng}}The content of the element is an <i>language-tagged string</i>.{{/iflng}}
        {{else}}
          {{#iflng "cs"}}Obsahem elementu je typ{{lng}}The content of the element is of type{{/iflng}} <a href="{{xml-href .}}"><code>{{xml-qname name}}</code></a>.
        {{/if}}
      </dd>
    {{/if}}

    {{#simpleDefinition}}
      <dt>{{#iflng "cs"}}Obsah{{lng}}Content{{/iflng}}</dt>
      {{#if (equals xsType "restriction")}}
        <dd>
          {{#iflng "cs"}}Obsahem elementu je jednoduchý typ{{lng}}The content of the element is a simple type{{/iflng}} <code>{{xml-qname base}}</code> {{#iflng "cs"}}s omezením na hodnoty dané regulárním výrazem{{lng}}with restriction by the regular expression{{/iflng}} <code>{{pattern}}</code>.
        </dd>
      {{else}}
        <dd>
          {{#iflng "cs"}}Obsahem elementu je jednoduchý typ{{lng}}The content of the element is a simple type{{/iflng}} <code>{{xml-qname xsType}}</code>.
        </dd>
      {{/if}}
    {{/simpleDefinition}}

    {{xml-meaning annotation}}

    {{#complexDefinition}}
      {{#if name}}
        <dt>{{#iflng "cs"}}Název{{lng}}Name{{/iflng}}</dt>
        <dd>
          <code>{{xml-qname name}}</code>
        </dd>
      {{/if}}
    {{/complexDefinition}}

    {{xml-complex-definition complexDefinition}}
  </div>
{{/def}}

<section>
<h3>{{#iflng "cs"}}Přehled XML struktury{{lng}}Overview of XML Structure{{/iflng}}</h3>
<p>
  {{#iflng "cs"}}Tato sekce popisuje XSD zachycující strukturu pro{{lng}}This section describes the XSD capturing the structure for{{/iflng}} <i>{{translate structureModel.humanLabel}}</i>, {{#iflng "cs"}}jež je definováno v souboru{{lng}}which is defined in the file{{/iflng}} <a href="{{{structureModel.artifact.xml-schema.relativePath}}}"><code>{{structureModel.artifact.xml-schema.relativePath}}</code></a>.
</p>

{{#if xmlSchema.targetNamespace}}
  <dl>
    <dt>{{#iflng "cs"}}Definováno v namespace{{lng}}Defined in namespace{{/iflng}}</dt>
    <dd><code>{{xmlSchema.targetNamespace}}</code> ({{#iflng "cs"}}preferovaný prefix{{lng}}preferred prefix{{/iflng}}: <code>{{xmlSchema.targetNamespacePrefix}}</code>)</dd>
  </dl>
{{/if}}

<section>
<h4>{{#iflng "cs"}}Importy{{lng}}Imports{{/iflng}}</h4>
<p>
  {{#iflng "cs"}}Seznam schémat, jež jsou tímto schématem importovány a použity.{{lng}}List of schemas that are imported and used by this schema.{{/iflng}}
</p>
{{#if imports}}
  <table class="def">
    <thead>
      <tr>
        <th>{{#iflng "cs"}}Prefix{{lng}}Prefix{{/iflng}}</th>
        <th>{{#iflng "cs"}}Namespace{{lng}}Namespace{{/iflng}}</th>
        <th>{{#iflng "cs"}}Lokace schématu{{lng}}Schema Location{{/iflng}}</th>
        <th>{{#iflng "cs"}}Dokumentace{{lng}}Documentation{{/iflng}}</th>
      </tr>
    </thead>
    <tbody>
      {{#each imports}}
        <tr>
          {{#if prefix}}
            <td><code>{{prefix}}</code></td>
            <td><a href="{{{namespace}}}">{{namespace}}</a></td>
          {{else}}
            <td colspan="2" style="text-align: center;"><i>{{#iflng "cs"}}Stejný namespace jako hlavní dokument{{lng}}Same namespace as the main document{{/iflng}}</i></td>
          {{/if}}
          <td><a href="{{schemaLocation}}">{{schemaLocation}}</a></td>
          <td>{{#documentation}}<a href="{{link}}">{{translate semanticModel.humanLabel}}</a>{{/documentation}}</td>
        </tr>
      {{/each}}
    </tbody>
  </table>
{{else}}
  <i>{{#iflng "cs"}}Nic není importováno.{{lng}}Nothing is imported.{{/iflng}}</i>
{{/if}}
</section>

<section>
  <h4>{{#iflng "cs"}}Kořenové entity XSD schématu{{lng}}Root Entities of the XSD Schema{{/iflng}}</h4>
  <ul>
    {{#xmlSchema.elements}}
      <li>{{#iflng "cs"}}element{{lng}}element{{/iflng}} <a href="{{xml-href .}}"><code>{{xml-qname name}}</code></a></li>
    {{/xmlSchema.elements}}

    {{#xmlSchema.types}}
      <li> {{#if complexDefinition}}{{#iflng "cs"}}komplexní{{lng}}complex{{/iflng}}{{/if}}{{#if simpleDefinition}}{{#iflng "cs"}}jednoduchý{{lng}}simple{{/iflng}}{{/if}} {{#iflng "cs"}}typ{{lng}}type{{/iflng}} <a href="{{xml-href .}}"><code>{{xml-qname name}}</code></a></li>
    {{/xmlSchema.types}}
  </ul>
</section>

{{#def "xml-non-root-element" "element"}}
<section id="{{xml-id-anchor .}}">
  <h4>{{#iflng "cs"}}Element{{lng}}Element{{/iflng}} <code>&lt;{{name.[1]}}&gt;</code></h4>

  <dl>
    <dt>{{#iflng "cs"}}Význam{{lng}}Meaning{{/iflng}}</dt>
    <dd>
      {{#each pathFromParentEntity}}
        <i>
          {{#if (equals type "class")}}{{#iflng "cs"}}odkazující na třídu{{lng}}referring to class{{/iflng}}{{/if}}
          {{#if (equals type "property")}}{{#if @first}}{{#iflng "cs"}}vlastnost{{lng}}property{{/iflng}}{{else}}{{#iflng "cs"}}mající vlastnost{{lng}}having property{{/iflng}}{{/if}}{{/if}}
          {{#if (equals type "generalization")}}{{#if @first}}{{#iflng "cs"}}z obecnější třídy{{lng}}from a more general class{{/iflng}}{{else}}{{#iflng "cs"}}mající obecnější třídu{{lng}}having a more general class{{/iflng}}{{/if}}{{/if}}
          {{#if (equals type "specialization")}}{{#if @first}}{{#iflng "cs"}}z konkrétnější třídy{{lng}}from a more specific class{{/iflng}}{{else}}{{#iflng "cs"}}mající konkrétnější třídu{{lng}}having a more specific class{{/iflng}}{{/if}}{{/if}}
        </i>

        {{#with entity}}
          <a href="{{href pimIri}}"><strong>{{translate humanLabel}}</strong></a>
          {{#if (non-empty humanDescription)}}({{translate humanDescription}}){{/if}}
        {{/with}}

        {{#if (not @last)}}
          <span style="margin: 0 1rem">→</span>
        {{/if}}
      {{/each}}
    </dd>

    {{#effectiveCardinalityFromParentContainer}}
      <dt>{{#iflng "cs"}}Efektivní kardinalita elementu vůči nadřazeném elementu{{lng}}Effective cardinality of the element relative to its parent element{{/iflng}}</dt>
      <dd>{{min}}..{{#if max}}{{max}}{{else}}*{{/if}}</dd>
    {{/effectiveCardinalityFromParentContainer}}
    {{#parentEntityInDocumentation}}
      <dt>{{#iflng "cs"}}Nadřazený element{{lng}}Parent element{{/iflng}}</dt>
      <dd><a href="{{xml-href .}}"></a></dd>
    {{/parentEntityInDocumentation}}

    {{#if type}}{{#with type}}
      <dt>{{#iflng "cs"}}Typ elementu{{lng}}Element type{{/iflng}}</dt>
      {{xml-type}}
    {{/with}}{{else}}
      <i>{{#iflng "cs"}}Element nemá definovaný typ.{{lng}}The element has no defined type.{{/iflng}}</i>
    {{/if}}

    {{#if annotation.structureModelEntity.dataTypes.[0].example}}
      <dt>{{#iflng "cs"}}Příklady dat{{lng}}Data examples{{/iflng}}</dt>
      {{#each annotation.structureModelEntity.dataTypes.[0].example}}
        <dd>{{.}}</dd>
      {{/each}}
    {{/if}}
  </dl>
</section>
{{/def}}

{{#rootElements}}
<section id="{{xml-id-anchor .}}">
  <h4>{{#iflng "cs"}}Kořenový element{{lng}}Root element{{/iflng}} <code>&lt;{{name.[1]}}&gt;</code></h4>
  <dl>
    {{xml-meaning annotation}}

    {{#if type}}{{#with type}}
      <dt>{{#iflng "cs"}}Typ elementu{{lng}}Element type{{/iflng}}</dt>
      {{xml-type}}
    {{/with}}{{else}}
      <dd><i>{{#iflng "cs"}}Element nemá definovaný typ.{{lng}}The element has no defined type.{{/iflng}}</i></dd>
    {{/if}}
  </dl>
</section>
{{#linkedChildElements}}{{xml-non-root-element .}}{{/linkedChildElements}}
{{/rootElements}}

{{#rootTypes}}
<section id="{{xml-id-anchor .}}">
  <h4>{{#iflng "cs"}}Kořenový{{lng}}Root{{/iflng}} {{#if complexDefinition}}{{#iflng "cs"}}komplexní{{lng}}complex{{/iflng}}{{/if}}{{#if simpleDefinition}}{{#iflng "cs"}}jednoduchý{{lng}}simple{{/iflng}}{{/if}} {{#iflng "cs"}}typ{{lng}}type{{/iflng}} {{#if name}}<code>{{xml-qname name}}</code>{{else}}{{#iflng "cs"}}bez pojmenování{{lng}}unnamed{{/iflng}}{{/if}}</h4>
  <dl>
    {{xml-meaning annotation}}

    {{xml-complex-definition complexDefinition}}
  </dl>
</section>
{{#linkedChildElements}}{{xml-non-root-element .}}{{/linkedChildElements}}
{{/rootTypes}}`,
};
