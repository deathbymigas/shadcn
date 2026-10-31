# Current Component Contract Coverage

## Context

The current checkout contains five non-test components in `src/components/ui/`:
`badge`, `button`, `card`, `input`, and `label`. Each already has a hand-written
contract, and `node scripts/validate-contracts.mjs` reports no TypeScript drift.
The contract test suite validates schemas and manifest generation but does not
assert the design-led details of these component contracts.

## Design

Treat the five components present in this checkout as the complete scope. Add
data-driven coverage in `scripts/contract.test.mjs` to verify that each source
component has a schema-valid contract and a corresponding manifest artifact.
Add explicit expectations for each contract's meaningful enum values, slots,
and states. The checks should validate the authored contract semantics rather
than derive their expected values from the same contract data.

Do not add shadcn component implementations, alter component runtime behavior,
or modify unrelated working-tree changes. Existing contract JSON should only
change if the added assertions demonstrate a contract defect. Regenerate
`contracts/manifest.json` after any contract changes.

The expected design-led coverage is:

| Component | Enum axes                                                                                                                      | Slots                                                                                      | States                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------- |
| `button`  | `variant`: default, destructive, outline, secondary, ghost, link; `size`: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg | default                                                                                    | hover, focus, active, disabled  |
| `input`   | `type`: text, password, email, number, tel, url, search                                                                        | none                                                                                       | hover, focus, disabled, invalid |
| `badge`   | `variant`: default, secondary, destructive, outline, ghost, link                                                               | default                                                                                    | hover, focus, disabled          |
| `label`   | none                                                                                                                           | default                                                                                    | disabled                        |
| `card`    | `size`: default, sm                                                                                                            | default, card-header, card-title, card-description, card-content, card-footer, card-action | hover, focus                    |

## Validation

Run the focused contract tests, the full `pnpm test` suite,
`node scripts/validate-contracts.mjs`, and `pnpm lint`. Confirm the generated
manifest contains one artifact for every contract.
