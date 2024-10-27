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

1. Ensure an issue exists for the changes you want to make.
2. Fork the repository.
3. Create a new branch.
4. Make your changes.
5. Test your changes.
6. Push your changes to your fork.
   1. Make sure to rebase before pushing.
7. Submit a pull request.
8. Follow the template and fill in all the sections.
9. Wait for feedback.
10. Make changes if necessary.
11. Celebrate your success after your PR gets merged. The Codex Astartes supports this action.

## Development Environment 

You will need the following tools to develop NanoAPI:

- [Node.js](https://nodejs.org/en/) version 18 or higher.

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

### Running the Project

When running locally, the UI and CLI must be run separately to avoid having to recreate production builds of the UI on each change.

To run the UI:

```bash
$ npm run dev:app
```

To run the CLI:

```bash
$ npm run dev:cli <command>
```

Running the `ui` command from the CLI will spin up a web server on your localhost. You can access the UI by navigating to `http://localhost:3000`.

> **Note:** In case of port collisions, the UI will automatically switch to the next available port.


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

### Documentation

We are also building on the documentation process. For now, include any documentation changes in your PRs and we will add them into the main documentation.

