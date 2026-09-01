# 🪙 MoneyBot (Luka)

MoneyBot is an intelligent, conversational personal finance assistant designed to eliminate the friction of tracking expenses. Instead of navigating through complex forms, users simply text their AI assistant via Telegram (e.g., *"I just spent 30k on pizza using Nequi"*), and the system automatically categorizes, records, and updates the financial dashboard in real-time.

## 🚀 Features

- **🧠 AI-Powered Telegram Bot**: Integrated with Google's **Gemini 3.6 Flash**. The bot understands natural language, extracts financial intents (income, expense, transfers, debts, savings), infers categories, and maintains conversational memory to ask for missing information if a transaction is incomplete.
- **⚡ Real-Time Web Dashboard**: A Progressive Web App (PWA) built with Next.js. Thanks to **Supabase Realtime (WebSockets)**, the dashboard updates instantly the millisecond the Telegram bot processes a transaction—no page refresh required.
- **🎨 Neo-Skeuomorphic & Glassmorphic UI**: A stunning, highly polished user interface featuring multiple dynamic themes, smooth page transitions, dynamic CSS variables, and dynamically generated PWA icons using Next.js `ImageResponse`.
- **📊 50/30/20 Budgeting**: Automatically calculates and tracks your financial health based on the 50/30/20 rule (Needs, Wants, Savings).
- **🤝 Debt & Savings Tracking**: Keep track of who owes you money, who you owe, and visualize your progress towards custom savings goals.
- **📱 Fully Installable PWA**: Can be installed on iOS, Android, and Desktop as a native app with a custom dynamic theme-color status bar.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, `next-themes`, Framer Motion (for transitions).
- **Backend**: Next.js API Routes (Serverless Functions for the Telegram Webhook).
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL) + Supabase Realtime.
- **AI Engine**: Google Generative AI (`@google/generative-ai`).
- **Memory/Caching**: [Upstash Redis](https://upstash.com/) (for high-speed conversational context across webhook stateless requests).
- **Hosting**: Vercel.

## 💡 Architecture Highlights

1. **Intelligent Webhook Routing**: The `/api/telegram/webhook` endpoint receives messages, checks Redis for recent conversational context, and passes a strict JSON Schema to Gemini. Gemini acts as an NLP router, returning a structured JSON object detailing the exact database mutations required.
2. **Server-Side Math Optimization**: Financial aggregates (Net Worth, Liquidity, Category Spend) are calculated server-side in a single pass to ensure high performance and zero client-side layout shift.
3. **Cross-Platform Sync**: By leveraging Supabase's PostgreSQL replication channels, any change made by the Serverless Webhook is immediately broadcasted to any active client browsers, ensuring the UI is always perfectly in sync with the database state.

## 📸 Sneak Peek
*(If you are a recruiter, feel free to ask me for a live demo or access to the deployed application!)*

---
*Personal Project by Miguel.*
