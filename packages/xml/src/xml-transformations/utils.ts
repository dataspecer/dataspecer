import type { XmlWriter } from "../xml/xml-writer.ts";
import type { XmlTransformationImport } from "./xslt-model.ts";

export async function writePrefixesFromImports(imports: XmlTransformationImport[], writer: XmlWriter): Promise<void> {
  const alreadyRegistered: Record<string, string> = {};

  for (const importDeclaration of imports) {
    const namespace = await importDeclaration.namespace;
    const prefix = await importDeclaration.prefix;
    if (namespace != null && prefix != null) {
      if (!alreadyRegistered[prefix]) {
        await writer.writeAndRegisterNamespaceDeclaration(prefix, namespace);
        alreadyRegistered[prefix] = namespace;
      } else if (alreadyRegistered[prefix] !== namespace) {
        throw new Error(`Imported namespace prefix "${prefix}:" is used for two ` + `different namespaces, "${alreadyRegistered[prefix]}" and "${namespace}".`);
      }
    }
  }
}
