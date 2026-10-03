# 💰 Money Monitor

Track your expenses in real time, set budgets, and get **free AI advice** on how to spend better and save more.
Download a **PDF report every month** and an **annual PDF report** with AI suggestions for the next year.

- **Backend:** Spring Boot 3.4 (Java 17), Spring Security + JWT, JPA/H2, WebSocket (STOMP), OpenPDF
- **Frontend:** Angular 19 (standalone components + signals), Chart.js, STOMP.js, "Neon Glass" design system (dark & light)
- **Mobile:** iOS & Android apps built from the same code with Capacitor 7

---

## 🚀 Quick start

You need **Java 17+**, **Maven**, **Node 20+** and the **Angular CLI** (all already installed on this machine).

```bash
# 1. Backend  → http://localhost:8080
cd backend
mvn spring-boot:run

# 2. Frontend → http://localhost:4200   (in a second terminal)
cd frontend
npm install        # first time only
npm start
```

Or double-click **`start.bat`** to launch both in separate windows.

Open **http://localhost:4200** and sign in with a ready-made account:

| Role  | Email                       | Password    |
|-------|-----------------------------|-------------|
| Admin | `admin@moneymonitor.local`  | `Admin@123` |
| User  | `demo@moneymonitor.local`   | `Demo@123`  |

The demo user comes with realistic expenses since January, so every chart, budget and report has data.
You can also create your own account on the **Create account** page.

---

## 📲 iPhone / Android with Expo Go (no Mac needed)

`mobile/` is a separate **React Native (Expo)** version of the user app, so you can test it on an iPhone with
**Expo Go** instead of building with Xcode. It has every user screen: dashboard with charts, expenses, income,
budgets, categories, AI advisor + Penny chat, PDF reports (share sheet), notifications, profile, dark/light theme
and live updates. Admin screens remain web-only; admins can still sign in and use the user screens.

1. Install **Expo Go** from the App Store on the iPhone.
2. Start the backend (`cd backend && mvn spring-boot:run`).
3. In a second terminal:
   ```powershell
   cd mobile
   npm install     # first time only
   npx expo start
   ```
4. Scan the QR code with the iPhone **Camera** app; it opens in Expo Go. Sign in with the demo account.

The phone and the PC must be on the **same Wi-Fi**. The app finds the backend automatically: it uses the same IP
the QR code points to, on port 8080. To use a different address, tap **🛰 Server** on the sign-in screen.

**Windows firewall:** the first time `expo start` runs, Windows asks whether to allow Node.js. Tick **Public**
networks too if your Wi-Fi is marked Public, otherwise the phone can't load the app. Java (the backend, port 8080)
needs the same permission.

**PC with several network adapters (VMware, VirtualBox…):** if the QR code shows an IP that isn't your Wi-Fi
adapter's (check with `ipconfig`), start Expo with that IP:
```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "10.0.0.153"   # your Wi-Fi IPv4 address
npx expo start
```

**Check the backend from the PC** (logs in, calls the API, tests live updates over WebSocket and the PDF download):
`node mobile/scripts/smoke-test.mjs http://<your-wifi-ip>:8080`

**Password reset on the phone:** reset emails link to the web app. On the phone, use **Forgot password →
I have a reset token** and paste the link (or just the token after `token=`).

---

## 📱 Mobile apps (iOS & Android)

