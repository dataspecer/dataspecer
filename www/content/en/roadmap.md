---
title: "Roadmap"
description: "Dataspecer development roadmap."
---

We are constantly improving Dataspecer.
Here are some of the major planned milestones.

<div class="timeline-roadmap">
  <div class="timeline-item">
    <div class="timeline-date">Q4 2026</div>
    <div class="timeline-content">
      <strong>Change Operations &amp; Propagation</strong><br/>
      In 2026 we plan to add support for representation of specification change operations and assistance with their propagation through the application profile hierarchy.
    </div>
  </div>
  <div class="timeline-item">
    <div class="timeline-date">Q2 2027</div>
    <div class="timeline-content">
      <strong>Integration with Git</strong><br/>
      In Q1 2026 we plan to support integration with the Git versioning system.
    </div>
  </div>
</div>

<style>
.timeline-roadmap {
  position: relative;
  margin: 2rem 0;
  padding-left: 2rem;
  border-left: 3px solid #6c63ff;
}
.timeline-item {
  position: relative;
  margin-bottom: 2.5rem;
}
.timeline-date {
  display: inline-block;
  margin-left: 0.5rem;
  font-weight: bold;
  color: #6c63ff;
  margin-bottom: 0.2rem;
}
.timeline-content {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  margin-left: 1rem;
  color: #222;
}
.timeline-item:before {
  content: '';
  position: absolute;
  left: -1.5rem;
  top: 0.2rem;
  width: 1.2rem;
  height: 1.2rem;
  background: #fff;
  border: 3px solid #6c63ff;
  border-radius: 50%;
  z-index: 1;
}

[data-dark-mode] .timeline-roadmap {
  border-left: 3px solid #a99cff;
}
[data-dark-mode] .timeline-date {
  color: #a99cff;
}
[data-dark-mode] .timeline-content {
  background: #23243a;
  color: #f3f3fa;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
}
[data-dark-mode] .timeline-item:before {
  background: #23243a;
  border: 3px solid #a99cff;
}
</style>
