# Branch Protection

Protect `main` before launch:

- Require pull requests before merging.
- Require approvals from at least one reviewer.
- Require status checks: `CI — Typecheck, Lint & Test`, `Supabase Migration Lint`, and E2E checks when touched paths trigger them.
- Require branches to be up to date before merging.
- Block force pushes and branch deletion.
- Gate production EAS builds with the `production` GitHub Environment and required reviewers.
