# Weekly Update Log

This log tracks significant changes, improvements, and new features implemented in the NAPI project on a weekly basis. It serves as a quick reference for team members and users to stay informed about the project's progress and recent developments.

## Week of April 21-27, 2024

### Feature Improvements

- Improved Python symbol extraction with better handling of partial imports
- Enhanced visual representation of nodes for large codebases
- Updated highlighting mechanism for better code navigation
- Implemented extraction mode with API integration and symbol editing capabilities
- Fixed Python error AST node cleanup for more reliable extraction
- Added C# metrics feature for enhanced code analysis capabilities

### Build System and Package Management Improvements

- Switched from using published `@nanoapi.io/shared` package to bundling it directly with the CLI
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
