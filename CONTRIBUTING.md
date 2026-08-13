# Contributing

Thank you for helping with VietaMath.

Before opening a large change, start an issue so the approach can be discussed.
Small fixes and documentation changes can go straight to a pull request.

## Local setup

Use Node.js 20.19 or newer.

```sh
npm ci
npm test
npm run build
npm run build:examples
```

Keep changes focused. Add a test when you change normalization, export, source
ranges, or editing behavior. Do not commit generated `dist` directories.

Run `npm run pack:check` when changing package metadata or exports.

## Pull requests

Explain the behavior that changed and how you tested it. Include a small LaTeX
example for parser or editor changes. Screenshots or short recordings help with
visual interaction changes.

By contributing, you agree that your contribution may be distributed under the
licenses used by this repository.
