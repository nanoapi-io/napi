![NanoAPI Banner](/media/github-banner.png)

# napi - Better Software Architecture for the AI Age

`napi` is a versatile tool built by NanoAPI and designed to automatically extract functionality from large, monolithic codebases into smaller units, while providing insights into the architectural complexity of your software.
With both a powerful CLI and an intuitive UI, `napi` is compatible with all major CI/CD platforms, allowing seamless integration into your development and deployment pipelines.

Historically, tools like this have only been built by large consulting firms or contractors and kept behind the paywalls of consulting fees. `napi` aims to make these tools accessible to developers of all skill levels, without the cost. Our vision is to help you gain deeper insights into system architecture-level concerns before they become hundred-million-dollar problems. The added benefit? No more black-box tools running on your code.

![NanoAPI UI Overview](/media/hero-app.png)

## Features

- **🚨 Audit**: Pinpoint areas of your code that need refactoring or cleanup.
- **📝 Refactor**: Extract functionality using the UI to improve architecture.
- **🏗️ Build**: Generate modular microservices ready for deployment.
- **⚙️ Integrate**: Use CLI commands compatible with all CI/CD workflows for automation.
- **🔍 Architecture**: Get a live view of all your software and their interactions; scoped to a specific moment in time.
- **📖 History**: Track changes to architecture through time using a git-history-style tool.
- **📈 Graphs**: Understand if your software is improving or degrading over time.

## Why `napi`?

- Identifies problematic code and potential improvements early.
- Simplifies the process of extracting functionality using non-AI strangler refactoring.
- Improves understanding, maintainability, and robustness at both the architecture and code level.
- Reduces dependency on outside sources for complex refactoring tasks.
- Gain a deeper trust of what your system is doing today - even in the face of AI-generated code.

## Supported Languages

`napi` aims to support all major programming languages. Here is the current status:

| Language/Framework | Status         | Related Issues                                      |
| ------------------ | -------------- | --------------------------------------------------- |
| Python             | ✅ Supported   | [#28](https://github.com/nanoapi-io/napi/issues/28) |
| C#                 | 🚧 In Progress | [#31](https://github.com/nanoapi-io/napi/issues/31) |
| PHP                | 🚧 In Progress | [#30](https://github.com/nanoapi-io/napi/issues/30) |
| Java               | 🚧 In Progress | [#32](https://github.com/nanoapi-io/napi/issues/32) |
| C                  | 🚧 In Progress | Not Tracked Yet                                     |
| C++                | 🚧 In Progress | Not Tracked Yet                                     |
| JavaScript         | 🚧 In Progress | Not Tracked Yet                                     |
| TypeScript         | 🚧 In Progress | Not Tracked Yet                                     |

For the latest updates, visit our [project board](/projects).

## Installation

Ensure you have Node.js (>=22) and npm installed.

https://nodejs.org/en

```bash
npm install -g @nanoapi.io/napi
```

## CLI Usage

`napi` provides a streamlined Command-Line Interface (CLI) to interact with and refactor your software projects quickly and efficiently.

For a full list of commands, run:

```bash
napi --help
```

## Overview of all commands

### `napi init`

Initialize the project. This step is required before running any other command.

This will create a .napirc configuration file in the project root, storing paths and settings necessary for further commands.

### `napi audit view`

Scan and audit your codebase for potential improvements, vulnerabilities, and maintainability issues. This command opens the NanoAPI UI in your default browser, providing a clear overview of what areas of your code would benefit most from refactoring or cleanup.

> **Important**: Run napi audit view periodically, especially before major refactoring efforts, to ensure your code is in good shape. It will soon also be possible to integrate that command into CI/CD workflows to catch architectural-level-quality issues early.

## CI/CD Integration

`napi` works seamlessly with CI/CD platforms like GitHub Actions, GitLab CI/CD, and Jenkins. This allows us to build the code manifest needed for visualization and refactoring in the background, without needing to wait for it to run locally in the case of very large codebases (>1M lines of code).

More information 

## Contributing

We welcome contributions from the community. Please read our [contributing guide](https://github.com/nanoapi-io/napi/blob/main/.github/CONTRIBUTING.md) for details on how to get involved.

## License

`napi` is licensed under the [Sustainable Use License](https://github.com/nanoapi-io/napi/blob/main/LICENSE.md).

## Further Reading

- [Automating the Strangler Pattern with Microlithic Development](https://medium.com/@joel_40950/automating-the-strangler-pattern-with-microlithic-development-241e4e0dd79b)
- [Rise of the "Microlith": Rethinking Microservices for Modern Developers](https://dev.to/nanojoel/open-sourcing-nanoapi-rethinking-microservices-for-modern-developers-14m2)

## Donations

NanoAPI is a fair-source project. Because of this, we feel it would be unethical to keep any donations to ourselves. Instead, here is how we will handle donations:

- Donations go into a pool
- Money from the pool will be distributed to contributors
- At the end of the year, any remaining money will be donated to a charity of the community's choice

We will post regular updates on how much money is in the pool and how it is being distributed.
