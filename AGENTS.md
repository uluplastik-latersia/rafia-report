<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# APLIKASI STOK RAFIA UPL - Developer & AI Agent Context

## 1. Application Flow & Architecture
This is a modern **Next.js (App Router)** application designed for recording production (inbound), managing inventory, and handling sales (outbound) of rafia strings.
- **Tech Stack**: Next.js 15+, Tailwind CSS v4, SQLite/LibSQL (via `@libsql/client`), React 19.
- **Database**: Uses SQLite/LibSQL (Turso compatible). Queries are typically handled via Server Actions in `src/actions/` or `src/db/`.
- **Key Routing Modules**:
  - `/src/app/shift`: Inbound production entry (per shift).
  - `/src/app/outbound`: Sales/outbound processing.
  - `/src/app/ringkasan`: Shift summaries and WhatsApp report generation.
  - `/src/app/laporan-bulanan`: A4-printable monthly production reports.
  - `/src/app/insight-mesin`: Analytics for daily top production & afalan per machine.
  - `/src/app/arsip-penjualan`: Archive for past sales.

## 2. Branching Strategy & Git Flow
- **Active Branch**: `main`
- **Commit Convention**: Commits strictly follow conventional commits format (`feat:`, `fix:`, `style:`, `chore:`, `refactor:`).
- All new features and bug fixes are committed directly to `main`. 

## 3. PWA Implementation & Recent Updates
The application is a Progressive Web App (PWA) configured for mobile and desktop standalone use.
- **Library Used**: `@serwist/next` (v9.5+). **Do NOT use the deprecated `next-pwa` package**.
- **Manifest**: Configuration is generated dynamically via `src/app/manifest.ts` (not a static `.json`). 
- **Recent PWA Updates**:
  - `manifest.ts` display mode is set to `standalone` to enforce fullscreen behavior on Android Chrome.
  - Icons are configured with `purpose: 'maskable'` for native-like Android icons.
  - Resolved TypeScript type errors on Next.js 16/15+ manifest metadata purpose.

## 4. Development Rules for AI Agents
1. **Next.js App Router**: Always use Server Components by default. Only add `"use client"` directive when interactivity (hooks, state, browser APIs) is required.
2. **PWA Constraints**: When modifying PWA behavior, modify `@serwist/next` configuration or `src/app/manifest.ts`. Do not introduce old service worker implementations.
3. **Styling**: Uses Tailwind CSS v4. Prioritize mobile-first responsive design (`md:`, `lg:`, `print:`). Note that recent UI updates maximized horizontal screen estate for desktop landscape views—maintain this dual compatibility.
4. **Dates and Timezones**: Use the internal `parseWkt` helper or `date-fns` for consistent Asia/Jakarta timezone formatting, especially in printable reports and WhatsApp copies.
5. **Print Layouts**: Pages like monthly reports and summaries use specific `@media print` CSS classes (e.g., `print:hidden`, `print:block`, `print:text-black`). Ensure print formatting remains intact when modifying UI.
