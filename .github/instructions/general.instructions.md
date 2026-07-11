---
applyTo: "**/*"
---

# General Engineering Standards

## Purpose

These instructions define the engineering standards for the AI Household Finance application.

The application must be designed as a production-quality, scalable, maintainable, and secure software product.

All implementations should prioritize:

- Maintainability
- Readability
- Accessibility
- Security
- Scalability
- Testability

---

# Core Principles

## Simplicity First

Prefer simple solutions over complex solutions.

Avoid over-engineering.

Choose the simplest implementation that:

- solves the problem
- remains maintainable
- supports future requirements

---

## Readability First

Code is read far more often than it is written.

Optimize for:

- readability
- consistency
- maintainability

Avoid clever code that requires explanation.

---

## Consistency

Follow established project patterns.

When similar functionality already exists:

- reuse it
- extend it
- do not reinvent it

Maintain a consistent code style throughout the application.

---

# Architecture Principles

## Feature First Organization

Organize code by feature rather than technology type.

Example:

```text
features/
├── auth/
├── dashboard/
    ├── pages/
    │  ├── dashboard/
    │  ├── receipts/
    │  ├── analytics/
    │  ├── assistant/
    │  ├── settings/
```