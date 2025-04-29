# How to Contribute to NanoAPI

## Contributor License Agreement
<!-- This section always comes first -->
- By submitting code as an individual you agree to the [individual contributor license agreement](/CLA/INDIVIDUAL_CONTRIBUTOR_LICENSE_AGREEMENT.md).
- By submitting code as an entity you agree to the [corporate contributor license agreement](/CLA/CORPORATE_CONTRIBUTOR_LICENSE_AGREEMENT.md).

## Housekeeping

First off, thank you for being here. You dropped this: 👑

Here are some guidelines to help you get started contributing to NanoAPI.

1. Follow our [Code of Conduct](/.github/CODE_OF_CONDUCT.md).
2. Check for open issues before creating a new one.
3. We require an open issue for all pull requests.
4. Help others by reviewing their pull requests.
5. All donations we receive go directly back to our contributors. We’re here to support you when you successfully submit a PR to us. Your efforts help the community grow, and we want to give back to those who help make that possible!

## How to File Issues

Make use of the issue templates, and label your issues appropriately. If you’re unsure about which label to use, don’t worry! We will help you choose the right one.

## How to Submit a Pull Request

1. Don't panic.
2. Ensure an issue exists for the changes you want to make.
3. Fork the repository.
4. Create a new branch.
5. Make your changes.
6. Test your changes.
7. Push your changes to your fork.
   1. Make sure to rebase before pushing.
8. Submit a pull request.
9. Follow the template and fill in all the sections.
10. Wait for feedback.
11. Make changes if necessary.
12. Celebrate your success after your PR gets merged. The Codex Astartes supports this action.

## Development Environment 

You will need the following tools to develop NanoAPI:

- [Node.js](https://nodejs.org/en/) version 22 or higher.

### Environment Set Up

We use the fork-and-pull model for contributions. Here’s how you can set up your development environment:

1. Fork the repository.
2. Clone your fork locally:
  
```bash
$ git clone https://github.com/<your_username>/napi.git
```

3. Enter the folder:
  
```bash
$ cd napi
```

4. Add the original repository as a remote:
  
```bash
$ git remote add upstream https://github.com/nanoapi-io/napi.git
```

5. Install the dependencies:
  
```bash
$ npm install
```

> [!NOTE]
> You may encounter issues on a second or third install of dependencies. If this happens, install with `npm i --no-cache --force` to fix these issues.

### Running the Project

When running locally, the shared libraries and the UI must be built before the CLI can be run.

To build them:

```bash
$ npm run build
```

Next, we want to run the CLI and the UI with hot reload. You will need two terminal windows for this.

1. In the first terminal, run the CLI. This command should be run in the `napi` directory with a `workdir` pointing to the project you want to work on. For example, if you want to work on Apache Airflow, run:

```bash
$ npm run dev:cli -- audit view -- --workdir=/path/to/airflow
```

Running the `audit view` command from the CLI will spin up a web server on your localhost. You can access the UI by navigating to `http://localhost:3000`.

> [!NOTE]
> In case of port collisions, the UI will automatically switch to the next available port.

2. In the second terminal, run the UI. This command should be run in the `napi` directory as well:

```bash
$ npm run dev:app
```

This controls the hot reload functionality for the UI. You can now make changes to the UI and see them reflected in real-time.

> [!IMPORTANT]
> The react UI elements (sidebar, header, etc.) will automatically reload when you make changes. However any Cytoscape elements will not. You will need to refresh the page to see those changes.

### Project Setup

You can use any project (in a supported language) to test the CLI. There are some steps that must be taken to set up the project:

1. Clone or CD to the repo you want to work on/test with. For this example we'll use Apache Airflow.
```bash
git clone https://github.com/apache/airflow.git
cd airflow
```

2. From the `napi` repo initialize the project using the CLI, which will create a `.napirc` file in the project root. This file contains the configuration for the project and is required for the CLI to work.:
```bash
cd /path/to/napi # or just use a different terminal
npm start -- init -- --workdir=/path/to/airflow
```

> [!NOTE]
> If you encounter any issues with the config file, you can [check the reference for the file on our documentation](https://docs.nanoapi.io/default-guide/reference/napirc).

### Testing

```bash
$ npm test
```

### Linting

```bash
$ npm run lint
```

### Release Process

We are currently formalizing the release process. For now, the NanoAPI team will handle making regular releases.

To ensure releases run smoothly, put the content of your changes in our [CHANGELOG](/packages/cli/CHANGELOG.md) file.

### Documentation

We are also building on the documentation process. For now, include any documentation changes in your PRs and we will add them into the main documentation.

The critical documentation to maintain is for any changes that impact the following:
- CLI commands
- Configuration file
- Local development setup
- Release process
- Testing
- Linting

### Discussions vs Issues

We use GitHub Discussions for general questions, ideas, and feedback. If you have a question, please use the Discussions tab. If you have a bug report or feature request, please use the Issues tab.

------

That's it for this guide for now. So long, and thanks for all the fish! 🚀

