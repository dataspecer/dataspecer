import { OutputStream } from "@dataspecer/core/io/stream/output-stream";

/**
 * A namespace map is a prefix to URI mapping, supporting registering
 * new namespaces and obtaining the URI from a prefix and vice versa.
 */
export interface XmlNamespaceMap {
  /**
   * Converts a namespace prefix and a local name to a QName-formatted value.
   * @param namespacePrefix The namespace prefix. May be null to omit.
   * @param localName The local name part of the QName.
   */
  getQName(namespacePrefix: string | null, localName: string): string;

  /**
   * Returns one of the prefixes corresponding to a namepace URI, if defined.
   * @param uri The namespace URI.
   */
  getPrefixForUri(uri: string): string | undefined;

  /**
   * Returns the namespace URi registered using a specific prefix.
   * @param prefix The prefix to lookup.
   */
  getUriForPrefix(prefix: string): string | undefined;

  /**
   * Registers a new namespace prefix mapping to a specific URI.
   * @param prefix The namespace prefix.
   * @param uri The namespace URI.
   */
  registerNamespace(prefix: string, uri: string): void;
}

/**
 * An interface for an XML writer, supporting asynchronous writing of tags,
 * attributes, and other parts of XML.
 */
export interface XmlWriter extends XmlNamespaceMap {
  /**
   * Writes an XML declaration.
   * @param version The version attribute of the declaration.
   * @param encoding The encoding attribute of the declaration.
   */
  writeXmlDeclaration(version: string, encoding: string): Promise<void>;

  /**
   * Writes the start tag of an element.
   * @param namespacePrefix The namespaces prefix of the element, or null.
   * @param elementName The local name of the element.
   */
  writeElementBegin(
    namespacePrefix: string | null,
    elementName: string,
  ): Promise<void>;

  /**
   * Writes the end tag of an element.
   * @param namespacePrefix The namespaces prefix of the element, or null.
   * @param elementName The local name of the element.
   */
  writeElementEnd(
    namespacePrefix: string | null, elementName: string
  ): Promise<void>;

  /**
   * Writes a full element with a text value and no attributes.
   * @param namespacePrefix The namespaces prefix of the element, or null.
   * @param elementName The local name of the element.
   * @param elementValue The value of the element, or null to skip it.
   */
  writeElementValue(
    namespacePrefix: string | null,
    elementName: string,
    elementValue: string | null
  ): Promise<void>;

  /**
   * Writes an empty element.
   * @param namespacePrefix The namespaces prefix of the element, or null.
   * @param elementName The local name of the element.
   */
  writeElementEmpty(
    namespacePrefix: string | null,
    elementName: string
  ): Promise<void>;

  /**
   * Produces a function used for writing the full content of an element.
   * @param namespacePrefix The namespaces prefix of the element, or null.
   * @param elementName The local name of the element.
   * @returns A function which, when called, calls its argument to produce
   * the content, and automatically wraps it in the element's tags.
   */
  writeElementFull(
    namespacePrefix: string | null,
    elementName: string
  ): (content: (writer: XmlWriter) => Promise<void>) => Promise<void>;

  /**
   * Writes an attribute on an element.
   * @param namespacePrefix The namespaces prefix of the attribute, or null.
   * @param attributeName The local name of the attribute.
   * @param attributeValue The value of the attribute, or null to skip it.
   */
  writeAttributeValue(
    namespacePrefix: string | null,
    attributeName: string,
    attributeValue: string | null
  ): Promise<void>;

  /**
   * Writes an attribute on an element without a namespace.
   * @param attributeName The local name of the attribute.
   * @param attributeValue The value of the attribute, or null to skip it.
   */
  writeLocalAttributeValue(
    attributeName: string,
    attributeValue: string | null
  ): Promise<void>;

  /**
   * Writes an xmlns declaration.
   * @param prefix The prefix of the declared namespace.
   * @param uri The namespace URI.
   */
  writeNamespaceDeclaration(prefix: string, uri: string): Promise<void>;

  /**
   * Writes an xmlns declaration and automatically registers.
   * @param prefix The prefix of the declared namespace.
   * @param uri The namespace URI.
   */
  writeAndRegisterNamespaceDeclaration(
    prefix: string, uri: string
  ): Promise<void>;

  /**
   * Writes a comment.
   * @param comment The value of the comment.
   */
  writeComment(comment: string): Promise<void>;

  /**
   * Writes a plain text. Characters are escaped automatically
   * @param text The value of the text.
   */
  writeText(text: string): Promise<void>;
}

class XmlSimpleNamespaceMap implements XmlNamespaceMap {
  private readonly prefixToUri: Record<string, string>;

  constructor() {
    this.prefixToUri = {};

    // Reserved prefixes per https://www.w3.org/TR/REC-xml-names/#xmlReserved
    this.registerNamespace("xml", "http://www.w3.org/XML/1998/namespace");
    this.registerNamespace("xmlns", "http://www.w3.org/2000/xmlns/");
  }

  getPrefixForUri(uri: string): string | undefined {
    for (const prefix of Object.keys(this.prefixToUri)) {
      const prefixUri = this.prefixToUri[prefix];
      if (prefixUri === uri) {
        return prefixUri;
      }
    }
    return undefined;
  }

  getUriForPrefix(prefix: string): string | undefined {
    return this.prefixToUri[prefix];
  }

  registerNamespace(prefix: string, uri: string): void {
    if (prefix == null || prefix === "") {
      throw new Error("Prefix must be defined.");
    }
    if (uri == null || uri === "") {
      delete this.prefixToUri[prefix];
    }
    this.prefixToUri[prefix] = uri;
  }

