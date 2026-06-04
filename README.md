This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

1. Connect the GitHub repo whose **root** contains `package.json` and an **`app/`** folder (not the contents of `app/` alone).
2. Set **Root Directory** to `.` (leave empty) — do not point at a parent monorepo folder unless the Next app lives there.
3. Add environment variables from `.env.local` in the Vercel project settings (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.).

### Correct repository layout

```
package.json
next.config.ts
app/
  layout.tsx
  (app)/
  (marketing)/
  components/
  lib/
public/
supabase/
```

If Vercel reports *"Couldn't find any pages or app directory"*, the repo on GitHub is usually wrong: `(app)`, `layout.tsx`, and `components/` sit at the repo root **without** the `app/` wrapper. Re-push from this folder:

```bash
cd pasta   # folder that contains package.json AND app/
git init   # if needed
git add package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs public app supabase scripts
git commit -m "Fix repo layout for Vercel"
git remote add origin https://github.com/Samuel-1234567/Pasta.git
git push -u origin main --force   # only if you intend to replace the broken layout on GitHub
```

`node_modules` and `.next` should stay untracked; Vercel installs dependencies during the build.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
