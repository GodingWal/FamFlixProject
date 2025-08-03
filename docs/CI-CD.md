# CI/CD Pipeline Documentation

## Overview

This project uses GitHub Actions for continuous integration and deployment. The pipeline automatically runs on every push and pull request, ensuring code quality and preventing broken builds from reaching production.

## Workflow Jobs

### 1. Dependency Updates (`update-dependencies`)
- **Trigger**: Weekly (Sundays at 2 AM UTC) or manually via workflow dispatch
- **Purpose**: Automatically checks for outdated dependencies and creates PRs for updates
- **Actions**:
  - Checks for outdated packages using `npm outdated`
  - Updates dependencies to latest compatible versions
  - Creates a pull request with the changes
  - Includes testing instructions in the PR description

### 2. Lint and Type Check (`lint-and-typecheck`)
- **Trigger**: Every push and PR
- **Purpose**: Ensures code quality and type safety
- **Actions**:
  - Runs TypeScript type checking (`npm run check`)
  - Runs ESLint if configured
  - Fails the build if any issues are found

### 3. Build Test (`build`)
- **Trigger**: Every push and PR (after lint-and-typecheck passes)
- **Purpose**: Ensures the application builds successfully
- **Actions**:
  - Installs dependencies
  - Runs the build process (`npm run build`)
  - Uploads build artifacts for later use

### 4. Security Audit (`security-audit`)
- **Trigger**: Every push and PR
- **Purpose**: Identifies security vulnerabilities
- **Actions**:
  - Runs `npm audit` with moderate severity threshold
  - Runs Snyk security scan (if configured)
  - Reports vulnerabilities without failing the build

### 5. Database Migration Check (`db-migration-check`)
- **Trigger**: Every push and PR
- **Purpose**: Ensures database migrations are valid
- **Actions**:
  - Checks Drizzle migrations using `drizzle-kit generate --dry-run`
  - Reports any migration issues

### 6. Integration Tests (`integration-tests`)
- **Trigger**: Every push and PR (after build passes)
- **Purpose**: Runs tests against real services
- **Services**:
  - PostgreSQL 15
  - Redis 7
- **Actions**:
  - Sets up test environment
  - Runs integration tests if configured
  - Reports test results

### 7. Performance Test (`performance-test`)
- **Trigger**: Every push and PR (after build passes)
- **Purpose**: Basic performance and functionality checks
- **Actions**:
  - Starts the application
  - Tests health endpoint
  - Analyzes build size
  - Reports performance metrics

### 8. Deployment Preview (`deployment-preview`)
- **Trigger**: Pull requests only
- **Purpose**: Provides deployment feedback on PRs
- **Actions**:
  - Comments on PRs with deployment status
  - Provides next steps for reviewers

### 9. Summary Report (`summary`)
- **Trigger**: Every push and PR (always runs)
- **Purpose**: Provides comprehensive pipeline summary
- **Actions**:
  - Generates summary of all job results
  - Comments on PRs with detailed status
  - Provides next steps based on results

## Local Development

### Running Updates Locally

You can run the dependency update process locally using the provided script:

```bash
# Run the full update process
npm run update-deps

# Or run the script directly
./scripts/update-deps.sh
```

The script will:
1. Backup your current package files
2. Check for outdated dependencies
3. Update packages to latest compatible versions
4. Run type checking and build tests
5. Test the development server
6. Provide a summary and next steps

### Manual Testing

Before pushing changes, run these commands locally:

```bash
# Install dependencies
npm install

# Run type checking
npm run check

# Build the project
npm run build

# Start development server
npm run dev

# Run tests (if configured)
npm test
```

## Configuration

### Environment Variables

The following secrets can be configured in your GitHub repository:

- `SNYK_TOKEN`: Snyk API token for security scanning
- `GITHUB_TOKEN`: Automatically provided by GitHub

### Customization

You can customize the workflow by modifying `.github/workflows/ci.yml`:

- **Schedules**: Modify the cron expression for dependency updates
- **Branches**: Change which branches trigger the pipeline
- **Node version**: Update the Node.js version used
- **Services**: Add or modify database services for testing

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors: `npm run check`
   - Verify all dependencies are installed: `npm install`
   - Check for missing environment variables

2. **Test Failures**
   - Ensure test database is accessible
   - Check test environment configuration
   - Verify test scripts are properly configured

3. **Security Audit Failures**
   - Review vulnerability reports
   - Update vulnerable dependencies
   - Consider using `npm audit fix` for automatic fixes

### Getting Help

- Check the GitHub Actions tab for detailed logs
- Review the summary report in PR comments
- Use the local update script to test changes before pushing

## Best Practices

1. **Always run local tests before pushing**
2. **Review dependency updates carefully**
3. **Address security vulnerabilities promptly**
4. **Keep the pipeline configuration up to date**
5. **Monitor build times and optimize as needed**

## Future Enhancements

Potential improvements to consider:

- Add code coverage reporting
- Implement automated deployment to staging/production
- Add performance benchmarking
- Integrate with external monitoring services
- Add automated changelog generation 