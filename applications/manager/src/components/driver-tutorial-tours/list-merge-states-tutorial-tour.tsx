// Tour for the Merge States List Dialog

// TODO RadStr: ... Possible performance issues, how looking at the perforamnce graph it is probably not issue for Dataspecer
//               ... since Dataspecer does not rerender often
// TODO RadStr: .... Put into issue or something - https://github.com/nilbuild/driver.js/issues/586
import { driver as createDriver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { TFunction } from "i18next";
import { Dispatch, SetStateAction } from "react";

/**
 * Starts a guided tour for the merge states list functionality.
 */
export function startMergeStatesListTour(
  _t: TFunction<"translation", undefined>,
  setTourStep: Dispatch<SetStateAction<number>>,
  onDestroyed?: () => void
): void {
  const getTourId = (element: string, row = 1) => `#${element}-${row}`;

  const tourSteps: DriveStep[] = [
    {
      popover: {
        title: "Welcome to the merge state list tour",
        description: "You can use left and right arrows to navigate through steps.",
      },
      onHighlighted: () => {},
    },
    {
      element: "#merge-states-list-id",
      popover: {
        title: "Currently active (unresolved) merge states",
        description: "Sorted by creation date - Newest first.",
        side: "top"
      },
    },
    {
      element: "#merge-state-selection-created-at-column-id",
      popover: {
        title: "Created At",
        description:
          "When the merge state was created.",
      },
    },
    {
      element: "#merge-state-selection-last-modified-at-column-id",
      popover: {
        title: "Last Modified At",
        description:
          "When the merge state was last changed.<br/><br/>Check before you start working to make sure nobody else changed data in the merge state.",
      },
    },
    {
      element: "#merge-state-selection-cause-column-id",
      popover: {
        title: "Merge state's cause",
        description:
          "Can be pull/push/merge.",
      },
    },
    {
      element: "#merge-state-selection-merge-from-column-id",
      popover: {
        title: "Merge From",
        description:
          "The source branch and filesystem for the merge state.<br/><br/>Data coming stored 'in Git' are unchanged through the existence of merge state.",
      },
    },
    {
      element: "#merge-state-selection-merge-to-column-id",
      popover: {
        title: "Merge To",
        description:
          "The target branch and filesystem for the merge state.<br/><br/>Data coming stored 'in Git' are unchanged through the existence of merge state.",
      },
    },
    {
      element: "#merge-state-row-text-1",
      popover: {
        title: "'White' merge state means 'safe'",
        description:
          "However, you should still check 'modified at' time, since it might have been modified from diff editor.",
      },
    },
    {
      element: "#merge-state-row-text-2",
      popover: {
        title: "'Red' state means modified",
        description:
          "Merge state is red if it was modified from either outside of diff editor or diff editor that was resolving different merge state.<br/><br/>After opening in diff editor, the merge state will be reloaded, turned 'white' and 'modified at' updated.",
      },
    },
    {
      element: getTourId("merge-state-open-diff-editor-button"),
      popover: {
        title: "Open Diff Editor to resolve the merge state",
      },
      onHighlighted: () => {},
    },
    {
      element: getTourId("merge-state-automatic-resolve-button"),
      popover: {
        title: "✨ - Removes old merge states and create a new one with the latest Git remote commits",
        description:
          "Useful if merge state is not up-to-date with remote.<br/><br/>The exact action depends on the merge state cause. See next.",
      },
      onHighlighted: () => {},
    },
    {
      element: "#merge-state-automatic-resolve-button-1",
      popover: {
        title: "✨ For pull",
        description:
          "Removes all pull merge states and creates a new pull merge state with latest.",
      },
    },
    {
      element: "#merge-state-automatic-resolve-button-2",
      popover: {
        title: "✨ For merge",
        description:
          "Removes all pull, and 'merge' merge states. Checks if both ends are up-to-date.<br/><br/>If not: Creates relevant pull merge states<br/>If yes: Creates a 'merge' merge state.",
      },
    },
    {
      element: "#merge-state-automatic-resolve-button-3",
      popover: {
        title: "✨For push",
        description:
          "Removes all pull and push merge states and creates a new push merge state with latest.",
      },
    },
    {
      element: getTourId("merge-state-validate-button"),
      popover: {
        title: "Validate",
        description:
          "Click to check whether this merge state is performed on top of the latest Git remote commits.",
      },
      onHighlighted: () => {},
    },
    {
      element: getTourId("merge-state-show-info-button"),
      popover: {
        title: "Show Info",
        description:
          "Click to view detailed information about this merge state.<br/><br/>Might be useful for troubleshooting, but is aimed more at Dataspecer developers.",
      },
      onHighlighted: () => {},
    },
    {
      element: getTourId("merge-state-remove-button"),
      popover: {
        title: "Remove Merge State",
        description:
          "Click to remove this merge state.<br/><br/>Do not be afraid to use this whenever you need to start fresh or not up-to-date with remote.",
      },
      onHighlighted: () => {},
    },
  ];

  const driver = createDriver({
    overlayClickBehavior: "close",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    animate: true,
    overlayOpacity: 0.5,
    disableActiveInteraction: true,
    onDestroyed: () => {
      onDestroyed?.();
    },
    steps: tourSteps,
    onPrevClick: (_step) => {
      setTourStep((prev) => prev - 1);
      driver.movePrevious();
    },
    onNextClick: (_step) => {
      setTourStep((prev) => prev + 1);
      driver.moveNext();
    },
  });

  driver.drive();
}
