# Optional GitHub Actions setup

The production Vercel build already runs `npm test && npm run build`, so a failing test prevents a new deployable build.

`verify.yml` is a ready-to-use GitHub Actions template for tests, build and dependency checks. It is stored here because the current Git credential cannot create workflow files. To activate it later, a repository administrator can copy it into `.github/workflows/verify.yml` using GitHub's editor or a credential with workflow permission. No CI secrets are needed for these synthetic tests. The test runner strips live database/model credentials from its child processes.
