---
applyTo: "**/*.{css,scss,less,js,jsx,ts,tsx,html}"
---

# finance-app-design.instructions.md

You are designing an AI-powered Household Finance application that helps users:

- Scan and upload receipts
- Track expenses
- Analyze spending behavior
- View financial dashboards
- Interact with an AI financial assistant

The application should feel like a modern fintech product inspired by:

- Revolut
- N26
- Monzo
- Stripe Dashboard
- Google Finance

The experience should be:

- Professional
- Data-focused
- Trustworthy
- Mobile-first
- Accessible
- Fast and intuitive

---

# Design Goals

## Primary Goals

- Financial information should be immediately understandable
- Important numbers should stand out
- Receipt capture should be frictionless
- Analytics should be easy to interpret
- AI interactions should feel helpful and reliable

---

# Hard Constraints

## Must Follow

- No emojis in production UI
- No flashy illustrations
- No glassmorphism
- No neon colors
- No gradient branding
- No cluttered dashboards
- No decorative animations

Use a clean and professional financial software aesthetic.

---

# Visual Language

## Brand Personality

The application should feel:

- Trustworthy
- Modern
- Intelligent
- Professional
- Calm

Users should feel confident storing financial information.

---

# Color Palette

Use a neutral palette with restrained accents.

## Backgrounds

- White
- Off-white
- Light gray surfaces

## Primary Text

- Near black
- High contrast

## Secondary Text

- Medium gray

## Borders

- Light gray
- Thin dividers

## Accent Color

Use a single primary accent.

Examples:

- Blue
- Navy Blue
- Teal

The accent color should represent actions, links and active states.

---

# Semantic Colors

Required semantic colors:

## Success

Used for:

- Savings
- Positive trends
- Budget achievements

Green tones only.

---

## Warning

Used for:

- Budget limits
- Spending increases

Amber tones only.

---

## Error

Used for:

- Processing failures
- Validation messages

Red tones only.

---

# Typography

Use modern system fonts.

Examples:

- Inter
- System UI stack

Hierarchy:

## KPI Values

Largest typography.

Examples:

€1240

€15,840

Should immediately draw attention.

---

## Page Titles

Bold and prominent.

Examples:

Dashboard

Analytics

AI Assistant

---

## Section Titles

Medium weight.

Used for:

- Recent Expenses
- Spending Trends
- Budget Overview

---

## Body Text

Readable and uncluttered.

Use comfortable line heights.

---

# Layout

## Mobile First

Design mobile before desktop.

Primary mobile actions:

- Capture receipt
- Upload receipt
- View expenses
- Ask AI questions

---

## Mobile Navigation

Use bottom navigation.

Tabs:

- Dashboard
- Scan
- Analytics
- AI Assistant
- Settings

Navigation should always remain reachable with one hand.

---

## Desktop Navigation

Use left sidebar navigation.

Structure:

Sidebar
+
Header
+
Content Area

---

# Dashboard Design

The dashboard is the application's homepage.

Use this hierarchy.

## First Section

KPI cards.

Display:

- Monthly Spending
- Annual Spending
- Average Monthly Spend
- Budget Status

---

## Second Section

Spending trends.

Examples:

- Monthly trend chart
- Weekly comparison
- Spending breakdown

---

## Third Section

Recent expenses.

Display latest transactions.

---

## Fourth Section

AI-generated insights.

Examples:

"Your grocery spending increased by 12%."

"Restaurant expenses decreased by 8%."

---

# Cards

Cards should:

- Use subtle borders
- Have small-to-medium radius
- Use minimal shadows
- Display clear hierarchy

Avoid oversized dashboard cards.

---

# Receipt Experience

Receipt upload is a primary workflow.

The UI should support:

- Camera capture
- File upload
- Drag-and-drop on desktop

---

## Processing States

Show clear progress.

Examples:

Uploading

Processing OCR

Extracting Data

Saving Expense

---

## Review Screen

Before saving:

Display extracted:

- Merchant
- Total
- Date
- Category
- Receipt Items

Allow editing AI-generated values.

Never save automatically without confirmation.

---

# Analytics Design

Analytics should feel similar to modern financial products.

Use:

- Line charts
- Bar charts
- Pie charts
- Category breakdowns

Avoid:

- 3D charts
- Decorative visualizations

---

## Chart Requirements

All charts must:

- Be responsive
- Support dark mode
- Display tooltips
- Support keyboard accessibility

---

# AI Assistant Experience

The AI assistant is a Finance Copilot.

The assistant should feel:

- Intelligent
- Helpful
- Analytical

Never feel like a generic chatbot.

---

## Assistant Layout

Chat interface should include:

- Conversation history
- Suggested questions
- Follow-up prompts
- Loading states

---

## Example Suggestions

How much did I spend this month?

Compare my last three months.

What are my highest expenses?

Where can I save money?

---

# Forms

Use Angular Material form controls.

Requirements:

- Visible labels
- Validation messages
- Helper text
- Accessible focus states

Never use placeholder-only labels.

---

# Empty States

Empty states should be helpful.

Examples:

No receipts uploaded.

Upload your first receipt to begin tracking expenses.

No spending history available.

Start recording expenses to view analytics.

Avoid playful messaging.

Avoid emojis.

---

# Micro Interactions

Use subtle interactions only.

Examples:

- Hover states
- Focus states
- Small fades
- Small scale transitions

Preferred duration:

100ms–200ms

Avoid excessive motion.

---

# Accessibility

All UI must meet WCAG AA standards.

Requirements:

- Keyboard navigation
- Visible focus rings
- Semantic HTML
- Proper labels
- Sufficient color contrast
- Screen reader support

---

# Dark Mode

All features must support:

- Light Theme
- Dark Theme

Never hardcode colors that prevent theme switching.

Use theme tokens consistently.

---

# Component Library

Build reusable components.

Examples:

- KPI Card
- Expense Card
- Receipt Card
- Analytics Card
- Empty State
- Loading State
- Chart Container
- Assistant Message
- Assistant Suggestions
- Page Header
- Bottom Navigation

Avoid duplicated layouts.

---

# Design Tokens

Create reusable tokens for:

- Colors
- Typography
- Spacing
- Radius
- Shadows
- Animation durations

Never hardcode repeated values.

---

# Do

- Design for mobile first
- Highlight important financial metrics
- Prioritize readability
- Make dashboards easy to scan
- Keep interactions predictable
- Build reusable components

---

# Don't

- Use emojis
- Use gradients as branding
- Use heavy shadows
- Use glassmorphism
- Use neon colors
- Create cluttered dashboards
- Add decorative animations
- Sacrifice usability for visual effects

---

# When In Doubt

Choose:

- Clarity over decoration
- Usability over creativity
- Data readability over visual complexity
- Financial professionalism over trendy UI patterns
- Reusable components over custom one-off designs