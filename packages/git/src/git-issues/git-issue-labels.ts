type GitIssueLabel = {
  name: string;
  description: string;
  color: string;
};

export const dataspecerGitIssueLabels: Readonly<Record<string, GitIssueLabel>> = {
  "cs": {
    name: "cs",
    description: "Issue related to the Czech version of specification/documentation",
    color: "73da1a",
  },
  "en": {
    name: "en",
    description: "Issue related to the English version of specification/documentation",
    color: "c1ae1b",
  },
  "cme": {
    name: "cme",
    description: "Issue related to the visual models generated in Conceptual Model Editor (CME)",
    color: "814e70",
  },
  "structural-editor": {
    name: "structural editor",
    description: "Issue related to the models modified using the Strucural editor",
    color: "cfe5b2",
  },
  "asap": {
    name: "asap",
    description: "Fix as soon as possible",
    color: "655466",
  },
};