  getQName(
    namespacePrefix: string | null,
    localName: string
  ): string {
    if (namespacePrefix != null) {
      if (this.getUriForPrefix(namespacePrefix) == null) {
        throw new Error(
          `An unregistered namespace prefix ${namespacePrefix} was used.`
        );
      }
      return `${namespacePrefix}:${localName}`;
    } else {
      return localName;
    }
  }
}

/**
 * Escapes XML AttValue (see https://www.w3.org/TR/xml/#NT-AttValue)
 */
function xmlEscape(text: string): string {
  return text.replace(/[&<>"]/g, function (m) {
    return `&#${m.charCodeAt(0)};`;
  });
}

/**
 * An abstract XML writer which writes to a text output, supporting indentation.
 */
export abstract class XmlIndentingTextWriter
  extends XmlSimpleNamespaceMap
  implements XmlWriter
{
  private readonly indentSequence = "  ";
  private indentLevel = 0;
  private currentIndent = "";

  private elementTagOpen = false;

  protected abstract write(text: string): Promise<void>;
  protected abstract writeLine(text: string): Promise<void>;

  private indent(level: number): void {
    if (this.indentLevel + level < 0) {
      throw new Error("Element level mismatch!");
    }
    this.indentLevel += level;
    this.currentIndent = this.indentSequence.repeat(this.indentLevel);
  }

  private async leaveElementAttributes(): Promise<void> {
    if (this.elementTagOpen) {
      await this.writeLine(">");
      this.elementTagOpen = false;
      this.indent(1);
    }
  }

  async writeXmlDeclaration(version: string, encoding: string): Promise<void> {
    await this.leaveElementAttributes();
    await this.writeLine(
      this.currentIndent +
        `<?xml version="${version}" encoding="${encoding}"?>`
    );
  }

  async writeElementBegin(
    namespacePrefix: string | null,
    elementName: string
  ): Promise<void> {
    const qname = this.getQName(namespacePrefix, elementName);
    await this.leaveElementAttributes();
    await this.write(this.currentIndent + `<${qname}`);
    this.elementTagOpen = true;
  }

  async writeElementValue(
    namespacePrefix: string | null,
    elementName: string,
    elementValue: string | null
  ): Promise<void> {
    const qname = this.getQName(namespacePrefix, elementName);
    if (elementValue != null) {
      await this.leaveElementAttributes();
      await this.writeLine(
        this.currentIndent + `<${qname}>${xmlEscape(elementValue)}</${qname}>`
      );
    }
  }

  async writeElementEmpty(
    namespacePrefix: string | null,
    elementName: string
  ): Promise<void> {
    await this.writeElementBegin(namespacePrefix, elementName);
    await this.writeElementEnd(namespacePrefix, elementName);
  }

  writeElementFull(
    namespacePrefix: string | null,
    elementName: string
  ): (content: (writer: XmlWriter) => Promise<void>) => Promise<void> {
    return async content => {
      await this.writeElementBegin(namespacePrefix, elementName);
      await content(this);
      await this.writeElementEnd(namespacePrefix, elementName);
    };
  }

  async writeAttributeValue(
    namespacePrefix: string | null,
    attributeName: string,
    attributeValue: string | null
  ): Promise<void> {
    if (!this.elementTagOpen) {
      throw new Error(
        "Attempting to write an attribute but no element is open."
      );
    }
    const qname = this.getQName(namespacePrefix, attributeName);
    if (attributeValue != null) {
      await this.write(` ${qname}="${xmlEscape(attributeValue)}"`);
    }
  }

  async writeLocalAttributeValue(
    attributeName: string,
    attributeValue: string | null
  ): Promise<void> {
    await this.writeAttributeValue(null, attributeName, attributeValue);
  }

  async writeNamespaceDeclaration(prefix: string, uri: string): Promise<void> {
    await this.writeAttributeValue("xmlns", prefix, uri);
  }

  async writeAndRegisterNamespaceDeclaration(
    prefix: string,
    uri: string
  ): Promise<void> {
    this.registerNamespace(prefix, uri);
    await this.writeAttributeValue("xmlns", prefix, uri);
  }

  async writeComment(comment: string): Promise<void> {
    await this.leaveElementAttributes();
    await this.writeLine(this.currentIndent + `<!--${comment}-->`);
  }

  async writeText(text: string): Promise<void> {
    await this.leaveElementAttributes();
    const escaped = xmlEscape(text);
    const lines = escaped.split(/(\r\n|\r|\n)/); // This keeps line endings in the result
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === "\r\n" || line === "\r" || line === "\n") {
        await this.write(line);
      } else if (line.length > 0) {
        await this.write(this.currentIndent + line);
      }
    }
  }

  async writeElementEnd(
    namespacePrefix: string,
    elementName: string
  ): Promise<void> {
    if (this.elementTagOpen) {
      await this.writeLine("/>");
      this.elementTagOpen = false;
    } else {
      const qname = this.getQName(namespacePrefix, elementName);
      this.indent(-1);
      await this.writeLine(this.currentIndent + `</${qname}>`);
    }
  }
}

/**
 * An implementation of an XML writer using an {@link OutputStream}.
 */
export class XmlStreamWriter extends XmlIndentingTextWriter {
  private readonly stream: OutputStream;

  constructor(stream: OutputStream) {
    super();
    this.stream = stream;
  }

  protected write(text: string): Promise<void> {
    return this.stream.write(text);
  }

  protected async writeLine(text: string): Promise<void> {
    await this.stream.write(text);
    await this.stream.write("\n");
  }
}
