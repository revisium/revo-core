# Repository agent instructions

Use the workspace canonical agent playbook. Read [README.md](README.md),
[REVIEW.md](REVIEW.md), and [VERIFICATION.md](VERIFICATION.md) before editing.

## Pull requests

Write pull request descriptions in English. A description represents the final
change; it is not a restatement of the diff or a work log.

`Description` is required. Add `Manual validation` only for a user or business
scenario checked outside automated tests and CI. Add `Notes for the reviewer`
only for a specific review focus, non-obvious risk, or deliberate tradeoff. Do
not list automated verification commands in the pull request description.
Do not hard-wrap prose in the pull request body; let GitHub wrap it for display.

Create a new pull request from the repository template:

```sh
gh pr create --template pull_request_template.md
```

If the runner cannot open the interactive editor, fill the same template in a
temporary file and pass it through `--body-file`. Do not replace the template
with `--fill` or an ad hoc `--body`.

After updating the branch of an open pull request and before handing it back for
review, compare the description with the final diff against the base branch.
Update it when the outcome, scope, public contract, compatibility impact,
related documents, or review focus changed. Remove stale claims and questions.
Do not append a change log: the description always represents the current pull
request. Leave an accurate description unchanged, and preserve relevant text
added by a human.
