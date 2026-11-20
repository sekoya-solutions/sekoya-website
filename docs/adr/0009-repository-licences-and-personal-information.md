# ADR 0009: Repository, licences and personal information

- Status: Accepted
- Date: 2026-11-20
- Deciders: Owner

## Context

The site's source code is itself part of the portfolio, so the repository is meant to be public. The forces:

- **Code versus brand.** The code can be reused by anyone; the logo, the animated logo and the brand imagery cannot. The Outfit font files keep their own SIL Open Font License (OFL).
- **Personal information in a public repository.** The site necessarily shows facts about the owner (name, company, region, career, public profiles). In a public repository, every content file and every commit keeps them forever, including in the git history. Only facts the owner has approved, one by one, may be committed.
- **Design references.** The visual mockups and their screenshots guide the build. They contain brand imagery and draft copy.
- **No availability statements in the repository.** The repository presents the site as a portfolio project and explains how it is built. Calls to contact the company belong on the website only.

## Options considered

### Visibility

1. **Public from the first commit.** Pros: the history itself shows how the site was built. Cons: every mistake (a personal detail, a secret) is public at once; nothing can be fully removed from a public history.
2. **Private until launch, then public.** Pros: room to fix mistakes before they are public. Cons: the history becomes public anyway at launch, so it brings no protection unless the history is rewritten, and private repositories on the free plan have no branch protection and limited Actions minutes.

### Licences

1. **MIT for the code (`LICENSE`), all rights reserved for brand assets (`LICENSE-ASSETS.md`),** listing the folders concerned, with the OFL kept next to the font files.
2. **A single licence for everything.** Ruled out: it would license the brand.

### Design references

1. **Commit the mockup images under `docs/design/`,** without their generator scripts, after checking that they show only approved personal details. Pros: every session sees the target. Cons: draft copy and brand images in the public history.
2. **Keep them outside the repository,** and describe each page in a specification under `docs/`. Pros: nothing unapproved is public. Cons: agents need the files given to them each session.

## Decision

Chosen: **public from the first commit (visibility 1), MIT plus reserved brand assets (licences 1), mockups committed after the owner's review (design references 1)**.

- Personal details appear only in content files and only once the owner has approved each one; age, home address and any detail not shown on the site are never committed.
- Values not yet provided stay `[TODO: …]` placeholders ([ADR 0007](0007-measured-figures-and-placeholders.md)).
- The README, `package.json`, comments, commit messages and documentation never state availability for work.

## Consequences

Positive:

- The repository is a reviewable proof of how the site is built, with a clear licence boundary.

Negative:

- Every content pull request needs the owner's check of personal details before it is pushed.

Follow-up:

- The project's `AGENTS.md` repeats the rules on personal details and availability statements for agents.
