![NanoAPI Banner](/media/github-banner.png)

# napi - Next-Level Visual Tooling For API Codebases

`napi` is a versatile tool built by NanoAPI and designed to automatically refactor large monolitic codebases into smaller, more manageable microservices. With both a powerful CLI and an intuitive UI, `napi` is compatible with all major CI/CD platforms, allowing seamless integration into your development and deployment pipelines.

![NanoAPI UI Overview](/media/hero-app.png)

## Features

- **🔍 Inspect**: Analyze your codebase to identify API endpoints, middleware, and other API-specific components.
- **📝 Refactor**: Split your monolith into microservices using the UI or annotations in the code.
- **🏗️ Build**: Generate modular microservices ready for deployment.
- **⚙️ Integrate**: Use CLI commands compatible with all CI/CD workflows for automation.

## Why `napi`?

- Simplifies the process of breaking down monoliths into microservices.
- Improves understanding, maintainability, and robustness at both the architecture and code level.
- Reduces dependency on consultants or contractors for complex refactoring tasks.
- Accelerates development with a "develop monolith, deploy microservice" approach.

## Supported Languages and Frameworks

`napi` aims to support all major programming languages and web frameworks. Here is the current status:

| Language/Framework | Status         | Related Issues                                      |
| ------------------ | -------------- | --------------------------------------------------- |
| JavaScript         | ✅ Supported   | Early Core Feature                                  |
| TypeScript         | ✅ Supported   | Early Core Feature                                  |
| Python             | ✅ Supported   | [#28](https://github.com/nanoapi-io/napi/issues/28) |
| PHP                | 🚧 In Progress | [#30](https://github.com/nanoapi-io/napi/issues/30) |
| C#                 | 🚧 In Progress | [#31](https://github.com/nanoapi-io/napi/issues/31) |
| Java               | 🚧 In Progress | [#32](https://github.com/nanoapi-io/napi/issues/32) |
| C                  | 🚧 In Progress | Not Tracked Yet                                     |
| C++                | 🚧 In Progress | Not Tracked Yet                                     |

For the latest updates, visit our [project board](https://github.com/nanoapi-io/napi/projects).

## Documentation

Comprehensive documentation is available on our [documentation website](https://nanoapi.io/docs/nanoapi).

## Quick Start

Ensure you have Node.js (>=18) and npm installed.

### Installation

```bash
npm install -g @nanoapi.io/napi
```

### Getting Started

```bash
napi init
napi split configure
napi split
```

This will initialize a new NanoAPI project and open the UI for inspecting and refactoring your codebase.

**Note:** `napi` works off a simple system of annotation. These annotation allow `napi` to be integrated into any existing projects. Annotating a program is needed before using the split functionalities see [Refactoring with Annotations](#refactoring-with-annotations).

## CLI Usage

`napi --help` will provides an overview off all commands

For more detailed information about the CLI and what each command does, refer to our [CLI guide](https://nanoapi.io/docs/cli/).

## Refactoring with Annotations

You can use annotations to specify how to split your code.
Simply add them above blocks of code that is handling or registering an endpoint
Here’s an example:

```typescript
// src/api.js

// @nanoapi endpoint:/api/v1/users method:GET group:Users
app.get("/api/v1/users", (req, res) => {
  res.send("User data");
});

// @nanoapi endpoint:/api/v1/orders method:POST group:Orders
app.post("/api/v1/orders", (req, res) => {
  res.send("Order created");
});
```

You can view more example in the [examples](/examples/)

Running `napi split` with the following annotations will generate modular services based on these annotations. You'll have a `Users` service and an `Orders` service, each containing the respective endpoint.

## Using the UI

The UI provides an interactive interface to:

- Group and organize endpoints.
- Preview the generated microservices.

```
napi split configure
```

## CI/CD Integration

`napi` works seamlessly with CI/CD platforms like GitHub Actions, GitLab CI/CD, and Jenkins. For setup instructions, refer to our [CLI guide](https://nanoapi.io/docs/cli/).

## Further Reading

- [Automating the Strangler Pattern with Microlithic Development](https://medium.com/@joel_40950/automating-the-strangler-pattern-with-microlithic-development-241e4e0dd79b)
- [Rise of the "Microlith": Rethinking Microservices for Modern Developers](https://dev.to/nanojoel/open-sourcing-nanoapi-rethinking-microservices-for-modern-developers-14m2)

## Contributing

We welcome contributions from the community. Please read our [contributing guide](https://github.com/nanoapi-io/napi/blob/main/.github/CONTRIBUTING.md) for details on how to get involved.

## License

`napi` is licensed under the [Sustainable Use License](https://github.com/nanoapi-io/napi/blob/main/LICENSE.md).

## Support

<div align="center">
  <p>For questions or issues, feel free to open an issue on GitHub or join us on our server on Discord.</p>
  <table>
    <tr>
      <td valign="center">
        <a href="https://github.com/nanoapi-io/napi/issues/new/choose" target="_blank">
          <img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" alt="GitHub Logo" width="50" />
        </a>
      </td>
      <td valign="center">
        <a href="https://discord.gg/4ZaQ347ZmQ" target="_blank">
          <img src="https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/653714c1c2d8d50382c7df8a_636e0b5061df29d55a92d945_full_logo_blurple_RGB.svg" alt="Discord Logo" width="100" height="100" />
        </a>
      </td>
    </tr>
  </table>
</div>

## Donations

NanoAPI is a fair-source project. Because of this, we feel it would be unethical to keep any donations to ourselves. Instead, here is how we will handle donations:

- Donations go into a pool
- Money from the pool will be distributed to contributors
- At the end of the year, any remaining money will be donated to a charity of the community's choice

We will post regular updates on how much money is in the pool and how it is being distributed.
