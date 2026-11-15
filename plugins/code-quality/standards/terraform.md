# Terraform (HCL) — Good Practices

Apply on top of the generic coding standards.

- Keep state remote and locked (e.g. S3 + DynamoDB); never commit state files or secrets.
- Factor reuse into modules; give variables types, descriptions, and `validation`; document outputs.
- Pin provider and module versions; run `terraform fmt` + `validate`; always `plan` before `apply`.
- Separate state per environment (workspaces or directories); use data sources instead of hardcoding.
- Least-privilege IAM; tag resources consistently; avoid `local-exec` where a native resource exists.
- Keep configurations idempotent; avoid manual drift.
- Lint with tflint; scan with tfsec/checkov as gates.
