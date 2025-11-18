# Trailog

Trailog is a SPA web application that allows users to create and manage their own AI agents. It provides a user-friendly interface for building agents, defining their behavior, and interacting with them.

---

 ## Table of Contents

- [Dev Environment Tips](#dev-environment-tips)
- [Code Style](#code-style)
- [Features](#features)
- [Repository Layout](#repository-layout)
- [Branching Strategy](#branching-strategy)
- [Technology Stack](#technology-stack)

## Dev environment tips
- Install deps: `npm install`
- Start dev server: `npm run dev`
- Run tests: `npm test`

## Code style
- TypeScript strict mode
- Use functional patterns where possible
- Prefer named functions for React components

## Features
- Add, edit and delete waypoints as GPS coordinates.
- Create routes by connecting waypoints.

## Repository Layout

- `app/`: application root of source code
  - `app/components`: UI components
  - `app/hooks`: Useful React hooks
  - `app/routes`: all application routes
  - `app/services`: IndexedDB and geolocation code
  - `app/welcome`: landing page React code
- `docs/`: documentation and example route
- `public/`: static HTML content

## Branching Strategy

Feature branches should be named `feature/your-feature-name` and bugfixes `bugfix/your-bugfix-name`.


## Technology Stack

This project uses React with TypeScript and [React Router v7](https://reactrouter.com/home) for routing and navigation.
Tailwind CSS for styling the UI components uses [Headless](https://headlessui.com) for accessible UI components.

Vite and vitest are used to build and run tests.

For maps, Leaflet features are used through the react-leaflet package.
All waypoints and route data is stored in IndexedDB.
