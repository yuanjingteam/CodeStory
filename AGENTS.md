# Repository Guidelines

## Project Structure & Module Organization

CodeStory is split into two TypeScript applications. `frontend/` contains the Next.js App Router UI: routes live in `src/app`, reusable UI in `src/components`, API clients in `src/api`, and shared hooks, stores, types, and utilities in their matching directories. `backend/` contains the Express API; keep request handling in `src/controllers`, business logic in `src/services`, endpoints in `src/routes`, and cross-cutting code in `src/middleware` or `src/utils`. Prisma schema and migrations belong in `backend/prisma`. Deployment configuration lives in `nginx/`, `docker-compose*.yml`, and `.env.production.example`; longer project notes belong in `docs/`.

## Build, Test, and Development Commands

Install dependencies separately with `cd frontend && pnpm install` and `cd backend && pnpm install`.

- `pnpm dev` (in either app): start that app in watch mode; defaults are frontend `3001` and API `4001` when configured as documented.
- `pnpm build`: create a production Next.js build or compile the API with `tsc`.
- `pnpm check` in `frontend/`: run TypeScript checking followed by ESLint.
- `pnpm check` in `backend/`: compile, then run all authentication checks.
- `pnpm prisma migrate dev` in `backend/`: apply development database migrations.
- `docker compose -f docker-compose.dev.yml up -d`: start the development stack.

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, semicolons, and the import style already present in the edited module. React components and their files use PascalCase (`AuthGate.tsx`); hooks use `useXxx`; utilities and variables use camelCase. Keep route folders lowercase and follow RESTful API conventions. Do not edit generated Prisma output. Run the frontend `pnpm check` before submitting UI changes.

## Frontend Design Guidelines

For any visible frontend change, follow [`docs/CodeStory_前端设计规范.md`](docs/CodeStory_前端设计规范.md). It is the implementation source of truth for CodeStory's Neo-Brutalism visual language, responsive behavior, interaction states, accessibility, and UI review checklist. Reuse existing components and patterns before adding new ones, and do not introduce a competing visual style unless the user explicitly requests a project-wide redesign.

## Testing Guidelines

There is no general unit-test framework or coverage threshold yet. Backend authentication checks are executable scripts named `backend/scripts/check-auth-*.ts`; they require valid database, Redis, JWT, and API environment settings. Add focused tests alongside new behavior when introducing a test framework, and document the command in the relevant `package.json`. At minimum, build both apps and manually exercise affected routes.

## Commit & Pull Request Guidelines

Use an English Conventional Commit type before the colon and a concise Chinese description after it, for example: `feat: 增加课程搜索功能` or `fix: 修复会话过期处理`. Keep each commit scoped to one change. Pull requests should explain the problem and solution, link related issues, list verification commands, and call out migrations or configuration changes. Include before/after screenshots for visible UI work and never commit `.env` files, credentials, uploads, or generated build artifacts.