The mobile apps are the **same Angular app** packaged with [Capacitor](https://capacitorjs.com), so web, iOS and
Android share one design system and one codebase. On phones you get a native-style UI: floating glass tab bar,
a glowing ＋ button, bottom sheets, haptic feedback, safe-area support, a splash screen and a launcher icon,
and PDF/CSV reports open the native **Save / Share** sheet.

The native projects are already generated in `frontend/android` and `frontend/ios`.

### Android APK without Android Studio (Windows)
A ready-to-install **`MoneyMonitor.apk`** is in the project root. To rebuild it (after code changes, or when your
PC's IP changes), put your Wi-Fi IP in `frontend/src/app/core/build-config.ts` and run:
```powershell
powershell -ExecutionPolicy Bypass -File build-apk.ps1
```
It uses the Android SDK and JDK 21 installed in `C:\Users\<you>\android-tools`.
To install it on the phone: copy the APK over → open it → allow "Install unknown apps" → **Install**.

### Android (Windows, macOS or Linux)
1. Install **[Android Studio](https://developer.android.com/studio)** (it includes the Android SDK and an emulator).
2. Start the backend (`cd backend && mvn spring-boot:run`).
3. Build and open the project:
   ```bash
   cd frontend
   npm run android        # ng build + cap sync + opens Android Studio
   ```
4. In Android Studio press ▶ **Run** (emulator or a USB-connected phone with developer mode on).
   To get an installable file use **Build ▸ Build APK(s)**.

### iOS (requires a Mac with Xcode)
```bash
cd frontend
npm install
npm run ios            # ng build + cap sync + opens Xcode
```
Select a simulator or your iPhone and press ▶. (Apple doesn't allow building iOS apps on Windows.)

### Connecting the app to your backend
| Where the app runs | Server address |
|---|---|
| Android emulator | `http://10.0.2.2:8080` (automatic) |
| iOS simulator | `http://localhost:8080` (automatic) |
| Real phone | Your computer's Wi-Fi IP, e.g. `http://192.168.1.20:8080` |

On a real phone, tap **🛰 Server** on the sign-in screen and enter your computer's IP (find it with `ipconfig`).
The phone and computer must be on the same Wi-Fi, and Windows Firewall must allow Java on port 8080.

### Quick test without building an app
Run `npm run start:lan` in `frontend`, then open `http://<your-computer-ip>:4200` in your phone's browser.
You get the same mobile UI, and you can **Add to Home screen** to install it like an app.

### After changing the web code
```bash
npm run mobile:build   # rebuilds the web app and copies it into both native projects
```
To regenerate the app icon and splash screen from `frontend/assets/`, run `npm run mobile:assets`.

> **Before publishing to the stores:** serve the backend over **HTTPS**, then remove the development-only plain-HTTP
> permissions (`android:usesCleartextTraffic` in `android/app/src/main/AndroidManifest.xml`, `NSAllowsArbitraryLoads`
> in `ios/App/App/Info.plist`, and `cleartext` / `allowMixedContent` in `capacitor.config.ts`).

---

## ✨ Enabling the free AI advisor

The app always works. Without an AI key it uses a **built-in rule-based advisor** (50/30/20 rule, budgets, trends).
For real AI (monthly insights, year-end review and the chat coach), pick **one** free option and set
these environment variables before starting the backend:

| Provider | Cost | How to get it | Variables |
|---|---|---|---|
| **Groq** (recommended, very fast) | Free tier | Create a key at https://console.groq.com/keys | `AI_PROVIDER=groq` `AI_API_KEY=gsk_...` |
| **Google Gemini** | Free tier | Create a key at https://aistudio.google.com/apikey | `AI_PROVIDER=gemini` `AI_API_KEY=...` |
| **OpenRouter** | Free models | https://openrouter.ai/keys | `AI_PROVIDER=openrouter` `AI_API_KEY=...` |
| **Ollama** (100% local, offline) | Free | Install https://ollama.com then run `ollama pull llama3.2` | `AI_PROVIDER=ollama` (no key) |

Windows PowerShell example:

```powershell
$env:AI_PROVIDER="groq"; $env:AI_API_KEY="gsk_your_key_here"
cd backend; mvn spring-boot:run
```

Optional: `AI_MODEL` overrides the default model (e.g. `llama-3.1-8b-instant`, `gemini-2.0-flash`, `qwen2.5`),
and `AI_BASE_URL` points to any other OpenAI-compatible server.
The **AI Advisor** page shows which engine is active. If an AI call fails (no internet, rate limit), the app
automatically falls back to the rule-based advisor.

---

## 📄 Features

**Public pages:** landing page · sign in · create account (password strength meter) · forgot password · reset password · 404

**User**
- **Dashboard:** income, expenses, balance, savings rate and goal progress, 6-month income vs expenses chart,
  category doughnut, daily and cumulative spending, budget progress, recent expenses, AI insight
- **Expenses:** add, edit and delete; search; filter by category; export to CSV; quick "Add expense" button on every page
- **Income:** salary and other income (drives the real savings rate)
- **Budgets:** overall and per-category monthly limits, copy from last month, alerts at 80% and 100%
- **Categories:** 14 defaults plus your own (icon, colour, essential vs non-essential)
- **Goals:** savings objectives such as "5,000 in 10 months": progress from the deposits you record (or, until you record one,
  estimated from income minus expenses of each complete month), money needed per month, on-track / at-risk status,
  a notification when reached, and an **AI plan** that uses your income and spending to show how to get there
- **AI Advisor:** monthly review, year in review, a **savings plan** for your monthly savings goal (cuts per category,
  weekly spending allowance), and a chat coach that knows your numbers and goals
- **Reports:** monthly PDF (KPIs, daily chart, categories, budgets, every expense, AI advice) and
  annual PDF (month-by-month table and chart, category totals, details per month, AI suggestions for next year)
- **Notifications:** budget alerts, "your report is ready" on the 1st of each month (and on January 1st for the annual report)
- **Profile:** name, currency, expected income, savings goal, password change, dark mode, **language**

### 🌐 Languages
English, French, Arabic (right-to-left layout), Spanish and Italian, on the web app and the mobile app.
The language is saved on the account, so the web app, the phone and the AI advisor all follow it, and the AI
(and the offline advisor) answers in that language. Notifications are sent in the user's language too.
PDF reports and error messages coming from the server are in English.

Translation files:
- mobile/src/i18n/*.ts: shared texts (the Expo app uses them as they are).
- rontend/src/app/i18n/*.ts: a copy of the shared texts, plus web-*.ts for web-only pages (landing, admin…).
  **When you change a shared text, update both copies.** TypeScript fails the build if a language misses a key.
- ackend/src/main/resources/i18n/messages_*.properties: offline advisor and notifications.

**Admin**
- **Overview:** users, active accounts, registrations chart, monthly volume, AI and real-time status
- **Users:** search and filter, enable or disable accounts (a disabled user is signed out instantly), promote to admin, delete a user and all their data

### 🚀 Performance
- The dashboard trend, budgets and admin user list use grouped SQL queries instead of one query per month, budget or user.
- Expense lists load their categories in the same query.
- JSON responses are gzip-compressed (faster on phones).
- AI texts are cached per user, period and language in the i_insights table and only regenerated when your data changes.

### ⚡ Real time
The browser keeps a WebSocket (STOMP) connection open (the **Live** badge in the top bar).
When you add, edit or delete anything, all your open tabs and devices update instantly: dashboard, lists,
budgets and notifications. Budget alerts pop up the moment you cross 80% or 100%, and admins see new
registrations and account changes live.

### 🔐 Forgot password
The reset link is valid for 30 minutes and can be used once. **Locally, without an email server, the link is printed in
the backend console.** To send real emails, set `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`
(for example Gmail with an app password: `smtp.gmail.com`, port `587`).

---

## ⚙️ Configuration

All settings are in `backend/src/main/resources/application.yml` and can be overridden with environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL` / `AI_BASE_URL` | `groq` / empty | AI advisor (see above) |
| `JWT_SECRET` | dev value | **Change it** for anything beyond local use (≥ 32 characters) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@moneymonitor.local` / `Admin@123` | First admin account |
| `MAIL_*` | empty | SMTP for password-reset emails |

**Database:** a file-based H2 database is created in `backend/data/` (nothing to install; data survives restarts).
Browse it at http://localhost:8080/h2-console (JDBC URL `jdbc:h2:file:./data/moneymonitor`, user `sa`, no password).
To start fresh, stop the backend and delete `backend/data/`.
To use **MySQL** instead: `mvn spring-boot:run -Dspring-boot.run.profiles=mysql` (set `DB_USERNAME` and `DB_PASSWORD`).

---

## 🗂️ Project structure

```
backend/src/main/java/com/moneymonitor/
├── ai/            AiClient (OpenAI-compatible: Groq/Gemini/OpenRouter/Ollama), RuleBasedAdvisor, AiAdvisorService
├── config/        App properties, WebSocket/STOMP + JWT auth, data seeding
├── controller/    REST API (auth, profile, finance, AI, reports, admin)
├── domain/        JPA entities (User, Expense, Income, Category, Budget, Notification, AiAdvice…)
├── dto/           Request/response records with validation
├── report/        PDF generation (OpenPDF): monthly and annual reports with charts
├── security/      JWT service + filter, Spring Security config (roles USER / ADMIN)
└── service/       Business logic, real-time events, budget alerts, monthly report scheduler

frontend/src/app/
├── core/          Auth, API client, real-time (STOMP) service, guards, interceptor, models
├── layout/        App shell (sidebar, top bar, notifications, live indicator)
├── shared/        Chart, modal, month picker, expense form, pipes (money, markdown…)
└── pages/         public/ (landing, auth pages) · user/ (dashboard, expenses…) · admin/

mobile/src/                Expo (React Native) app for Expo Go
├── app/           Screens (expo-router): (auth)/ sign-in pages · (tabs)/ Home, Expenses, ＋, AI, More · forms
├── api/           fetch client (JWT, errors), endpoints, models, PDF/CSV sharing
├── auth/          Session (token in the iOS Keychain via SecureStore)
├── realtime/      STOMP live updates → React Query refreshes
├── components/    UI kit, SVG charts, month picker, markdown, toasts
└── theme/         Neon Glass colours (dark + light)
```

### Main API endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register`, `/login`, `/forgot-password`, `/reset-password` | Authentication |
| GET | `/api/dashboard?month=2026-09` | Dashboard data |
| GET/POST/PUT/DELETE | `/api/expenses`, `/api/incomes`, `/api/categories`, `/api/budgets` | CRUD |
| GET | `/api/ai/advice/monthly?month=`, `/api/ai/advice/yearly?year=` | AI advice (cached; `refresh=true` regenerates it) |
| POST | `/api/ai/chat` | AI chat coach |
| GET | `/api/reports/monthly?month=`, `/api/reports/yearly?year=` | PDF downloads |
| GET/PATCH/DELETE | `/api/admin/stats`, `/api/admin/users/{id}/status`, `/role` | Admin (role ADMIN) |
| WS | `ws://localhost:8080/ws` → `/user/queue/events`, `/topic/admin` | Real-time events |
