# napi

Powerful CLI + UI for inspecting and refactoring an API codebase in any language and web framework.

> This project is under ongoing development. Check the [status section](#status) for more information on supported languages and frameworks.

## Features

- **Inspect**: Analyze your codebase and understand the API endpoints, middleware, and other API-specific code
- **Refactor**: Refactor your codebase into smaller, more manageable pieces through the UI or annotations
- **Build**: Transform your codebase into smaller, more manageable pieces at build time

## Motivation

- Quickly refactor large/monolith codebases into smaller, more manageable pieces at build time
- Increase robustness by reducing the downtime through isolating
- Don't waste time with consultants or contractors to refactor your codebase
- Better understand what your codebase is doing today
- Create a new development paradigm (develop monolith, deploy microservice) for projects moving fast

To understand better what we mean by the above, please take a look at our [documentation](https://nanoapi.io/docs/nanoapi).

## Design goals

- Zero configuration
- Support for all languages and web frameworks
- Auto-detect endpoint definitions, middleware, and other API-specific code without manual annotations
- Clean, simple, and easy to use UI

## Quick Start

Ensure you have NodeJS >= 18 and NPM installed on your machine.

```bash
$ npm install -g @nanoapi-io/napi
```

To open the UI for your codebase, run the following commands:

```bash
$ napi init
$ napi ui
```

## Examples

We are building a collection of example API repositories in each language so you can explore the project. This list will grow over time.

[examples](/examples/README.md)

## Usage

### Installation

We are working on a binary release, but for now, you can install it via this github repository:

```bash
$ git clone https://github.com/nanoapi-io/napi.git
$ cd napi
$ npm install
```

### Usage

To open the UI and inspect your codebase, run the following commands:

```bash
$ napi init
$ napi ui
```

### Commands:

```
  init                  Initialize the NanoAPI project
  ui [entrypoint]       Inspect the codebase and understand the API endpoints, middleware, and other API-specific code
  split <entrypoint>    Transform the codebase into smaller, more manageable pieces at build time
```

## Using the UI

The easiest way to refactor your API endpoints is to do it through our UI. You can group endpoints and create builds from here.

## Building with Annotations

You can also refactor your codebase by adding annotations to your code. Here is an example of how you can do it:

```typescript
// src/api.js

import * as express from "express";

import * as service from "./service.js";

const app = express();
const port = 3000;

app.use(express.json());

// @nanoapi endpoint:/api/v2/maths/time method:GET group:Time
app.get("/api/v2/maths/time", (req, res) => {
  const result = service.time();
  return res.json({
    result,
  });
});

// @nanoapi endpoint:/api/v2/maths/addition method:POST group:Maths
app.post("/api/v2/maths/addition", (req, res) => {
  const { body } = req;
  const result = service.addition(body.a, body.b);
  return res.json({
    result,
  });
});

// @nanoapi endpoint:/api/v2/maths/subtraction method:POST group:Maths
app.post("/api/v2/maths/subtraction", (req, res) => {
  const { body } = req;
  const result = service.subtraction(body.a, body.b);
  return res.json({
    result,
  });
});

app.listen(port, () => {
  console.log(`App listening on port: ${port}`);
});
```

## Output

From the exmaple above, you will get the following output from running a build:

```typescript
// dist/Time/src/api.js

import * as express from "express";

import * as service from "./service.js";

const app = express();
const port = 3000;

app.use(express.json());

app.get("/api/v2/maths/time", (req, res) => {
  const result = service.time();
  return res.json({
    result,
  });
});

app.listen(port, () => {
  console.log(`App listening on port: ${port}`);
});
```

## Contributing and Development

We welcome contributions from the community. Please read our [contributing guide](/.github/CONTRIBUTING.md) for more information.

## Status

This project is in the early stages of development. We are actively working on the project and will be releasing new features and improvements regularly, which may include a rewrite into a more efficient and generic language like Rust or Go. Please check our issues and project board for more information, and don't for.

- [x] Limited support for NodeJS/Typescript
- [x] Simple UI
- [x] Full support for NodeJS/Typescript
- [ ] Python support with Flask
- [ ] Django support
- [ ] Full python support
- [ ] PHP support
- [ ] Java support
- [ ] C# support

## On Donating

NanoAPI is a fair-source project. Because of this, we feel it would be unethical to keep any donations to ourselves. Instead, here is how we will handle donations:

- Donations go into a pool
- Money from the pool will be distributed to contributors
- At the end of the year, any remaining money will be donated to a charity of the community's choice

We will post regular updates on how much money is in the pool and how it is being distributed.
