import * as React from "react";
import {FC} from "react";
import RawMonacoEditor, { DiffEditor } from "@monaco-editor/react";
import * as monaco from 'monaco-editor';
import { handleEditorWillMount } from "./monaco-editor";
import { useTheme } from "next-themes";

export const MonacoDiffEditor: FC<{
  refs: React.MutableRefObject<{ editor: monaco.editor.IStandaloneDiffEditor } | undefined>,
  originalContent: string,
  modifiedContent: string,
  language: string,
} & React.ComponentProps<typeof RawMonacoEditor>> = (props) => {
  const { resolvedTheme } = useTheme();


  return <div className="flex flex-col grow overflow-hidden">
      <DiffEditor
          {...props}
          onMount={editor => {
            props.refs.current = {editor};
          }}
          theme={resolvedTheme === "dark" ? "dataspecer-dark" : "vs"}
          language={props.language}
          original={props.originalContent}
          modified={props.modifiedContent}
          beforeMount={handleEditorWillMount}

          options={{
            glyphMargin: true,       // TODO RadStr: Have to enable if we want to show something next the line numbers ... however that was just for testing of possibilities
            minimap: {
              enabled: false
            },
          }}
      />
  </div>;
}
