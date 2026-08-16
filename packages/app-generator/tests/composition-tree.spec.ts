import { describe, expect, it } from 'vitest';

import {
  countIssues,
  issuesByPane,
} from '../assets/generated-app/static/src/shared/forms/composition-tree.ts';
import { rootEntityTarget } from '../assets/generated-app/static/src/shared/forms/entity-target.ts';
import {
  ValidationIssueCode,
  type ValidationIssue,
} from '../assets/generated-app/static/src/shared/operations/operation-result.ts';
import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  FieldDescriptor,
} from '../assets/generated-app/static/src/shared/types/aggregate.ts';

function primitive(path: string): FieldDescriptor {
  return {
    path,
    propertyName: path,
    label: path,
    kind: 'primitive',
    formControl: 'text',
    many: false,
    required: true,
    minCount: 1,
    maxCount: 1,
  };
}

function composition(path: string, target: AggregateDescriptor, many: boolean): FieldDescriptor {
  return {
    path,
    propertyName: path,
    label: path,
    kind: 'association',
    associationKind: 'composition',
    targetAggregateIri: target.iri,
    targetClassIri: target.classIri,
    many,
    required: false,
    minCount: 0,
    maxCount: many ? null : 1,
  };
}

// A leaf, a child made of leaves, and a child that composes that child. Only the last opens as its
// own pane, because a child that composes nothing is edited in place on its parent's pane.
const leafAggregate: AggregateDescriptor = {
  iri: 'https://example.org/aggregate/leaf',
  name: 'Leaf',
  classIri: 'https://example.org/class/leaf',
  fields: [primitive('label')],
  createEmpty: () => ({}),
};

const middleAggregate: AggregateDescriptor = {
  iri: 'https://example.org/aggregate/middle',
  name: 'Middle',
  classIri: 'https://example.org/class/middle',
  fields: [primitive('title'), composition('leaves', leafAggregate, true)],
  createEmpty: () => ({}),
};

const rootAggregate: AggregateDescriptor = {
  iri: 'https://example.org/aggregate/root',
  name: 'Root',
  classIri: 'https://example.org/class/root',
  fields: [primitive('name'), composition('middle', middleAggregate, false)],
  createEmpty: () => ({}),
};

const registry: AggregateDescriptorMap = {
  [leafAggregate.iri]: leafAggregate,
  [middleAggregate.iri]: middleAggregate,
  [rootAggregate.iri]: rootAggregate,
};

function issue(path: string): ValidationIssue {
  return { code: ValidationIssueCode.Required, message: `${path} is required.`, path };
}

describe('countIssues', () => {
  it('counts a repeating child, whose path is indexed rather than dotted', () => {
    const issues = [issue('middle.leaves[0].label'), issue('middle.leaves[1].label')];

    expect(countIssues(issues, 'middle.leaves')).toBe(2);
    expect(countIssues(issues, 'middle')).toBe(2);
    expect(countIssues(issues, '')).toBe(2);
  });
});

describe('issuesByPane', () => {
  const rootTarget = rootEntityTarget(rootAggregate);

  it('counts every problem once, against the pane that shows it', () => {
    const issues = [
      issue('name'),
      issue('middle.title'),
      issue('middle.leaves[0].label'),
      issue('middle.leaves[1].label'),
    ];

    const counts = issuesByPane(rootTarget, registry, issues);

    // the leaves are edited in place on the middle pane, so their problems belong to it
    expect([...counts.entries()]).toEqual([
      ['', 1],
      ['middle', 3],
    ]);
    expect([...counts.values()].reduce((total, count) => total + count, 0)).toBe(issues.length);
  });

  it('ignores problems that name no field', () => {
    const issues = [{ code: ValidationIssueCode.Error, message: 'Saving failed.' }];

    expect(issuesByPane(rootTarget, registry, issues).size).toBe(0);
  });
});
