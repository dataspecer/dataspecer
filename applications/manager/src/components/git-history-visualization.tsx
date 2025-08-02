// TODO RadStr: Taken from https://github.com/nicoespeon/gitgraph.js/tree/master/packages/gitgraph-react

// Use this as a reference https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-5-templates--without-commit-author

import { BetterModalProps, OpenBetterModal } from "@/lib/better-modal";
import { Gitgraph, templateExtend, TemplateName } from "@gitgraph/react";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "./modal";
import { Button } from "./ui/button";
import { useLayoutEffect } from "react";

export const  GitHistoryVisualization = ({ isOpen, resolve }: BetterModalProps<null>) => {
  useLayoutEffect(() => {
      if (isOpen) {
        window.requestAnimationFrame(() => document.getElementById("repository-url-dialog-div")?.focus());
      }
    }, []);

  const withoutAuthor = templateExtend(TemplateName.Metro, {
    commit: {
      message: {
        displayAuthor: true,
        displayHash: true,
      },
    },
  });

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="sm:max-w-[700px] max-w-[80%]">
        <ModalHeader>
          <ModalTitle>Project history in Git</ModalTitle>
          <ModalDescription>
            TODO RadStr: Modal description
          </ModalDescription>
        </ModalHeader>
        <ModalBody className="overflow-y-auto max-h-[60vh]">    {/* TODO RadStr: Needed for the scrolling, the padding (p) so there isn't any part missing */}
          <Gitgraph options={{template: withoutAuthor}}>
            {(gitgraph) => {
              // Simulate git commands with Gitgraph API.
              gitgraph.clear();   // We have to call clear because of rerendering (we would have everything doubled)

              const master = gitgraph.branch("master");
              master.commit("Initial commit");

              master.commit({
                subject: "Moje commit zprava",
                author: "RadStr <RadStr@google.cz>",
                hash: "my-hash",
                onClick: (commit) => {                        // TODO RadStr: Based on https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-3-events--on-commit-dot-click
                  alert(`You clicked the dot for: ${commit.subject}`);
                },
                onMessageClick: (commit) => {                 // TODO RadStr: Based on https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-3-events--on-commit-message-click
                  alert(`You clicked the commit text for: ${commit.subject}`);
                },
              });

              const branches: {develops: any[], aFeatures: any[]} = { develops: [], aFeatures: [] };
              for(let i = 0; i < 3; i++) {
                const develop = master.branch(`develop${i}`);
                develop.commit("Add TypeScript");

                const aFeature = develop.branch(`a-feature${i}`);
                aFeature
                  .commit("Make it work")
                  .commit("Make it right")
                  .commit("Make it fast");

                develop.merge(aFeature);
                develop.commit("Prepare v1");


                master.merge(develop).tag(`v${i}.0.0`);
                master.commit("Commit to not create new branch from merge commit");

                branches.develops.push(develop);
                branches.aFeatures.push(aFeature);

                // develop.delete();
                // aFeature.delete();
              }

              // The placement of delete does not matter, however for some reason it connects the unrelated lines and shows everything in one line - so the delete is useless
              for (const bd of branches.develops) {
                bd.delete();
              }
              for (const ba of branches.aFeatures) {
                ba.delete();
              }
            }}
          </Gitgraph>
        </ModalBody>
        <ModalFooter className="flex flex-row">
          <Button variant="outline" onClick={() => resolve(null)}>Cancel</Button>
          <Button type="submit" onClick={() => resolve(null)}>Confirm</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}



export const gitHistoryVisualizationOnClickHandler = async (openModal: OpenBetterModal) => {
  // TODO RadStr: Empty data for modal for now
  await openModal(GitHistoryVisualization, {});
}
