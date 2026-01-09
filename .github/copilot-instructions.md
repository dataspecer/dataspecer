# Copilot Instructions for Dataspecer

This document provides guidance for GitHub Copilot when working on the Dataspecer project.

## Project Overview

Dataspecer is a set of tools for effortless management and creation of data specifications. It is a **monorepo** managed by npm workspaces and Turborepo, consisting of:

- **packages/** - Core and helper packages and individual generators
- **applications/** - Web clients (React-based)
- **services/** - Backend service (used by both web and CLI clients)

## Technology Stack

- **Language**: TypeScript (all source code)
- **Package Manager**: npm 10.8.2+
- **Node Version**: v22+
- **Monorepo Tools**: npm workspaces and Turborepo
- **Frontend Framework**: React
- **Build Tools**: TypeScript compiler, Vite, Webpack

## Code Style and Conventions

### ESLint Rules
- **Quotes**: Use double quotes (`"`)
- **Semicolons**: Always use semicolons
- **Line endings**: Unix style (LF)

### General Guidelines
- Follow TypeScript best practices with proper type annotations
- Maintain existing code patterns and architectural decisions
- Keep components modular and reusable
- Write clear, self-documenting code

## Development Workflow

### Initial Setup
```bash
# Install dependencies (from root)
npm install

# Create environment files
cp applications/conceptual-model-editor/.env.example applications/conceptual-model-editor/.env

# Build all packages and applications
npm run build
```

### Building
- **Build all**: `npm run build` (runs `turbo build`)
- **Build specific package**: `npx turbo run build --filter=<package-name>`
- Each package has dependencies that must be built first (Turbo handles this automatically)

### Testing
- **Run all tests**: `npm run test` (runs `turbo test`)
- Tests are defined per package

### Development
- Most packages have an `npm run dev` script for live development
- Applications run live servers that update automatically
- Check individual package README.md files for specific instructions

## Monorepo Structure

### Package Dependencies
- Packages depend on each other via npm workspaces
- Local packages are linked automatically (not from npm registry)
- Always check `package.json` for dependencies before modifying

### Turborepo Configuration
- Defined in `turbo.json` at repository root
- Build tasks depend on upstream package builds (`^build`)
- Understand task dependencies before making changes

## Working with Applications

### React Applications
- Use functional components with hooks
- Follow existing component structure and patterns
- Components should re-render automatically when data changes
- Check individual application README files for specific requirements

### Environment Configuration
- Applications may require `.env` files (copy from `.env.example`)
- Never commit `.env` files (they are gitignored)
- Keep `.env.example` up-to-date when adding new variables

## Working with Packages

### Core Packages
- `@dataspecer/core` - Core functionalities (may be split into smaller packages in future)
- Check individual package directories for detailed documentation
- Each package has its own README.md with specific instructions

### Package Structure
- Each package is managed independently with its own `package.json`
- Built with TypeScript compiler or bundlers (Vite/Webpack)
- Dependencies between local packages are managed by npm workspaces

## Documentation

- Main documentation is in `documentation/` directory
- Check `documentation/what-to-learn.md` for onboarding information
- Each package/application has its own README.md
- Diagrams use C4 model format (in `documentation/diagrams/`)

## Git and CI/CD

### CI Workflow
- GitHub Actions run on push and pull requests
- Tests run on Node.js 22.17
- Build and test must pass before merging

### Deployment
- Cloudflare Pages deploys all applications automatically
- Main branch commits are deployed to production
- Other branches get preview deployments
- See `cloudflare.build.sh` for deployment details

## Docker

- Docker container available: `ghcr.io/dataspecer/ws`
- Container exposes port 80
- Mount `/usr/src/app/database` for persistent storage
- Tags: `latest` (stable branch), `branch-main` (latest updates)

## Best Practices

1. **Always read package README.md** before making changes
2. **Maintain consistency** with existing code patterns
3. **Test locally** before committing (build and test)
4. **Update documentation** when changing functionality
5. **Keep dependencies minimal** - only add when necessary
6. **Respect monorepo structure** - understand package dependencies
7. **Follow TypeScript conventions** - use proper types, avoid `any`
8. **Check ESLint** - follow the configured rules

## Common Commands Reference

```bash
# Install all dependencies
npm install

# Build everything
npm run build

# Run all tests
npm run test

# Build specific package
npx turbo run build --filter=<package-name>

# Develop specific application/package
cd packages/<package-name> && npm run dev
```

## When Making Changes

1. Understand the package structure and dependencies
2. Check if changes affect other packages (workspace dependencies)
3. Run builds locally to verify no breakage
4. Run tests to ensure functionality
5. Update relevant documentation
6. Follow existing patterns and conventions
7. Keep changes focused and minimal
