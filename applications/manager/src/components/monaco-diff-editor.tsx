// Working the MonacoDiffEditor is pretty difficult for non-obvious reason.
// Basically if we put in new mergeFromContent, mergeToContent, then the editor is mounted again (all states/refs are reseted and onMount is called).
// However if those strings were already given to the editor, we do not mount the editor - the values are kept.
// Because of that we explicitly track if it was change in already existing models (changedUnderlyingModelsInEditor) changed
// So we do not call updateDiffNodeOnChange with old values if we swap model (we would then modify the new diff node based on editor differences in the old diff node (the one before swap))

// Also there is possible optimization to have interval set for every 2 seconds for example and on editing change inside editor just update ref variable that some change happened
// And then each 2 seconds check if the diff tree needs updating. Currently we check if the node needs updating on each editor update, but since the performance hit is not so big we kept it.
// Also due to behavior explained above, I just implemented it the easiest way possible.


import { Dispatch, FC, SetStateAction, useEffect, useRef } from "react";
import RawMonacoEditor, { DiffEditor } from "@monaco-editor/react";
import * as monaco from 'monaco-editor';
import { EditableType, getDiffNodeFromDiffTree, getEditableAndNonEditableValue, MergeState } from "@dataspecer/git";
import { useTheme } from "next-themes";
import { handleEditorWillMount } from "./monaco-editor";

