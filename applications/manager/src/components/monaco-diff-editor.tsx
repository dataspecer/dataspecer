// Working the MonacoDiffEditor is pretty difficult for non-obvious reason.
// Basically if we put in new mergeFromContent, mergeToContent, then the editor is mounted again (all states/refs are reseted and onMount is called).
// However if those strings were already given to the editor, we do not mount the editor - the values are kept.

// We track changes to update the directory diff by checking the changes in editor in periodic events instead of on change, since the on change tracking does not work the best
//  and it destroys performance ... well at least we used to. Now we just update on model change, check the TODO.
// Also note that We also check one timer after user changes file, since the periodic event might not catch that (it is ended once the model is swapped)

// ... It is trully awful to get it working correctly


import { Dispatch, FC, SetStateAction, useEffect, useRef, useState } from "react";
import RawMonacoEditor, { DiffEditor } from "@monaco-editor/react";
import * as monaco from 'monaco-editor';
import { EditableType, getDiffNodeFromDiffTree, getEditableAndNonEditableValue, MergeState } from "@dataspecer/git";
import { useTheme } from "next-themes";
import { handleEditorWillMount } from "./monaco-editor";
import _ from "lodash";

export const MonacoDiffEditor: FC<{
  editorRef: React.RefObject<{ editor: monaco.editor.IStandaloneDiffEditor } | null>,
  mergeFromContent: string,
  mergeToContent: string,
  projectIrisTreePathToFilesystemNode: string,
  datastoreType: string | null,
  format: string,
  editable: EditableType,
  setMergeState: Dispatch<SetStateAction<MergeState | null>>,
} & React.ComponentProps<typeof RawMonacoEditor>> = (props) => {
  const { resolvedTheme } = useTheme();
  const editorsContent = getEditableAndNonEditableValue(props.editable, props.mergeFromContent, props.mergeToContent);

  const [previousNonEditableContent, setPreviousNonEditableContent] = useState<string | null>(null);
  const [previousEditableContent, setPreviousEditableContent] = useState<string | null>(null);
  const [previousDatastoreType, setPreviousDatastoreType] = useState<string | null>(null);
  const [previousProjectIrisTreePathToFilesystemNode, setPreviousProjectIrisTreePathToFilesystemNode] = useState<string | null>(null);

  // ..... We have to do this because otherwise the onDidDispose methods and so on use captures of props, which is bad, really bad.
  const datastoreTypeRef = useRef<string | null>(null);
  useEffect(() => {
    datastoreTypeRef.current = props.datastoreType;
  }, [props.datastoreType]);

  const projectIrisTreePathToFilesystemNodeRef = useRef<string | null>(null);
  useEffect(() => {
    projectIrisTreePathToFilesystemNodeRef.current = props.projectIrisTreePathToFilesystemNode;
  }, [props.projectIrisTreePathToFilesystemNode]);

  useEffect(() => {
    return () => {
      // Get the current content of the editor
      const original = props.editorRef.current?.editor.getOriginalEditor().getValue() ?? null;
      const modified = props.editorRef.current?.editor.getModifiedEditor().getValue() ?? null;
      setPreviousNonEditableContent(original);
      setPreviousEditableContent(modified);
      setPreviousDatastoreType(props.datastoreType);
      setPreviousProjectIrisTreePathToFilesystemNode(props.projectIrisTreePathToFilesystemNode);
    };
  }, [editorsContent.nonEditable, editorsContent.editable, props.projectIrisTreePathToFilesystemNode, props.datastoreType]);


  useEffect(() => {
    // https://github.com/microsoft/monaco-editor/issues/3963 ...
    //    otherwise we can move between windows by ctrl + z - since it contains the previous contents of the editor from different files
    const model = props.editorRef.current?.editor?.getModel()?.modified;
    if (model !== undefined) {
      model.setValue(model.getValue());
    }
  }, [props.projectIrisTreePathToFilesystemNode, props.datastoreType]);


  // // TODO RadStr PR: The change from "same" to "modified" causes lose of focus of the text editor I do not know how to fix that currently.
  // //                 ... Therefore, if we want to periodically update the diff editor uncomment this and fix the lose of focus. However, note that the code works.
  // //                 ..... Only the lose of focus is annoying
  // const currentIntervalId = useRef<NodeJS.Timeout | null>(null);
  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     if (props.projectIrisTreePathToFilesystemNode === null || props.datastoreType === null) {
  //       return;
  //     }

  //     const hasLineChanges: boolean = (props.editorRef.current?.editor.getLineChanges()?.length ?? 0) > 0;
  //     updateDiffNodeOnChange(
  //       props.editorRef.current?.editor ?? null, props.setMergeState, hasLineChanges,
  //       props.projectIrisTreePathToFilesystemNode, props.datastoreType
  //     );
  //   }, 2400);
  //   currentIntervalId.current = intervalId;

  //   return () => {
  //     if (currentIntervalId.current !== null) {
  //       clearInterval(currentIntervalId.current);
  //       currentIntervalId.current = null;
  //     }
  //   };
  // }, [props.projectIrisTreePathToFilesystemNode, props.datastoreType]);

  // Update the diff tree on model change
  useEffect(() => {
    if (previousNonEditableContent === null || previousProjectIrisTreePathToFilesystemNode === null ||
       (previousProjectIrisTreePathToFilesystemNode === props.projectIrisTreePathToFilesystemNode && previousDatastoreType === props.datastoreType)
    ) {
      return;
    }
    const hasLineChanges: boolean = previousEditableContent !== previousNonEditableContent;
    // Call it explicitly again when user changes model
    updateDiffNodeOnChange(
      props.editorRef.current?.editor ?? null, props.setMergeState, hasLineChanges,
      previousProjectIrisTreePathToFilesystemNode, previousDatastoreType
    );
  }, [previousNonEditableContent, previousEditableContent, previousDatastoreType, previousProjectIrisTreePathToFilesystemNode]);

  const originalEditorContent = useRef<string | undefined>(undefined);
  const modifiedEditorContent = useRef<string | undefined>(undefined);

  return <div className="flex flex-col grow overflow-hidden h-screen! w-full!">
    <DiffEditor
      {...props}
      onMount={(editor: any) => {
        addKeyBindings(editor);
        props.editorRef.current = {editor};

        const model = props.editorRef.current?.editor.getModel() ?? null;

        if (model !== null) {
          model.original.setValue(editorsContent.nonEditable);
          model.modified.setValue(editorsContent.editable);
        }

        originalEditorContent.current = editor.getModel().original.getValue();
        modifiedEditorContent.current = editor.getModel().modified.getValue();

        editor.getModifiedEditor().onDidChangeModel(() => {
          // This is called before dispose
          originalEditorContent.current = editor.getModel().original.getValue();
          modifiedEditorContent.current = editor.getModel().modified.getValue();
        });

        props.editorRef.current.editor.getOriginalEditor().onDidDispose(() => {
          if (projectIrisTreePathToFilesystemNodeRef.current === null) {
            return;
          }
          // TODO RadStr Debug: Debug prints
          // const hasLineChanges = (editor.getLineChanges()?.length ?? 0) > 0;
          // const hashLineChanges2 = (props.editorRef.current?.editor.getLineChanges()?.length ?? 0) > 0;
          // const origoValue = props.editorRef.current?.editor.getOriginalEditor().getValue();
          // const modValue = props.editorRef.current?.editor.getModifiedEditor().getValue();
          // const origoEqualMod = origoValue === modValue;
          // const origoValue2 = originalEditorContent.current;
          // const modValue2 = modifiedEditorContent.current;
          // const origoEqualMod2 = origoValue2 === modValue2;
          // console.info("ORIGO");
          // console.info({hasLineChanges, hashLineChanges2, origoValue, modValue, origoEqualMod, origoValue2, modValue2, origoEqualMod2,
          //   "props-projectIrisTreePathToFilesystemNode": props.projectIrisTreePathToFilesystemNode, "props.datastoreType": props.datastoreType, editor,
          // "projectIrisTreePathToFilesystemNodeRef.current": projectIrisTreePathToFilesystemNodeRef.current, "datastoreTypeRef.current": datastoreTypeRef.current});
          // updateDiffNodeOnChange(
          //   editor ?? null, props.setMergeState, !origoEqualMod2,
          //   projectIrisTreePathToFilesystemNodeRef.current, datastoreTypeRef.current
          // );


          const hasLineChanges = originalEditorContent.current === modifiedEditorContent.current;
          updateDiffNodeOnChange(
            editor ?? null, props.setMergeState, hasLineChanges,
            projectIrisTreePathToFilesystemNodeRef.current, datastoreTypeRef.current
          );
        });
      }}
      theme={resolvedTheme === "dark" ? "dataspecer-dark" : "vs"}
      language={props.format}
      original={editorsContent.nonEditable}
      modified={editorsContent.editable}
      beforeMount={handleEditorWillMount}

      options={{
        minimap: {
          enabled: false,
        },
        readOnly: editorsContent.editable === "null",

        // This is if we want to editable editor to be different than the right one
        // originalEditable: props.editable === "mergeFrom",
        // readOnly: props.editable === "mergeFrom",
      }}
    />
  </div>;
}



const updateDiffNodeOnChange = (
  editor: monaco.editor.IStandaloneDiffEditor | null,
  setMergeState: Dispatch<SetStateAction<MergeState | null>>,
  hasLineChanges: boolean,

  projectIrisTreePathToFilesystemNode: string,
  datastoreType: string | null,
) => {
  if (editor === null) {
    return;
  }

  setMergeState(prev => {
    if (prev === null) {
      return null;
    }
    if (projectIrisTreePathToFilesystemNode === null) {
      // Should not happen but we just do nothing instead of throwing error.
      console.error("Inside Monaco Diff editor the path to the file node is null, which should not happen, this is probably programmer error.");
      return prev;
    }

    // We first check on the old one, so we dont have to create copy of merge state if it is not needed (micro-optimization)
    // we have to go through tree twice now, but I feel like that the cloning will be much more expensive.
    const diffNodeToChangeNonCopy = getDiffNodeFromDiffTree(prev.diffTreeData?.diffTree!, projectIrisTreePathToFilesystemNode);
    const datastoreComparisonToChangeNonCopy = diffNodeToChangeNonCopy?.datastoreComparisons
      .find(datastoreComparison => datastoreComparison.affectedDataStore.type === datastoreType);
    if (hasLineChanges) {
      if (datastoreComparisonToChangeNonCopy?.datastoreComparisonResult === "same") {
        // We went from no changes to changes
        // TODO RadStr PR: ... deep clone is not the fastest, it could be faster by copying only the needed stuff, but note that {...prev} is not enough
        const mergeStateCopy = _.cloneDeep(prev);
        const diffNodeToChange = getDiffNodeFromDiffTree(mergeStateCopy.diffTreeData?.diffTree!, projectIrisTreePathToFilesystemNode);
        const datastoreComparisonToChange = diffNodeToChange?.datastoreComparisons
          .find(datastoreComparison => datastoreComparison.affectedDataStore.type === datastoreType);
        datastoreComparisonToChange!.datastoreComparisonResult = "modified";
        return mergeStateCopy;
      }
      else {
        return prev;
      }
    }
    else {
      if (datastoreComparisonToChangeNonCopy?.datastoreComparisonResult === "modified") {
        // TODO: Copy-pasted from the above
        // We went from changes to no changes
        // TODO RadStr PR: ... deep clone is not the fastest, it could be faster by copying only the needed stuff, but note that {...prev} is not enough
        const mergeStateCopy = _.cloneDeep(prev);
        const diffNodeToChange = getDiffNodeFromDiffTree(mergeStateCopy.diffTreeData?.diffTree!, projectIrisTreePathToFilesystemNode);
        const datastoreComparisonToChange = diffNodeToChange?.datastoreComparisons
          .find(datastoreComparison => datastoreComparison.affectedDataStore.type === datastoreType);
        datastoreComparisonToChange!.datastoreComparisonResult = "same";
        return mergeStateCopy;
      }
      else {
        return prev;
      }
    }
  });
}


function addKeyBindings(editor: any) {
  editor.addCommand(
    monaco.KeyMod.CtrlCmd + monaco.KeyCode.DownArrow,
    () => goToNextDiff(editor),
  );
  editor.addCommand(
    monaco.KeyMod.CtrlCmd + monaco.KeyCode.UpArrow,
    () => goToNextDiff(editor),
  );
}

export function goToNextDiff(editor: monaco.editor.IStandaloneDiffEditor | undefined) {
  if (editor === undefined) {
    return;
  }

  const pos = editor.getPosition();
  const changes = editor.getLineChanges();
  for (const change of changes ?? []) {
    if (change.modifiedStartLineNumber > (pos?.lineNumber ?? 1000000000)) {
      // editor.revealLine(change.modifiedStartLineNumber);
      editor.setPosition({
        column: 1,
        lineNumber: change.modifiedStartLineNumber,
      });
      editor.revealLineInCenter(change.modifiedStartLineNumber);
      break;
    }
  }
}

export function goToPreviousDiff(editor: monaco.editor.IStandaloneDiffEditor | undefined) {
  if (editor === undefined) {
    return;
  }

  const pos = editor.getPosition();
  const changes = editor.getLineChanges();
  for (const change of (changes ?? []).reverse()) {     // TODO: Micro-optim - use classic for cycle instead of "foreach"
    if (change.modifiedStartLineNumber < (pos?.lineNumber ?? -1000000000)) {
      editor.setPosition({
        column: 1,
        lineNumber: change.modifiedStartLineNumber,
      });
      editor.revealLineInCenter(change.modifiedStartLineNumber);
      // editor.revealLine(change.modifiedStartLineNumber);
      break;
    }
  }
}
