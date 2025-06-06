# GitHub Actions Workflows

This directory contains the CI/CD workflow files for the Corp Astro API.

## Important Note About Linting Warnings

You may notice IDE linting warnings in the workflow files about "Context access might be invalid" for various secrets. These are **IDE-specific warnings** and do not affect the actual functionality of the workflows when run on GitHub.

These warnings occur because the IDE's linter has limitations in how it validates GitHub Actions expressions and context access patterns. GitHub Actions itself handles these expressions correctly during workflow execution.

## Required Secrets

The following secrets need to be configured in the GitHub repository settings:

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service key
- `JWT_SECRET`: Secret for JWT token signing
- `APPLE_WEBHOOK_SECRET`: Secret for Apple IAP webhook verification
- `GOOGLE_WEBHOOK_SECRET`: Secret for Google IAP webhook verification
- `DIGITALOCEAN_ACCESS_TOKEN`: DigitalOcean API token
- `DIGITALOCEAN_APP_ID`: Production app ID in DigitalOcean
- `DIGITALOCEAN_STAGING_APP_ID`: Staging app ID in DigitalOcean
- `SLACK_WEBHOOK_URL`: Webhook URL for Slack notifications

## Workflow Structure

The main workflow file (`ci-cd.yml`) includes:

1. **Test Job**: Runs linting and tests with the necessary environment variables
2. **Build and Deploy Job**: Builds a Docker image and deploys to DigitalOcean (production or staging)

## Troubleshooting

If you encounter issues with the workflows:

1. Ensure all required secrets are properly configured in GitHub
2. Check the GitHub Actions logs for specific error messages
3. Verify that the DigitalOcean tokens and app IDs are correct
