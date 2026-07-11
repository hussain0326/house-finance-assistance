# GitHub Copilot Instructions

Project: AI Household Finance Application

Tech Stack:

- Angular 20
- TypeScript
- Angular Material
- Tailwind CSS
- Supabase
- PostgreSQL
- Supabase Storage
- Supabase Edge Functions
- OpenAI
- Apache ECharts
- PWA

---

# Overall Objective

Generate clean, scalable, secure and maintainable code for an AI-powered Household Finance application.

The application allows users to:

- Upload receipts
- Capture receipts using device cameras
- Extract expense information through OCR and AI
- Track personal spending
- Visualize spending trends
- Interact with an AI-powered Financial Assistant
- Use the app on mobile and desktop devices

Prioritize:

- Maintainability
- Strong typing
- Accessibility
- Security
- Reusability
- Performance

---

# Core Engineering Principles

1. Use modern Angular patterns.
2. Use TypeScript strict mode.
3. Use Standalone Components.
4. Prefer Angular Signals for local state.
5. Use RxJS when working with asynchronous data streams.
6. Separate UI, business logic and data access.
7. Follow SOLID principles.
8. Prefer composition over inheritance.
9. Keep components focused and small.
10. Prioritize readability over clever implementations.

---

# Application Domains

The application is built around five core domains:

## Authentication

Handles:

- Login
- Registration
- Password Reset
- Session Management

---

## Receipts

Handles:

- Receipt Upload
- Receipt Storage
- OCR Processing
- AI Data Extraction
- Receipt Review

---

## Expenses

Handles:

- Expense Records
- Categories
- Tags
- Search
- Filtering

---

## Analytics

Handles:

- Monthly Spending
- Yearly Spending
- Category Analysis
- Spending Trends
- Dashboard Metrics

---

## AI Assistant

Handles:

- Financial Questions
- Spending Analysis
- Recommendations
- Expense Insights

---

# Folder Structure

Use a feature-first architecture.

```text
src/
├── app/
│
├── core/
│   ├── auth/
│   ├── services/
│   ├── interceptors/
│   ├── guards/
│   └── models/
│
├── shared/
│   ├── components/
│   ├── pipes/
│   ├── directives/
│   ├── utils/
│   └── constants/
│
├── features/
│   ├── dashboard/
│   ├── receipts/
│   ├── history/
│   ├── analytics/
│   ├── assistant/
│   └── settings/
│
├── layouts/
│
├── assets/
│
└── environments/
```

---

# Angular Standards

## Components

Always:

- Use Standalone Components.
- Use OnPush Change Detection.
- Keep components focused.
- Strongly type Inputs and Outputs.

Avoid:

- God Components
- Large template files
- Excessive logic inside templates

---

## State Management

Prefer:

- Signals
- Computed Signals
- Signal Stores

Use RxJS when:

- Working with HTTP streams
- Combining events
- Handling async workflows

Avoid unnecessary state libraries.

---

## Dependency Injection

Keep services focused on a single responsibility.

Avoid large service classes that handle unrelated concerns.

---

# Supabase Standards

## Data Access

Never access Supabase directly inside components.

Always use feature services.

Examples:

```text
receipt.service.ts
expense.service.ts
analytics.service.ts
assistant.service.ts
auth.service.ts
```

---

## Service Requirements

Services must:

- Return strongly typed models
- Handle errors consistently
- Expose clean APIs
- Hide Supabase implementation details

---

## Security

Never expose:

- Service Role Keys
- OpenAI Keys
- Private Secrets

Use Supabase Edge Functions for sensitive operations.

---

# AI Integration Standards

All OpenAI interactions must be performed through:

```text
Supabase Edge Functions
```

Never call OpenAI directly from Angular.

---

## AI Responses

Prefer structured JSON.

Example:

```json
{
  "merchant": "Aldi",
  "totalAmount": 24.99
}
```

Avoid free-text parsing when possible.

---

## AI Safety

Never trust AI responses blindly.

Validate:

- Structure
- Types
- Required Fields

before persistence.

