# Architecture

## High Level Architecture

Angular PWA
      |
      |
      v
Supabase
├── Auth
├── PostgreSQL
├── Storage
└── Edge Functions
      |
      v
OpenAI APIs

---

## Main Modules

### Authentication

Responsibilities:
- Login
- Registration
- Password reset
- Session management

---

### Receipt Processing

Responsibilities:
- Upload receipt image
- OCR extraction
- LLM data extraction
- User confirmation
- Save record

---

### Expense Management

Responsibilities:
- CRUD operations
- Categorization
- Tagging
- Search

---

### Analytics

Responsibilities:
- Spending trends
- Category breakdowns
- Daily comparisons
- Monthly reports

---

### AI Assistant

Responsibilities:
- Query expense data
- Financial insights
- Recommendations
- Trend analysis

---

## Database Tables

users

receipts

expenses

categories

expense_tags

chat_history

assistant_conversations