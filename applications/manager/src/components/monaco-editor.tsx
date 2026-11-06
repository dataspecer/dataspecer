import * as React from "react";
import { FC, useLayoutEffect, useRef } from "react";
import RawMonacoEditor, { DiffEditor as RawMonacoDiffEditor, useMonaco } from "@monaco-editor/react";
import * as monaco from 'monaco-editor';
import { useTheme } from "next-themes";
import { useEventCallback } from "@/hooks/use-event-callback";

function handleEditorWillMount(m: typeof monaco) {
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

export const MonacoDiffEditor: FC<{
  original: string,
  modified: string,
  language: string,
  onModifiedChange: (value: string) => void,
  renderSideBySide?: boolean,
} & React.ComponentProps<typeof RawMonacoDiffEditor>> = (props) => {
  const { resolvedTheme } = useTheme();
  const { onModifiedChange, renderSideBySide, onMount, ...editorProps } = props;
  const handleModifiedChange = useEventCallback(onModifiedChange);

  return <div className="flex flex-col grow overflow-hidden">
      <RawMonacoDiffEditor
          {...editorProps}
          onMount={(editor, monaco) => {
            editor.getModifiedEditor().onDidChangeModelContent(() => handleModifiedChange(editor.getModifiedEditor().getValue()));
            onMount?.(editor, monaco);
          }}
          theme={resolvedTheme === "dark" ? "dataspecer-dark" : "vs"}
          language={props.language}
          beforeMount={handleEditorWillMount}
          options={{
              renderSideBySide: renderSideBySide ?? true,
              originalEditable: false,
              wordWrap: "on",
              minimap: { enabled: false },
          }}
      />
  </div>;
};

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

export const MonacoEditorWithDiff: FC<{
  modelId: string;
  original: string;
  modified: string;
  language: string;
  showDiff: boolean;
  renderSideBySide?: boolean;
  onModifiedChange: (value: string) => void;
}> = ({ modelId, original, modified, language, showDiff, renderSideBySide = true, onModifiedChange }) => {
  const monacoInstance = useMonaco();
  const { resolvedTheme } = useTheme();
  const handleModifiedChange = useEventCallback(onModifiedChange);
  const editorContainer = useRef<HTMLDivElement>(null);
  const diffContainer = useRef<HTMLDivElement>(null);
  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const diffEditor = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const applyingProps = useRef(false);
  const currentView = useRef<{ modelId: string; showDiff: boolean } | null>(null);
  const models = useRef(new Map<string, {
    original: monaco.editor.ITextModel;
    modified: monaco.editor.ITextModel;
    originalViewState: monaco.editor.ICodeEditorViewState | null;
    modifiedViewState: monaco.editor.ICodeEditorViewState | null;
  }>());

  useLayoutEffect(() => {
    if (!monacoInstance || !editorContainer.current || !diffContainer.current) return;
    handleEditorWillMount(monacoInstance);
    const options = {
      automaticLayout: true,
      wordWrap: "on" as const,
      minimap: { enabled: false },
      insertSpaces: true,
    };
    const normal = monacoInstance.editor.create(editorContainer.current, { ...options, model: null });
    const diff = monacoInstance.editor.createDiffEditor(diffContainer.current, { ...options, originalEditable: false });
    editor.current = normal;
    diffEditor.current = diff;
    const subscription = normal.onDidChangeModelContent(() => {
      if (!applyingProps.current) handleModifiedChange(normal.getValue());
    });
    const cachedModels = models.current;
    return () => {
      subscription.dispose();
      diff.dispose();
      normal.dispose();
      for (const model of cachedModels.values()) {
        model.original.dispose();
        model.modified.dispose();
      }
      cachedModels.clear();
      currentView.current = null;
      editor.current = null;
      diffEditor.current = null;
    };
  }, [monacoInstance, handleModifiedChange]);

  useLayoutEffect(() => {
    const normal = editor.current;
    const diff = diffEditor.current;
    if (!monacoInstance || !normal || !diff || !editorContainer.current || !diffContainer.current) return;
    const previous = currentView.current;
    const modelChanged = previous?.modelId !== modelId;
    const viewChanged = previous?.showDiff !== showDiff;
    const hadFocus = normal.hasTextFocus() || diff.getModifiedEditor().hasTextFocus() || diff.getOriginalEditor().hasTextFocus();

    if (previous && (modelChanged || viewChanged)) {
      const previousModel = models.current.get(previous.modelId)!;
      const activeEditor = previous.showDiff ? diff.getModifiedEditor() : normal;
      previousModel.modifiedViewState = activeEditor.saveViewState();
      previousModel.originalViewState = diff.getOriginalEditor().saveViewState();
    }

    let model = models.current.get(modelId);
    if (!model) {
      model = {
        original: monacoInstance.editor.createModel(original, language),
        modified: monacoInstance.editor.createModel(modified, language),
        originalViewState: null,
        modifiedViewState: null,
      };
      models.current.set(modelId, model);
    }

    applyingProps.current = true;
    try {
      if (model.original.getValue() !== original) model.original.setValue(original);
      if (model.modified.getValue() !== modified) {
        model.modified.pushStackElement();
        model.modified.pushEditOperations([], [{ range: model.modified.getFullModelRange(), text: modified }], () => null);
        model.modified.pushStackElement();
      }
      for (const textModel of [model.original, model.modified]) {
        if (textModel.getLanguageId() !== language) monacoInstance.editor.setModelLanguage(textModel, language);
      }
      if (modelChanged) {
        normal.setModel(model.modified);
        diff.setModel({ original: model.original, modified: model.modified });
      }
      diff.updateOptions({ renderSideBySide });

      // Hide only after capturing focus; both containers keep their layout dimensions.
      editorContainer.current.inert = showDiff;
      editorContainer.current.style.visibility = showDiff ? "hidden" : "visible";
      editorContainer.current.style.opacity = showDiff ? "0" : "1";
      diffContainer.current.inert = !showDiff;
      diffContainer.current.style.visibility = showDiff ? "visible" : "hidden";
      diffContainer.current.style.opacity = showDiff ? "1" : "0";

      const activeEditor = showDiff ? diff.getModifiedEditor() : normal;
      if (modelChanged || viewChanged) {
        activeEditor.restoreViewState(model.modifiedViewState);
        if (modelChanged) diff.getOriginalEditor().restoreViewState(model.originalViewState);
        if (hadFocus) activeEditor.focus();
      }
      currentView.current = { modelId, showDiff };
    } finally {
      applyingProps.current = false;
    }
  }, [monacoInstance, modelId, original, modified, language, showDiff, renderSideBySide]);

  useLayoutEffect(() => {
    monacoInstance?.editor.setTheme(resolvedTheme === "dark" ? "dataspecer-dark" : "vs");
  }, [monacoInstance, resolvedTheme]);

  return <div className="relative grow min-h-0">
    {!monacoInstance && <div className="absolute inset-0 flex items-center justify-center">Loading...</div>}
    <div ref={editorContainer} className="absolute inset-0 invisible opacity-0" />
    <div ref={diffContainer} className="absolute inset-0 invisible opacity-0" />
  </div>;
};
