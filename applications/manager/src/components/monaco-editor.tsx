import * as React from "react";
import {FC} from "react";
import RawMonacoEditor from "@monaco-editor/react";
import * as monaco from 'monaco-editor';
import { useTheme } from "next-themes";

export function handleEditorWillMount(m: typeof monaco) {
  m.editor.defineTheme('dataspecer-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
    ],
    colors: {
      'editor.background': '#0a0a0a',
    }
  });
  m.languages.json.jsonDefaults.setDiagnosticsOptions({
    enableSchemaRequest: true,
  });
}

export const MonacoEditor: FC<{
  refs: React.MutableRefObject<{ editor: monaco.editor.IStandaloneCodeEditor } | undefined>,
  defaultValue: string,
  language: string,
} & React.ComponentProps<typeof RawMonacoEditor>> = (props) => {
  const { resolvedTheme } = useTheme();

  return <div className="flex flex-col grow overflow-hidden">
      <RawMonacoEditor
          {...props}
          onMount={editor => props.refs.current = {editor}}
          theme={resolvedTheme === "dark" ? "dataspecer-dark" : "vs"}
          language={props.language}
          defaultValue={props.defaultValue}
          beforeMount={handleEditorWillMount}
          options={{
              wordWrap: "on",
              minimap: {
                  enabled: false
              },
              insertSpaces: true,
          }}
      />
  </div>;
}