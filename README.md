# 🚀 AnatWithMe
📌 This application is meant to help anatomy students schedule student groups. They are matched based on their selected availability and if they want to meet in-person or online. The admins are able to manually adjust selected groups and import assignment links for each weekly agenda.

Documentation PDF: [5911 Hand Off Documentation.pdf](https://github.com/user-attachments/files/26911859/5911.Hand.Off.Documentation.pdf)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 👨‍🏫 Admin Features
- View full roster of registered students
- Generate student groups based on availability
- Manually adjust group assignments
- Remove or reassign students from groups
- Regenerate groups when needed
- Add tasks and links to weekly agendas

## 🎓 Student Features
- Select weekly availability in hourly time slots
- Choose meeting preference (online or in-person)
- View assigned group members after matching
- Edit personal profile information

## ⚙️ Getting Started

1. Install dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Run the development server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```
3. Open your browser and go to:
👉 [http://localhost:3000](http://localhost:3000)

4. Once deployed, go to [https://anatwithme.org/](https://anatwithme.org/)

## 🗄️ Supabase Setup for Local Testing

If you are testing locally and your Supabase database is empty, the app will fail with errors such as `Could not find the table 'public.profile' in the schema cache`.
> ⚠️ **WARNING:** The provided SQL script is not meant for the production environment, only local testing. It is destructive.

1. Copy `.env.local.example` to `.env.local`.
2. Fill in your Supabase project values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
3. Open the Supabase SQL editor for your project.
4. Run `supabase-schema.sql` from the repo root to create the required tables and seed time slots.
5. In your Supabase project, go to "Authentication" -> "Sign In / Providers" -> "User Signups" and Disable `Confirm email` if not already disabled.

This project does not auto-create the database schema on first run, so the SQL file is required for a fresh Supabase project. 

## 🧱 Project Structure
- app/page.tsx        # Main landing page
- app/layout.tsx      # Root layout
- components/       # Reusable UI components
- public/           # Static assets
- lib/              # Admin, matching structure + Supabase access

## 🎨 Tech Stack
- Next.js (App Router)
- React
- TypeScript
- next/font (Geist font optimization)
- Vercel (deployment)
- Supabase
- Tailwind
- Radix
- shadcn
