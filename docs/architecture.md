# Architecture Guide

## Purpose

ExpenseIntel separates browser and native-shell concerns from privileged data-processing work. Angular owns the user interface, Ionic provides mobile-oriented UI primitives, and Capacitor packages the same build for Android and iOS. Supabase owns authentication, Row Level Security (RLS), storage, PostgreSQL functions, and server-side Edge Functions.

## Boundaries

| Layer | Responsibility | Must not contain |
| --- | --- | --- |
| Angular/Ionic client | UI, form validation, routing, data presentation, authenticated Supabase calls | Service-role keys, OpenAI keys, authorization decisions |
| Capacitor native shell | Android/iOS packaging, device camera access, deep-link delivery | Authorization decisions or backend secrets |
| Supabase PostgreSQL | Persisted finance data, reporting RPCs, RLS enforcement | Trust in client-side user IDs |
| Supabase Storage | Private receipt files and signed URL access | Public receipt buckets |
| Edge Functions | OCR/AI requests, receipt processing, exchange-rate refresh, assistant orchestration | Unscoped data access or client-provided identity trust |

## Request Flows

### Receipt processing

1. The signed-in user uploads a file to the private `receipt-images` storage bucket.
2. The Angular client invokes `process-receipt` with the stored receipt reference.
3. The Edge Function verifies the caller, reads the private file, and asks OpenAI for structured extraction.
4. The function applies deterministic category and country rules, retains original money values, and persists the result.
5. The client presents the extracted record for explicit review and correction.

### Native mobile delivery

1. `npm run build` produces the Angular/Ionic web bundle in `dist/expense-intel/browser`.
2. `npm run android:sync` or `npm run ios:sync` copies that bundle into the corresponding Capacitor project.
3. Android Studio or Xcode builds, signs, and runs the native shell.
4. On native platforms, the receipt page calls Capacitor Camera and converts the returned image to a standard browser `File` before using the same Supabase upload service as the web app.
5. Supabase email confirmation and recovery links use `expenseintel://auth`; Capacitor forwards the link to the Angular auth route, where the client stores the returned session.

### Analytics and assistant

1. The client requests user-scoped reporting RPCs for dashboard, history, and analytics views.
2. PostgreSQL applies RLS and returns data in the account's configured reporting currency.
3. The AI assistant Edge Function validates the caller, queries scoped reporting data, and returns a grounded response.

## Security Model

- Supabase Auth establishes identity; Angular route guards improve navigation but never replace database authorization.
- RLS must be enabled for user-owned tables and policies must constrain rows to `auth.uid()`.
- Receipt objects remain private. The app should use signed URLs only when a user needs access.
- Browser code uses only the Supabase publishable key. `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remain Edge Function secrets.
- Capacitor projects contain no backend secrets. The native callback URL `expenseintel://auth` must be listed in the Supabase Auth redirect allow-list alongside web callback URLs.
- Receipt data and assistant prompts are sensitive. Avoid logging document contents, tokens, or customer data in the client and Edge Functions.

## Testing Strategy

The frontend uses Jasmine and Karma unit tests. Specs live next to the code they cover and currently exercise:

- authentication service behavior and protected-route decisions;
- Supabase configuration handling;
- dashboard and feature component creation;
- receipt upload and update error/success paths;
- AI assistant response and failure handling.

Run `npm run verify` before opening a pull request. It produces an optimized production build and executes the test suite in Chrome Headless. Database migrations and Edge Functions should be validated against a non-production Supabase project before deployment because they rely on real PostgreSQL policies, storage, and provider integrations.

## Deployment Checklist

- Apply `supabase/migrations` to the target project.
- Configure Supabase Auth redirect URLs for `<APP_URL>/auth`.
- Configure the native callback redirect URL `expenseintel://auth` for Android and iOS.
- Set client variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_URL`) in the hosting environment.
- Set Edge Function secrets separately, including `OPENAI_API_KEY`; never publish service credentials.
- Deploy Edge Functions after their dependent migration is available.
- Run `npm run verify` and confirm the production build output is `dist/expense-intel/browser`.
- Run `npm run android:sync` or `npm run ios:sync` before opening the corresponding native project in Android Studio or Xcode.