---

# Receipt Processing Standards

Receipt workflow:

```text
Upload Receipt
        ↓
Storage
        ↓
OCR
        ↓
AI Extraction
        ↓
User Review
        ↓
Database Save
```

Always allow users to review extracted data before saving.

---

# Database Standards

Use PostgreSQL as the source of truth.

Avoid duplicated data.

Prefer:

- Foreign Keys
- Constraints
- Indexes
- Typed Models

Core tables:

```text
profiles
receipts
receipt_items
expenses
categories
ai_conversations
ai_messages
```

---

# Tailwind CSS Standards

Tailwind is the primary styling solution.

Prefer utility classes over custom CSS.

Custom CSS should only be used for:

- Design Tokens
- Theme Variables
- Third-party Overrides
- Complex Animations

Do not create component-specific CSS files unless necessary.

---

# Design Principles

Design inspiration:

- Revolut
- N26
- Monzo
- Stripe Dashboard

The application should feel:

- Professional
- Trustworthy
- Modern
- Data-focused

Avoid:

- Glassmorphism
- Neon Colors
- Heavy Gradients
- Flashy Visual Effects

---

# Responsive Design

Mobile-first always.

Breakpoints:

```text
sm
md
lg
xl
2xl
```

Primary mobile use cases:

- Scan receipts
- Upload receipts
- View spending

Primary desktop use cases:

- Analytics
- Financial review
- AI interactions

---

# Accessibility

All UI must satisfy WCAG AA requirements.

Requirements:

- Keyboard Navigation
- Visible Focus States
- Semantic HTML
- Screen Reader Support
- Color Contrast Compliance

Accessibility is mandatory.

---

# Angular Material Usage

Use Angular Material selectively.

Recommended:

- Dialogs
- Menus
- Date Pickers
- Form Controls
- Snackbar

Tailwind remains responsible for:

- Layout
- Spacing
- Visual Design

---

# Chart Standards

Use Apache ECharts.

Preferred visualizations:

- Line Charts
- Bar Charts
- Pie Charts
- Spending Trends

Avoid:

- 3D Charts
- Decorative Visualizations

---

# Testing Standards

Prioritize testing:

1. Financial Calculations
2. Analytics Logic
3. Receipt Processing
4. AI Services
5. Authentication Flows

Mock:

- Supabase
- Edge Functions
- External APIs

Avoid testing implementation details.

---

# Error Handling

Never silently ignore errors.

Provide meaningful user-friendly messages.

Bad:

```text
Something went wrong
```

Good:

```text
Receipt processing failed.

Please upload the receipt again.
```

---

# Performance Expectations

Prefer:

- Lazy-loaded Routes
- Pagination
- Optimized SQL Queries
- Efficient Change Detection

Avoid:

- Large Client-side Aggregations
- Unnecessary Network Calls

---

# Documentation Standards

All public services require TSDoc comments.

Document:

- Complex business logic
- Financial calculations
- AI workflows
- Important architectural decisions

Prefer self-documenting code where possible.

---

# Output Expectations

When generating code:

1. Follow the existing architecture.
2. Maintain strong typing.
3. Build reusable components.
4. Follow feature-first organization.
5. Use Tailwind consistently.
6. Consider responsive design.
7. Consider accessibility.
8. Consider security implications.

---

# Do

- Use Standalone Components
- Use Signals
- Create reusable components
- Use typed interfaces
- Follow feature boundaries
- Validate all external input
- Use Supabase through services
- Keep AI calls server-side

---

# Don't

- Use any without justification
- Access Supabase directly in components
- Call OpenAI directly from Angular
- Duplicate business logic
- Create oversized components
- Ignore accessibility
- Expose secrets
- Hardcode configuration values

---

# Goal

Help build a production-ready AI Household Finance platform that showcases:

- Angular Architecture
- TypeScript Expertise
- Supabase Integration
- AI Engineering
- Financial Analytics
- Responsive Design
- Accessibility
- Enterprise-grade Development Practices

while maintaining a clean, scalable, and professional codebase.