# ADR 0005: Client-side JavaScript

- Status: Proposed
- Date: 2026-11-20
- Deciders: Owner

## Context

Most pages need no JavaScript: menus use `<details>`, portfolio filters use radio inputs and `:has()`, and every animation is CSS or SVG. Four behaviours need some:

- **The quiz:** ten steps, a score, a result screen with tailored advice, keyboard shortcuts. Nothing is stored or sent.
- **The career timeline:** scroll progress drives the drawing of the rings; hover, tap and keyboard select a ring.
- **The theme toggle** ([ADR 0003](0003-styling-theme-and-fonts.md)), with its blocking script to avoid a flash.
- **Scroll reveal,** as a fallback where CSS scroll-driven animations are not supported.

The budgets: no JavaScript on any page except the quiz (at most 15 KB compressed) and the career page (at most 3 KB). Every page must be complete without JavaScript.

## Options considered

### The quiz

1. **A Preact island** (`client:visible`), with the scoring in a pure TypeScript function. Pros: declarative rendering of a multi-step form; about 4 KB for the runtime; components testable. Cons: a framework dependency for one page.
2. **Plain TypeScript** driving server-rendered markup (`<fieldset>` steps and a `<template>` for the result). Pros: no runtime, smallest size. Cons: manual DOM updates for the result screen, more code to keep accessible.

### The other behaviours

1. **Small inline or bundled vanilla scripts,** each a few dozen lines, with no dependency; CSS scroll-driven animations first where supported (`@supports (animation-timeline: view())`).
2. **An animation or scroll library.** Pros: less code. Cons: breaks the budgets and the "pure CSS" motion rule.

## Decision

Proposed: **a Preact island for the quiz (quiz 1)**, since the budget allows it and it keeps the result screen simple; **vanilla scripts for the rest (other 1)**.

- Scoring and the "top three priorities" live in `src/lib/quiz.ts`, a pure function covered by unit tests.
- Every animation stops under `prefers-reduced-motion: reduce`, showing the final state.
- Without JavaScript: the quiz page shows the questions as a printable checklist; the career page shows the vertical timeline.

## Consequences

Positive:

- JavaScript appears on two pages only, and the budgets are checked in CI.

Negative:

- Preact is one more dependency to keep up to date.

Follow-up:

- [ADR 0006](0006-testing-and-ci.md) checks the JavaScript budgets and the "zero network request, zero storage write" rule of the quiz.
