# Changelog

## [Unreleased]

## [1.0.7] - 2025-04-30

Fix some small bug on the FE, mainly unify the colors of edges and their
direction accross views

## [1.0.6] - 2025-04-29

Fix some small FE bugs. improve symbol extraction for C#

## [1.0.5] - 2025-04-29

Improve symbol extraction for python now removing unused import, but keeping
them if they were unused in the original code. Improve python usage reolution
logic, now more accurate. Improve accuracy of dependency manifest for C# Improve
symbol extraction for for C# Implement metrics in C#

## [1.0.4] - 2025-04-25

Fix release flow, bundling packages/shared into the CLI instead of using
published version.

## [1.0.3] - 2025-04-24

Fix release flow

## [1.0.2] - 2025-04-24

Implement fil view and symbol view

## [1.0.1] - 2025-04-22

Switch to ESM Some UI improvement with project view Symbol extraction for python

## [1.0.0] - 2025-04-14

New release major release

## [0.0.32] - 2025-04-14

New version of napi

- dependency visualizer (supports python and csharp)

## [0.0.31] - 2025-02-11

Improve audit to support more use cases

## [0.0.30] - 2025-01-16

Implement audit command

## [0.0.29] - 2025-01-07

Fix split command by renaming it to avoid conflicts

## [0.0.28] - 2025-01-07

fix the path of app_dist directory to fix bug in production

## [0.0.27] - 2025-01-02

Change command names

## [0.0.26] - 2024-12-17

Update dependencies Improve annotate openai command

## [0.0.25] - 2024-12-13

Fix broken version

## [0.0.24] - 2024-12-13

Fix broken version

## [0.0.23] - 2024-12-13

Fix broken version

## [0.0.22] - 2024-12-13

fix broken version

## [0.0.21] - 2024-12-13

Improve telemetry Run split process in Node workers

## [0.0.20] - 2024-12-01

Python support

## [0.0.19] - 2024-11-13

Fix https://github.com/nanoapi-io/napi/issues/38

## [0.0.18] - 2024-11-09

Remove support for require and dynamic import Code splitting now works take into
account the whole dependencies. This fixes
https://github.com/nanoapi-io/napi/issues/26

## [0.0.17] - 2024-11-01

Use indexes when editing file instead of search/replace Some UX changes

## [0.0.16] - 2024-10-30

Add support for dynamic import in javascript

## [0.0.15] - 2024-10-30

Add support for require import in javascript

## [0.0.14] - 2024-10-30

Fix padding and size discrepancy with toolbar

## [0.0.13] - 2024-10-29

Try yo resolve file with any extension as last resort Add index route node in
the FE graph Fix some minor visual issue with some svg images

## [0.0.12] - 2024-10-28

Fix performance issue with reactflow due to blur background css add support for
orientation switch of the graph (portrait/landscape)

## [0.0.11] - 2024-10-28

improve CI

## [0.0.10] - 2024-10-28

improve CI

## [0.0.9] - 2024-10-28

improve CI

## [0.0.8] - 2024-10-28

improve CI

## [0.0.7] - 2024-10-28

Implement grouping Fix minor UI issue with edges

## [0.0.6] - 2024-10-27

Update design css

## [0.0.5] - 2024-10-27

Add telemetry

## [0.0.4] - 2024-10-26

Change design

## [0.0.3] - 2024-10-23

Fix confirm prompt when running init command

## [0.0.2] - 2024-10-23

Add .napirc config

## [0.0.1] - 2024-10-22

Implement release workflow

## [0.0.0]

First version
