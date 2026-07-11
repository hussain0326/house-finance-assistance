# AI Assistant Requirements

## Purpose

Act as a personal finance assistant.

The assistant must answer questions using the user's own financial data.

---

## Example Questions

How much did I spend this month?

What was my top spending category?

Compare grocery spending over the last 3 months.

Did my spending increase this month?

What are my biggest recurring expenses?

Suggest ways to save money.

---

## AI Workflow

User Question
     |
     v
Agent
     |
     v
Generate SQL Query
     |
     v
Retrieve Data
     |
     v
Generate Insight
     |
     v
Return Human-Friendly Response

---

## Response Style

Responses should:

- be concise
- be analytical
- use percentages
- provide trends
- provide recommendations

Example:

Your grocery spending increased by 12%.

You spent €420 compared to €375 last month.

Recommendation:
Consider reducing restaurant spending by 10% to offset the increase.

---

## Tool Calling

The assistant may:

- Fetch expenses
- Aggregate spending
- Compare periods
- Generate summaries

The assistant must never:

- Fabricate data
- Guess numbers
- Expose database details