export const MonacoDiffEditor: FC<{
  editorRef: React.RefObject<{ editor: monaco.editor.IStandaloneDiffEditor } | undefined>,
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
  const editorContentChanged = useRef<boolean>(false);
  const changedUnderlyingModelsInEditor = useRef<boolean>(false);
  const currentProjectIrisTreePathToFilesystemNode = useRef<string | null>(null);
  const currentDatastoreType = useRef<string | null>(null);

  console.error({projectIrisTreePathToFilesystemNode: props.projectIrisTreePathToFilesystemNode});

  // useEffect(() => {
  //   alert("Changed props.editorRef.current");
  //   const model = props.editorRef.current?.editor.getModel() ?? null;
  //   if (model !== null) {
  //     alert("Important");
  //     model.original.setValue(editorsContent.nonEditable);
  //     model.modified.setValue(editorsContent.editable);

  //     // Only the modified since in current version we allow only editing of the one editor.
  //     model.modified.onDidChangeContent(() => {
  //       setTimeout(() => {
  //         console.info("Cotnent: " + model.modified.getValue());
  //         editorContentChanged.current = true;
  //         updateDiffNodeOnChange(props.projectIrisTreePathToFilesystemNode, props.datastoreType);
  //       }, 400);
  //     });
  //   }
  // }, [props.editorRef.current])

  useEffect(() => {
    alert("Use effect");
    changedUnderlyingModelsInEditor.current = true;
    currentProjectIrisTreePathToFilesystemNode.current = props.projectIrisTreePathToFilesystemNode;
    currentDatastoreType.current = props.datastoreType;
    // const capturedProps = props;
    // console.info({currentDebugIndex: currentDebugIndex.current});
    // const capturedDebugIndex = currentDebugIndex.current;
    // const intervalId: NodeJS.Timeout = setInterval(() => {
    //   console.log("Timeout fired");
    //   console.info({capturedProps, props});
    //   console.info(capturedDebugIndex);
    //   alert("Timeout fired: " + capturedDebugIndex);      // TODO RadStr Debug: Debug alert
    //   updateDiffNodeOnChange(props.projectIrisTreePathToFilesystemNode, props.datastoreType);
    // }, 12000);
    // currentlyRunningIntervals.current.push(intervalId);
    // alert("useEffect added new one");
    // currentDebugIndex.current++;


    if (props.editorRef.current === undefined) {
      return;
    }
    // const model = props.editorRef.current.editor.getModel();
    // if (model !== null) {
    //   alert("Important");
    //   model.original.setValue(editorsContent.nonEditable);
    //   model.modified.setValue(editorsContent.editable);

    //   // Only the modified since in current version we allow only editing of the one editor.
    //   model.modified.onDidChangeContent(() => {
    //     setTimeout(() => {
    //       console.info("Cotnent: " + model.modified.getValue());
    //       editorContentChanged.current = true;
    //       updateDiffNodeOnChange(props.projectIrisTreePathToFilesystemNode, props.datastoreType);
    //     }, 400);
    //   });
    // }

    return () => {
      alert("Use effect cleanp");
      // clearInterval(intervalId);
      // console.info("Before:");
      // console.info({currentlyAvailableIntervals: currentlyRunningIntervals.current});
      // currentlyRunningIntervals.current = currentlyRunningIntervals.current.filter(interval => interval !== intervalId);
      // console.info("After:");
      // console.info({currentlyAvailableIntervals: currentlyRunningIntervals.current});
      // updateDiffNodeOnChange(props.projectIrisTreePathToFilesystemNode, props.datastoreType);

      // const mod = props.editorRef.current?.editor.getModifiedEditor();
      // const orig = props.editorRef.current?.editor.getOriginalEditor();

      // props.editorRef.current?.editor?.setModel(null);
      // mod?.dispose();
      // orig?.dispose();
    };
  }, [props.mergeFromContent, props.mergeToContent]);


  const updateDiffNodeOnChange = (projectIrisTreePathToFilesystemNode: string, datastoreType: string | null) => {
    // TODO RadStr Debug:
    // console.info({projectIrisTreePathToFilesystemNode, currentProjectIrisTreePathToFilesystemNode, datastoreType, currentDatastoreType});
    // return;

    if (props.editorRef.current === undefined) {
      alert("updateDiffNodeOnChange - props.editorRef.current === undefined");
      return;
    }

    props.setMergeState(prev => {
      const model = props.editorRef.current?.editor.getModel() ?? null;
      const lineChanges = props.editorRef.current?.editor.getLineChanges();
      console.info("Cotnent inside updateDiffNodeOnChange: " + model?.modified.getValue());
      alert("updateDiffNodeOnChange - props.editorRef.current !== undefined: " + lineChanges?.length);
      if (lineChanges === null) {
        alert("Line changes are null");
      }
      console.info({lineChanges});
      if (model === null) {
        return prev;
      }
      console.info("props.setMergeState")
      if (prev === null) {
        return null;
      }
      if (projectIrisTreePathToFilesystemNode === null) {
        alert("Should not happen");       // TODO RadStr: Debug
        return prev;
      }

      // We first check on the old one, so we dont have to create copy of merge state if it is not needed (micro-optimization)
      // we have to go through tree twice now, but I feel like that the cloning will be much more expensive.
      console.info({diftre: prev.diffTreeData?.diffTree, projectIrisTreePathToFilesystemNode})
      const diffNodeToChangeNonCopy = getDiffNodeFromDiffTree(prev.diffTreeData?.diffTree!, projectIrisTreePathToFilesystemNode);
      const datastoreComparisonToChangeNonCopy = diffNodeToChangeNonCopy?.datastoreComparisons
        .find(datastoreComparison => datastoreComparison.affectedDataStore.type === datastoreType);
      console.info({lineChanges});
      alert("LN Changes: " + lineChanges?.length);
      if (lineChanges?.length !== undefined && lineChanges.length > 0) {
        if (datastoreComparisonToChangeNonCopy?.datastoreComparisonResult === "same") {
          console.info({datastoreComparisonToChangeNonCopy});
          alert("Changing to modified: " + datastoreComparisonToChangeNonCopy.new?.projectIrisTreePath.split("/").at(-1));
          // We went from no changes to changes
          const mergeStateCopy = {...prev};
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
          console.info({datastoreComparisonToChangeNonCopy});
          alert("Changing to same: " + datastoreComparisonToChangeNonCopy.new?.projectIrisTreePath.split("/").at(-1));
          // We went from changes to no changes
          const mergeStateCopy = {...prev};
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

    editorContentChanged.current = false;
  }

  // const memoizedOptions = useMemo(() => {
  //   return {
  //       minimap: {
  //         enabled: false
  //       },
  //       // This is if we want to editable editor to be different than the right one
  //       // originalEditable: props.editable === "mergeFrom",
  //       // readOnly: props.editable === "mergeFrom",
  //     };
  // }, []);

  // const onDidEditorDispose = () => {
  //   console.error(props.projectIrisTreePathToFilesystemNode, props.datastoreType);
  //   alert("onDidEditorDispose");
  //   for (const runningInterval of currentlyRunningIntervals.current) {
  //     alert("CLEARING!");
  //     clearInterval(runningInterval);
  //   }
  //   alert("Disposing");
  //   currentlyRunningIntervals.current = [];
  //   props.editorRef.current = undefined;

  //   updateDiffNodeOnChange(props.projectIrisTreePathToFilesystemNode, props.datastoreType);
  // }

  return <div id="diff-editor-for-conflict-resolving" className="flex flex-col grow overflow-hidden">
    <DiffEditor
      {...props}
      onMount={editor => {
        props.editorRef.current = {editor};
        changedUnderlyingModelsInEditor.current = false;
        // editor.getOriginalEditor().onDidDispose(onDidEditorDispose)
        // editor.getModifiedEditor().onDidDispose(onDidEditorDispose)

        const model = props.editorRef.current?.editor.getModel() ?? null;
        if (model !== null) {
          alert("Model not null in mount");
          model.original.setValue(editorsContent.nonEditable);
          model.modified.setValue(editorsContent.editable);

          // Only the modified since in current version we allow only editing of the one editor.
          model.modified.onDidChangeContent(() => {
            console.info("model.modified.onDidChangeContent");
            setTimeout(() => {
              if (changedUnderlyingModelsInEditor.current) {
                changedUnderlyingModelsInEditor.current = false;
                return;
              }
              alert("Change cntn: " + props.projectIrisTreePathToFilesystemNode.split('/').at(-1));
              console.info("Cotnent: " + model.modified.getValue());
              editorContentChanged.current = true;
              if (currentProjectIrisTreePathToFilesystemNode.current === null || currentDatastoreType.current === null) {
                return;
              }

              updateDiffNodeOnChange(currentProjectIrisTreePathToFilesystemNode.current, currentDatastoreType.current);
            }, 400);
          });
        }
        alert("Mounting")
      }}
      theme={resolvedTheme === "dark" ? "dataspecer-dark" : "vs"}
      language={props.format}
      original={editorsContent.nonEditable}
      modified={editorsContent.editable}
      beforeMount={handleEditorWillMount}

      options={{
        minimap: {
          enabled: false
        },
        // This is if we want to editable editor to be different than the right one
        // originalEditable: props.editable === "mergeFrom",
        // readOnly: props.editable === "mergeFrom",
      }}
    />
  </div>;
}
