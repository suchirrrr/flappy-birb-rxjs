# Flappy Birb

Flappy Birb is a browser game inspired by Flappy Bird, built with TypeScript, RxJS, and SVG. The project uses functional reactive programming to manage game state, user input, movement, scoring, collisions, and replay behaviour.

## Project Overview

The game runs in the browser using Vite. Instead of a traditional imperative game loop, gameplay is modelled through RxJS streams that transform user input and timer events into updated game state.

## Problem

Interactive games involve many events happening at once: player input, gravity, collisions, scoring, restarts, and rendering. The challenge was to coordinate those events in a predictable way while applying functional reactive programming principles.

## Solution

Flappy Birb uses Observables to represent keyboard input, timer ticks, restart events, pause events, CSV-loaded pipe data, and replay state. These streams are combined into a single state flow, and rendering is handled as a side effect of state changes.

## Key Features

- Flappy Bird-style gameplay
- Spacebar flap control
- Pipe movement loaded from CSV data
- Collision detection with pipes and screen boundaries
- Score and lives tracking
- Restart support
- Pause support
- Win and game-over states
- Timed background switching
- Ghost replay of previous runs
- Unit test setup with Vitest

## Tech Stack

- TypeScript
- RxJS
- Vite
- SVG
- HTML
- CSS
- Vitest
- Prettier

## My Contribution

- Implemented the main reactive game state pipeline.
- Built movement, collision, scoring, pause, restart, and win/loss logic.
- Rendered game objects and overlays using SVG.
- Added replay-style ghost bird behaviour from previous runs.
- Used TypeScript types to make the game state easier to reason about.

## How to Run

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Run tests:

```bash
npm test
```

4. Build the project:

```bash
npm run build
```

5. Optional: regenerate pipe data:

```bash
npm run generate-pipes
```

## What I Learned

- How to use RxJS Observables to model interactive application state.
- How functional reactive programming can replace a traditional game loop.
- How to manage collision, scoring, and restart logic in a predictable state pipeline.
- How to render SVG elements from TypeScript.
- Why assignment-specific setup notes should be cleaned up before presenting a project to recruiters.

