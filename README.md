# Flappy Birb – Functional Reactive Programming Game

Flappy Birb is a browser-based game inspired by Flappy Bird, built using TypeScript, RxJS and SVG. The project applies functional reactive programming concepts to manage game state, movement, collisions and user input.

## Project Overview

The game uses RxJS Observable streams to control gameplay events such as gravity, flapping, pipe movement, scoring, collisions and game resets.

Instead of relying on traditional imperative game loops, the project focuses on reactive data streams and functional programming principles.

## Key Features

- Flappy Bird-style browser gameplay
- Gravity and flapping mechanics
- Scrolling pipes
- Collision detection
- Score tracking
- Lives system
- Restart functionality
- Game-ending conditions
- Ghost bird replay
- Pause functionality
- Timed background switching

## Tech Stack

- TypeScript
- RxJS
- SVG
- HTML
- CSS
- Functional Reactive Programming

## Project Focus

This project focused on building a game using functional reactive programming principles.

The project strengthened skills in:
- TypeScript programming
- Observable streams
- Event-driven design
- Functional programming
- Game state management
- Browser-based rendering with SVG

## Learning Outcome

Flappy Birb helped demonstrate how reactive programming can be used to build interactive applications with clean event flow and predictable state updates.
## Usage

Setup (requires node.js):

```bash
> npm install
```

Start tests:

```bash
> npm test
```

Serve up the App (and ctrl-click the URL that appears in the console)

```bash
> npm run dev
```

To generate a map:

```bash
npm run generate-pipes
```

To format your code, for the assignment specifications:

```bash
npx prettier . --write
```

The configuration for this is set in `.prettierrc.json`. Feel free to change this to your heart's desire, but try to ensure it still fits the assignment guidelines.

If you are using VS Code, you can also install the [Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode). This skeleton code is set up to automatically format your code on save. You can disable this in `.vscode/settings.json` by changing `"editor.formatOnSave": true` to `"editor.formatOnSave": false`.

## Implementing features

There are a few files you may wish to modify. The rest should **not** be modified as they are used for configuring the build.

`src/main.ts`

- Code file used as the entry point
- Most of your game logic should go here
- Contains main function that is called on page load

`src/style.css`

- Stylesheet
- You may edit this if you wish

`index.html`

- Main html file
- Contains scaffold of game window and some sample shapes
- Feel free to add to this, but avoid changing the existing code, especially the `id` fields

`test/*.test.ts`

- If you want to add tests, these go here
- Uses [`vitest`](https://vitest.dev/api/)

We expect the core logic of your game to be in `src/main.ts`, however, you may elect to spread your code over multiple files. In this case, please use ![TS Modules](https://www.typescriptlang.org/docs/handbook/modules.html).

Avoid separating code into too many files as it makes it hard to mark. The maximum recommended code file structure would be something like

```
src/
  main.ts        -- main code logic inc. core game loop
  types.ts       -- common types and type aliases
  util.ts        -- util functions
  state.ts       -- state processing and transformation
  view.ts        -- rendering
  observable.ts  -- functions to create Observable streams
```
