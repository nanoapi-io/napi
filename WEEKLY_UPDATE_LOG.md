# Weekly Update Log

This log tracks significant changes, improvements, and new features implemented
in the NAPI project on a weekly basis. It serves as a quick reference for team
members and users to stay informed about the project's progress and recent
developments.

## April 27th to May 16th, 2024

### Deno Migration & Performance Optimization

- Migrate from Node to Deno for improved performance and ease of development
- Replaced Node.js dependencies with native Deno modules, reducing bundle size
  and performance
- Migrated from Express to Oak framework (JSR:@oak/oak) for improved Deno
  compatibility
- Eliminated external dependencies (uuid, express, http-proxy-middleware,
  octokit) for built-in Deno modules
- Switched to JSR registry for standard libraries (@std/path@^1.0.9) to leverage
  Deno's ecosystem

### Build System & Deployment

- Change release from npm registry to Deno executables published on GitHub
- Created convenience installation scripts
- Streamlined GitHub Actions release workflow to reduce complexity and build
  times
- Enhanced installation instructions in README to facilitate installation

### API & Development Experience

- Refactored version checking to use native fetch API with timeout control (5s)
  to prevent blocking the use of the tool when being rate limited by GitHub API
- Updated version checking to check against our GitHub release instead of npm
  registry
- Implemented platform-specific browser launching with Deno.Command for better
  cross-OS compatibility
- Enhanced port detection using Deno's native networking APIs

### Frontend

- Improved API integration between frontend and backend components
- Optimized frontend routing to work seamlessly with Oak middleware
- Move from bare Radix UI component to more comprehensive Shadcn/UI component
- Simplify some UX flow
- Improve highlighting logic from the file explorer to the graph

## April 21st to 27th, 2024

### Feature Improvements

- Improved Python symbol extraction with better handling of partial imports
- Enhanced visual representation of nodes for large codebases
- Updated highlighting mechanism for better code navigation
- Implemented extraction mode with API integration and symbol editing
  capabilities
- Fixed Python error AST node cleanup for more reliable extraction
- Added C# metrics feature for enhanced code analysis capabilities

### Build System and Package Management Improvements

- Switched from using published `@nanoapi.io/shared` package to bundling it
  directly with the CLI
- Added `tsup` for improved bundling configuration
- Updated package versions and dependencies across the workspace
- Made the root package private and updated workspace configurations

### CLI Enhancements

- Enhanced version checking with detailed update instructions
- Fixed path resolution for static file serving
- Improved build process with better bundling configuration
- Added proper shebang handling for the CLI executable

### Build System Updates

- Removed separate build step for shared package
- Updated build scripts to use tsup for better bundling
- Fixed path resolution in development and production environments
- Improved static file serving configuration

### Version Management

- Updated CLI version to 1.0.3
- Set shared package version to 0.0.0 since it's now bundled
- Added proper version checking middleware with detailed update instructions
