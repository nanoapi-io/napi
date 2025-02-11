![NanoAPI Banner](/media/github-banner.png)

# napi - Isolate and deploy APIs separately at build time

`napi` is a versatile tool built by NanoAPI and designed to automatically refactor large monolithic codebases into smaller, more manageable microservices, while providing insights into the architectural complexity of your software.
With both a powerful CLI and an intuitive UI, `napi` is compatible with all major CI/CD platforms, allowing seamless integration into your development and deployment pipelines.

Historically, tools like this have only been built by large consulting firms or contractors and kept behind the paywalls of consulting fees. `napi` aims to make these tools accessible to developers of all skill levels, without the cost. Our vision is to help you reduce your reliance on consultants and contractors, while gaining deeper insights into system architecture-level concerns. The added benefit? No more black-box consultant tools running on your code.

![NanoAPI UI Overview](/media/hero-app.png)

## Features

- **🚨 Audit**: Pinpoint areas of your code that need refactoring or cleanup.
- **📝 Refactor**: Split your monolith into microservices using the UI and annotations in the code.
- **🏗️ Build**: Generate modular microservices ready for deployment.
- **⚙️ Integrate**: Use CLI commands compatible with all CI/CD workflows for automation.

## Why `napi`?

- Identifies problematic code and potential improvements early.
- Simplifies the process of breaking down monoliths into microservices.
- Improves understanding, maintainability, and robustness at both the architecture and code level.
- Reduces dependency on consultants or contractors for complex refactoring tasks.
- Accelerates development with a "develop monolith, deploy microservice" approach.

## FAQs

If you have questions that aren't covered here, feel free to email us at info@nanoapi.io.

#### Does NanoAPI edit my code?

NanoAPI does not modify your original code directly. Instead, it uses annotations to identify API endpoints, then generates new, isolated microservices based on these annotations. Your existing code remains untouched.

NanoAPI copies and restructures relevant parts of the codebase during the splitting process, ensuring that the refactored output exists alongside the original monolith.

If you're curious, take a look at our source code to explore how it works.

## Support

Before reaching out, check our [FAQ section](#faqs) for answers to common questions.

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

## Supported Languages

`napi` aims to support all major programming languages. Here is the current status:

| Language/Framework | Status         | Related Issues                                      |
| ------------------ | -------------- | --------------------------------------------------- |
| JavaScript         | ✅ Supported   | Early Core Feature                                  |
| TypeScript         | ✅ Supported   | Early Core Feature                                  |
| Python             | ✅ Supported   | [#28](https://github.com/nanoapi-io/napi/issues/28) |
| C#                 | 🚧 In Progress | [#31](https://github.com/nanoapi-io/napi/issues/31) |
| PHP                | 🚧 In Progress | [#30](https://github.com/nanoapi-io/napi/issues/30) |
| Java               | 🚧 In Progress | [#32](https://github.com/nanoapi-io/napi/issues/32) |
| C                  | 🚧 In Progress | Not Tracked Yet                                     |
| C++                | 🚧 In Progress | Not Tracked Yet                                     |

For the latest updates, visit our [project board](/projects).

## Installation

Ensure you have Node.js (>=18) and npm installed.

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

> **Important**: Run napi audit view periodically, especially before major refactoring efforts, to ensure your code is in good shape. It will soon also be possible to integrate that command into CI/CD workflows to catch code-quality issues early.

### `napi split annotate openai`

Annotate your API automatically using OpenAI. This is a great way to get started quickly for large or complex codebases.

> **Important:** LLMs can make mistakes. We recommend reviewing AI-generated annotations carefully before running `napi split run` to avoid unexpected behavior in the resulting microservices.

> **Important** We recommand you to read [Split with Annotations](#split-with-annotations) before generating annotations.

### `napi split configure`

Open the NanoAPI UI in your default browser to configure and organize API endpoints visually. This interactive interface allows you to manage groups, refactor, and preview microservices before the split.

> **Important:** This process relies on annotation (see [Split with Annotations](#split-with-annotations)).

### `napi split run`

Split the codebase into smaller, more manageable pieces based on annotations. This is ideal for simplifying large monolithic projects.

> **Important:** This process relies on annotation (see [Split with Annotations](#split-with-annotations)).

## Split with Annotations

NanoAPI uses annotations to simplify the process of splitting codebases.

Annotations define the structure of your API by marking endpoints, methods, and groups directly in the code.
You add these annotations on top of blocks of code that are registering or handling endpoints.
These annotations guide how your monolith will be split into microservices.

You can check the examples to see how you should annotate your codebases in the [examples](/examples/).

### Annotation Structure

An annotation takes the form:

```javascript
// @nanoapi path:/random method:GET group:Math
```

### Breakdown of the Annotation:

|                                |                                                        |
| ------------------------------ | ------------------------------------------------------ |
| **@nanoapi**                   | Marks the comment as an annotation.                    |
| **path:<path>**                | Defines the API endpoint path (e.g., /random/:length). |
| **method:<method>** (Optional) | Specifies the HTTP method (e.g., GET, POST).           |
| **group:<group>** (Optional)   | Organizes endpoints into services during the split.    |

### How does napi split based on the annotation

NanoAPI intelligently filters and organizes code by retaining relevant groups and discarding unused segments. This ensures that your microservices are lean and contain only necessary dependencies.

The process is as follows:

- Annotations matching the targeted group are kept.
- Annotations from different groups are removed. As well as all their dependents.
- Unused code gets removed.

### Example

You can view more examples in the [examples](/examples/)

#### Input

```js
// src/api.js

// @nanoapi path:/api/v1/users method:GET group:Users
app.get("/api/v1/users", (req, res) => {
  res.send("Users data");
});

// @nanoapi path:/api/v1/users/<id> method:GET group:Users
app.get("/api/v1/users/<id>", (req, res) => {
  res.send("User data");
});

// @nanoapi path:/api/v1/orders method:POST group:Orders
app.post("/api/v1/orders", (req, res) => {
  res.send("Order created");
});
```

#### Resulting output ➡️

```js
// napi_dist/0/src.js

/// @nanoapi path:/api/v1/users method:GET group:Users
app.get("/api/v1/users", (req, res) => {
  res.send("Users data");
});

// @nanoapi path:/api/v1/users/<id> method:GET group:Users
app.get("/api/v1/users/<id>", (req, res) => {
  res.send("User data");
});
```

```js
// napi_dist/1/src.js

// @nanoapi path:/api/v1/orders method:POST group:Orders
app.post("/api/v1/orders", (req, res) => {
  res.send("Order created");
});
```

Running `napi split run` with the following annotations will generate modular services based on these annotations. You'll have a `Users` service and an `Orders` service, each containing the respective endpoint.

### How to Annotate my codebase

There are two ways to annotate your code:

#### 1. Manual Annotation

Add annotations directly above relevant code blocks.

#### 2. AI Annotation

Automatically generate annotations for large codebases using AI.

```bash
napi split annotate openai
```

## CI/CD Integration

`napi` works seamlessly with CI/CD platforms like GitHub Actions, GitLab CI/CD, and Jenkins.

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
