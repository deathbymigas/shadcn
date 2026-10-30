# Code review checklist

Use this checklist when reviewing a change against its issue, design, or acceptance criteria.

- Confirm each stated requirement is implemented.
- Check relevant edge cases, including empty, loading, error, and keyboard behavior when applicable.
- Confirm UI changes use `src/components/ui` components and design tokens.
- Confirm generated files such as `src/styles/tokens.css` and `src/gen/` were not edited directly.
- Run the checks required by the change and inspect their results.

Report only actionable gaps in correctness, accessibility, or stated requirements. Include file and line references. End with PASS or FAIL for each acceptance criterion.
