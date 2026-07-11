# Backend Rules

## Overview

The backend is built using:

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions
- OpenAI APIs

The architecture should remain serverless-first.

Avoid introducing a dedicated backend server unless absolutely necessary.

---

# Primary Responsibilities

The backend handles:

- Authentication
- User management
- Receipt storage
- OCR processing
- Expense storage
- Analytics queries
- AI assistant functions

---

# Authentication

Use Supabase Authentication.

Supported methods:

- Email/Password
- Magic Link
- Google Login (future)

Requirements:

- All user data must be isolated.
- Row Level Security (RLS) must be enabled.
- Users should only access their own records.

Never trust frontend authorization checks.

Always enforce authorization using database policies.

---

# Database

Use PostgreSQL.

Database schema must support future expansion.

## Users

Use Supabase auth.users.

Never duplicate authentication data.

Store profile information separately.

Example:

profiles

- id
- email
- first_name
- last_name
- avatar_url
- created_at

---

## Receipts

receipts

- id
- user_id
- image_url
- merchant_name
- receipt_date
- total_amount
- currency
- processing_status
- created_at

---

## Receipt Items

receipt_items

- id
- receipt_id
- item_name
- quantity
- unit_price
- total_price
- category_id

---

## Categories

categories

- id
- name
- icon
- color

Examples:

- Groceries
- Restaurant
- Transport
- Utilities
- Healthcare
- Shopping

---

## Expenses

expenses

- id
- user_id
- receipt_id
- category_id
- amount
- expense_date
- merchant_name
- notes

---

## AI Conversations

ai_conversations

- id
- user_id
- created_at

---

## AI Messages

ai_messages

- id
- conversation_id
- role
- content
- created_at

---

# Storage

Use Supabase Storage.

Buckets:

receipt-images

Store:

- jpg
- jpeg
- png
- pdf

Folder structure:

receipt-images/{userId}/{receiptId}

Never expose private storage publicly.

Use signed URLs.

---

# Receipt Processing Pipeline

Workflow:

Upload Receipt
      |
      v
Storage Bucket
      |
      v
OCR Extraction
      |
      v
AI Structured Parsing
      |
      v
User Review
      |
      v
Database Save

---

# OCR Requirements

Supported files:

- JPG
- PNG
- PDF

The OCR layer must extract:

- Merchant
- Date
- Item lines
- Totals
- Currency

The system must gracefully handle OCR failures.

Store raw OCR text for troubleshooting.

---

# AI Extraction

The AI model converts OCR output into structured JSON.

Example:

{
  "merchant": "Aldi",
  "date": "2026-07-11",
  "currency": "EUR",
  "totalAmount": 24.99,
  "items": [
    {
      "name": "Milk",
      "price": 2.49
    }
  ]
}

The AI must always return valid JSON.

Avoid free-text responses during extraction.

---

# Analytics

Provide reusable aggregation functions.

Examples:

- monthly spending
- yearly spending
- category spending
- average daily spending
- spending trends

All calculations should be performed in SQL whenever possible.

Avoid large client-side aggregations.

---

# Edge Functions

Use Edge Functions for:

- OCR orchestration
- OpenAI integration
- Receipt processing
- AI assistant tools

Do not call OpenAI directly from Angular.

OpenAI keys must remain server-side.

---

# API Design

Create service layers.

Examples:

ReceiptService

- uploadReceipt()
- processReceipt()
- getReceipt()
- getReceipts()

ExpenseService

- createExpense()
- updateExpense()
- deleteExpense()
- getExpenses()

AnalyticsService

- getMonthlySpend()
- getYearlySpend()
- getCategoryBreakdown()

AssistantService

- askAssistant()

---

# Security

Mandatory:

- Row Level Security
- Input validation
- Rate limiting
- Signed URLs
- Secure environment variables

Never expose:

- service-role keys
- OpenAI secrets
- internal database credentials

---

# Performance

Always:

- paginate results
- use indexes
- use optimized SQL queries
- avoid N+1 queries

Large receipt histories must support:

- filtering
- sorting
- pagination

---

# Monitoring

Track:

- OCR failures
- AI failures
- Edge Function errors
- Storage usage
- API latency

Log errors in a structured format.

---

# Future Features

The backend architecture should support:

- Multiple currencies
- Shared family accounts
- Budgets
- Savings goals
- Subscription tracking
- AI recommendations
- Bank integrations
- Investment tracking

Design with extensibility in mind.