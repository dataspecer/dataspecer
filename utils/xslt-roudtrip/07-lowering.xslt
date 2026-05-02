<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:sp="http://www.w3.org/2005/sparql-results#" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.0" xmlns:base="http://base/" xmlns:c="https://schemas.dataspecer.com/xsd/core/">
  <xsl:output method="xml" version="1.0" encoding="utf-8" indent="yes"/>
  <xsl:param name="subj" select="'s'"/>
  <xsl:param name="pred" select="'p'"/>
  <xsl:param name="obj" select="'o'"/>
  <xsl:variable name="type" select="'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'"/>
  <xsl:function name="c:id-key">
    <xsl:param name="node"/>
    <xsl:value-of select="concat(namespace-uri($node),'|',local-name($node),'|',string($node))"/>
  </xsl:function>
  <xsl:template match="/sp:sparql">
    <xsl:for-each-group select="sp:results/sp:result[sp:binding[@name=$pred]/sp:uri/text()=$type and sp:binding[@name=$obj]/sp:uri/text()=&#34;https://example.com/person-vocabulary#Person&#34;]" group-by="c:id-key(sp:binding[@name=$subj]/*[1])">
      <xsl:apply-templates select="current-group()[1]"/>
    </xsl:for-each-group>
  </xsl:template>
  <xsl:template match="sp:result[sp:binding[@name=$pred]/sp:uri/text()=$type and sp:binding[@name=$obj]/sp:uri/text()=&#34;https://example.com/person-vocabulary#Person&#34;]">
    <base:person>
      <xsl:call-template name="_https_003a_002f_002fofn.gov.cz_002fclass_002f1774613150948-e82c-24a7-b224">
        <xsl:with-param name="id">
          <xsl:copy-of select="sp:binding[@name=$subj]/*"/>
        </xsl:with-param>
      </xsl:call-template>
    </base:person>
  </xsl:template>
  <xsl:template match="@xml:lang">
    <xsl:copy-of select="."/>
  </xsl:template>
  <xsl:template match="sp:literal">
    <xsl:apply-templates select="@*"/>
    <xsl:value-of select="."/>
  </xsl:template>
  <xsl:template match="sp:uri">
    <xsl:value-of select="."/>
  </xsl:template>
  <xsl:template name="_https_003a_002f_002fofn.gov.cz_002fclass_002f1774613150948-e82c-24a7-b224">
    <xsl:param name="id"/>
    <xsl:param name="type_name" select="()"/>
    <xsl:param name="no_iri" select="false()"/>
    <xsl:if test="not(empty($type_name))">
      <xsl:attribute name="xsi:type">
        <xsl:value-of select="$type_name"/>
      </xsl:attribute>
    </xsl:if>
    <xsl:variable name="id_test">
      <xsl:value-of select="c:id-key($id/*)"/>
    </xsl:variable>
    <xsl:for-each-group select="//sp:result[sp:binding[@name=$subj]/*[$id_test = c:id-key(.)] and sp:binding[@name=$pred]/sp:uri/text()=&#34;https://example.com/person-vocabulary#id&#34;]" group-by="c:id-key(sp:binding[@name=$obj]/*[1])">
      <xsl:for-each select="current-group()[1]">
        <xsl:attribute name="id">
          <xsl:apply-templates select="sp:binding[@name=$obj]/sp:literal"/>
        </xsl:attribute>
      </xsl:for-each>
    </xsl:for-each-group>
    <xsl:if test="not($no_iri)">
      <xsl:for-each select="$id/sp:uri">
        <base:iri>
          <xsl:value-of select="."/>
        </base:iri>
      </xsl:for-each>
    </xsl:if>
    <xsl:for-each-group select="//sp:result[sp:binding[@name=$subj]/*[$id_test = c:id-key(.)] and sp:binding[@name=$pred]/sp:uri/text()=&#34;https://example.com/person-vocabulary#personName&#34;]" group-by="c:id-key(sp:binding[@name=$obj]/*[1])">
      <xsl:for-each select="current-group()[1]">
        <base:name>
          <xsl:apply-templates select="sp:binding[@name=$obj]/sp:literal"/>
        </base:name>
      </xsl:for-each>
    </xsl:for-each-group>
    <xsl:for-each-group select="//sp:result[sp:binding[@name=$subj]/*[$id_test = c:id-key(.)] and sp:binding[@name=$pred]/sp:uri/text()=&#34;https://example.com/person-vocabulary#hasPet&#34;]" group-by="c:id-key(sp:binding[@name=$obj]/*[1])">
      <xsl:for-each select="current-group()[1]">
        <base:has_pet>
          <xsl:call-template name="_https_003a_002f_002fofn.gov.cz_002fclass_002f1774613173029-586a-3caa-853c">
            <xsl:with-param name="id">
              <xsl:copy-of select="sp:binding[@name=$obj]/*"/>
            </xsl:with-param>
          </xsl:call-template>
        </base:has_pet>
      </xsl:for-each>
    </xsl:for-each-group>
  </xsl:template>
  <xsl:template name="_https_003a_002f_002fofn.gov.cz_002fclass_002f1774613173029-586a-3caa-853c">
    <xsl:param name="id"/>
    <xsl:param name="type_name" select="()"/>
    <xsl:param name="no_iri" select="false()"/>
    <xsl:if test="not(empty($type_name))">
      <xsl:attribute name="xsi:type">
        <xsl:value-of select="$type_name"/>
      </xsl:attribute>
    </xsl:if>
    <xsl:variable name="id_test">
      <xsl:value-of select="c:id-key($id/*)"/>
    </xsl:variable>
    <xsl:if test="not($no_iri)">
      <xsl:for-each select="$id/sp:uri">
        <base:iri>
          <xsl:value-of select="."/>
        </base:iri>
      </xsl:for-each>
    </xsl:if>
    <xsl:for-each-group select="//sp:result[sp:binding[@name=$subj]/*[$id_test = c:id-key(.)] and sp:binding[@name=$pred]/sp:uri/text()=&#34;https://example.com/person-vocabulary#name&#34;]" group-by="c:id-key(sp:binding[@name=$obj]/*[1])">
      <xsl:for-each select="current-group()[1]">
        <base:name>
          <xsl:apply-templates select="sp:binding[@name=$obj]/sp:literal"/>
        </base:name>
      </xsl:for-each>
    </xsl:for-each-group>
    <xsl:for-each-group select="//sp:result[sp:binding[@name=$subj]/*[$id_test = c:id-key(.)] and sp:binding[@name=$pred]/sp:uri/text()=&#34;https://example.com/person-vocabulary#hasKind&#34;]" group-by="c:id-key(sp:binding[@name=$obj]/*[1])">
      <xsl:for-each select="current-group()[1]">
        <xsl:call-template name="_https_003a_002f_002fofn.gov.cz_002fclass_002f1774622559762-61be-1571-b295">
          <xsl:with-param name="id">
            <xsl:copy-of select="sp:binding[@name=$obj]/*"/>
          </xsl:with-param>
          <xsl:with-param name="no_iri" select="true()"/>
        </xsl:call-template>
      </xsl:for-each>
    </xsl:for-each-group>
  </xsl:template>
  <xsl:template name="_https_003a_002f_002fofn.gov.cz_002fclass_002f1774622559762-61be-1571-b295">
    <xsl:param name="id"/>
    <xsl:param name="type_name" select="()"/>
    <xsl:param name="no_iri" select="false()"/>
    <xsl:if test="not(empty($type_name))">
      <xsl:attribute name="xsi:type">
        <xsl:value-of select="$type_name"/>
      </xsl:attribute>
    </xsl:if>
    <xsl:variable name="id_test">
      <xsl:value-of select="c:id-key($id/*)"/>
    </xsl:variable>
    <xsl:if test="not($no_iri)">
      <xsl:for-each select="$id/sp:uri">
        <base:iri>
          <xsl:value-of select="."/>
        </base:iri>
      </xsl:for-each>
    </xsl:if>
    <xsl:for-each-group select="//sp:result[sp:binding[@name=$subj]/*[$id_test = c:id-key(.)] and sp:binding[@name=$pred]/sp:uri/text()=&#34;https://example.com/person-vocabulary#kind&#34;]" group-by="c:id-key(sp:binding[@name=$obj]/*[1])">
      <xsl:for-each select="current-group()[1]">
        <base:kind>
          <xsl:apply-templates select="sp:binding[@name=$obj]/sp:literal"/>
        </base:kind>
      </xsl:for-each>
    </xsl:for-each-group>
  </xsl:template>
  <xsl:template match="@*|*"/>
</xsl:stylesheet>