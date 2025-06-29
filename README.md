![NanoAPI Banner](/media/github-banner.png)

- [Documentation](https://docs.nanoapi.io)

# napi - Better Software Architecture for the AI Age

`napi` is a versatile tool built by NanoAPI and designed to automatically
provide insights into the architectural complexity of your software, while
allowing for the novel extraction of functionality from codebases into smaller
units. With both a powerful CLI and an intuitive UI, `napi` is compatible with
all major CI/CD platforms, allowing seamless integration into your development
and deployment pipelines.

Historically, tools like this have only been built by large consulting firms or
contractors and kept behind the paywalls of consulting fees. `napi` aims to make
these tools accessible to developers of all skill levels, without the cost. Our
vision is to help you gain deeper insights into system architecture-level
concerns before they become hundred-million-dollar problems. The added benefit?
No more black-box tools running on your code and the confidence of a 100%
determinstic tool.

![NanoAPI UI Overview](/media/hero-app.png)

## Features

- **🚨 Audit**: Pinpoint areas of your code that need refactoring or cleanup.
- **📝 Refactor**: Extract functionality using the UI to improve architecture.
- **🏗️ Build**: Generate modular microservices ready for deployment.
- **⚙️ Integrate**: Use CLI commands compatible with all CI/CD workflows for
  automation.
- **🔍 Architecture**: Get a live view of all your software and their
  interactions; scoped to a specific moment in time.

<!-- - **📖 History**: Track changes to architecture through time using a git-history-style tool.
- **📈 Graphs**: Understand if your software is improving or degrading over time. -->

## Why `napi`?

- **Application Library**: `napi` is not just a CLI tool; it is a comprehensive
  application library of all projects and their interactions within your
  organization.
- **Enables discovery into legacy systems**: indentify problematic code and
  potential improvements early.
- **Modular Monoliths**: Simplifies the process of extracting functionality
  using non-AI strangler refactoring.
- **Risk assessment**: Improve understanding, maintainability, and robustness at
  both the architecture and code level.
- **Refactoring ROI**: Reduces dependency on outside sources for complex
  refactoring tasks.
- **From black box to open-book**: Gain a deeper trust of what your system is
  doing today - even in the face of AI-generated code.

## Supported Languages

`napi` aims to support all major programming languages. Here is the current
status:

| Language/Framework | Status         |
| ------------------ | -------------- |
| Python             | ✅ Supported   |
| C#                 | ✅ Supported   |
| C                  | ✅ Supported   |
| Java               | ✅ Supported   |
| C++                | 🚧 In Progress |
| PHP                | 🚧 In Progress |
| JavaScript         | 🚧 In Progress |
| TypeScript         | 🚧 In Progress |

For the latest updates, visit our [project board](/projects).

## Installation

`napi` works out of the box on both mac, linux, and windows systems.

To install `napi`, you can use our installation script:

### Unix Systems (MacOS, Linux)

Wyou to install napi using our convenience script:

```bash
curl -fsSL https://raw.githubusercontent.com/nanoapi-io/napi/refs/heads/main/install_scripts/install.sh | bash
```

You can also download and install the latest release manually directly from our
GitHub repository:

https://github.com/nanoapi-io/napi/releases/latest

### Windows

You can run napi using Windows Subsystem for Linux (WSL)
https://learn.microsoft.com/en-us/windows/wsl/install

We are actively working on supporting windows natievely.

### Troubleshooting

If you encounter any issues during installation, please refer to our
[Troubleshooting Guide](https://docs.nanoapi.io/default-guide/troubleshooting)

## CLI Usage

`napi` provides a streamlined Command-Line Interface (CLI) to interact with and
refactor your software projects quickly and efficiently.

For a full list of commands, run:

```bash
napi --help
```

## Overview of all commands

### `napi login`

Authenticate with the NanoAPI service. This step is required to access the
NanoAPI UI and to use certain features of `napi`.

### `napi init`

Initialize the project. This step is required before running any other command.

This will create a .napirc configuration file in the project root, storing paths
and settings necessary for further commands.

### `napi manifest generate`

Generate a manifest of your codebase that captures its structure, dependencies,
and relationships and pushes it to your NanoAPI workspace in the app.

### `napi extract`

Extract specific symbols (functions, classes, etc.) from your codebase into
separate files. Use the format `--symbol file|symbol` where file is the path
relative to your project root and symbol is the name to extract. The UI can
generate these commands for convenient copy-pasting when browsing your code.

> **Important**: Run `napi manifest generate` whenever you make significant
> changes to your codebase to ensure your manifest stays up-to-date. The
> manifest data can be integrated into CI/CD workflows to track architectural
> changes over time.

## CI/CD Integration

`napi` works seamlessly with CI/CD platforms like GitHub Actions, GitLab CI/CD,
and Jenkins. This allows us to build the code manifest needed for visualization
and refactoring in the background, without needing to wait for it to run locally
in the case of very large codebases (>1M lines of code).

More information

## Contributing

We welcome contributions from the community. Please read our
[contributing guide](https://github.com/nanoapi-io/napi/blob/main/.github/CONTRIBUTING.md)
for details on how to get involved.

## License

`napi` is licensed under the
[Sustainable Use License](https://github.com/nanoapi-io/napi/blob/main/LICENSE.md).

## Further Reading

- [Automating the Strangler Pattern with Microlithic Development](https://medium.com/@joel_40950/automating-the-strangler-pattern-with-microlithic-development-241e4e0dd79b)
- [Rise of the "Microlith": Rethinking Microservices for Modern Developers](https://dev.to/nanojoel/open-sourcing-nanoapi-rethinking-microservices-for-modern-developers-14m2)

## Donations

NanoAPI is a fair-source project. Because of this, we feel it would be unethical
to keep any donations to ourselves. Instead, here is how we will handle
donations:

- Donations go into a pool
- Money from the pool will be distributed to contributors
- At the end of the year, any remaining money will be donated to a charity of
  the community's choice

We will post regular updates on how much money is in the pool and how it is
being distributed.
