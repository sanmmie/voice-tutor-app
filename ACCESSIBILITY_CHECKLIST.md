# Voice Tutor — Accessibility Checklist

This checklist maps accessibility requirements to specific file locations in the Voice Tutor codebase. Each item is marked **Pass**, **Fail**, or **Todo** with a file:line reference.

---

## 1. Keyboard Navigation

| # | Requirement | Status | Location |
|---|-------------|--------|----------|
| 1.1 | Skip link present and functional | **Pass** | `app/layout.tsx:29-32` — Skip-to-content link with `href="#main-content"`, visually hidden until focused via CSS `.skip-link` at `app/globals.css:122-137` |
| 1.2 | Logical tab order follows DOM structure | **Pass** | `app/layout.tsx:33-35` — `<main>` wraps page content; children render in source order ensuring natural tab sequence |
| 1.3 | Focus indicators on Controls.tsx buttons | **Pass** | `components/Controls.tsx:37` and `:52` — `focus-visible:ring-2 focus-visible:ring-terminal-accent` on Start/Stop buttons |
| 1.4 | Focus indicators on AuthPanel.tsx interactive elements | **Pass** | `components/AuthPanel.tsx:129` (tabs), `:158` (email input), `:175` (password input), `:183` (eye toggle), `:220` (confirm input), `:228` (eye toggle), `:239` (submit button) |
| 1.5 | Focus indicators on VoiceTutor.tsx header buttons | **Pass** | `components/VoiceTutor.tsx:256` (chat history toggle), `:282` (new chat), `:293` (sign out) — all use `focus-visible:ring-2 focus-visible:ring-terminal-accent` |
| 1.6 | Global focus-visible ring defined | **Pass** | `app/globals.css:54-57` — `:focus-visible { outline: 2px solid #6ee7b7; outline-offset: 2px; }` with high-contrast override at `:60-65` |

---

## 2. Screen Reader Support

| # | Requirement | Status | Location |
|---|-------------|--------|----------|
| 2.1 | Semantic HTML landmarks | **Pass** | `app/layout.tsx:26-37` (`<html>`, `<body>`, `<main>`), `components/VoiceTutor.tsx:251` (`<header>`), `:326` (`<section>`), `components/ChatHistory.tsx:147` (`<aside>`), `:198` (`<ul>`/`<li>`) |
| 2.2 | Aria labels on icon-only buttons | **Pass** | `components/VoiceTutor.tsx:257` (chat history toggle), `:283` (new chat); `components/ChatHistory.tsx:167` (close), `:235` (delete); `components/AuthPanel.tsx:180` and `:225` (eye toggles) |
| 2.3 | Live regions for status and error | **Pass** | `components/StatusBar.tsx:41-43` — `role="status"` with `aria-live="polite"` (or `"assertive"` when error present), `aria-atomic="true"`. Error alert at `:59` uses `role="alert"` |
| 2.4 | Heading hierarchy correct | **Pass** | `components/AuthPanel.tsx:110` (h1), `components/VoiceTutor.tsx:272` (h1), `components/ChatHistory.tsx:162` (h2), `components/VoiceTutor.tsx:327` (h2) — single h1 per view, h2 for subsections |
| 2.5 | Descriptive link and button text | **Pass** | `components/VoiceTutor.tsx:213-215` — "Retry" button has contextual sentence "Could not check your account. You can still try signing in." |
| 2.6 | aria-hidden on main content when drawer open | **Pass** | `components/VoiceTutor.tsx:239` — `aria-hidden={chatHistoryOpen}` silences background content from assistive tech when chat history drawer is open |

---

## 3. Color Contrast

| # | Requirement | Status | Location |
|---|-------------|--------|----------|
| 3.1 | Body text vs background — target 4.5:1 (#e0e0e0 on #0a0a0f) | **Pass** | `app/globals.css:43` (background `#0a0a0f`); body text renders as approximately 88% white on near-black — ratio exceeds 15:1, well above 4.5:1 |
| 3.2 | Accent vs background — target 4.5:1 (#6ee7b7 on #0a0a0f) | **Pass** | `app/globals.css:55` (#6ee7b7 focus ring); accent text at `components/VoiceTutor.tsx:272` — mint-green on black yields approximately 13:1 ratio, passing AA and AAA |
| 3.3 | Error text contrast | **Pass** | `components/AuthPanel.tsx:161,233` and `components/VoiceTutor.tsx:211` use `text-red-400` on dark backgrounds — approximately 4.6:1, passing 4.5:1 minimum |
| 3.4 | Disabled state visibility | **Pass** | `components/Controls.tsx:39` (disabled button uses `bg-terminal-border text-terminal-muted`); `components/ChatHistory.tsx:234` (`disabled:opacity-50`) — disabled elements remain visually distinct |

---

## 4. Form Accessibility

| # | Requirement | Status | Location |
|---|-------------|--------|----------|
| 4.1 | Labels associated with inputs | **Pass** | `components/AuthPanel.tsx:142-163` (Email label wraps input), `:164-201` (Password label wraps input), `:202-234` (Confirm password label wraps input) |
| 4.2 | Error messages linked to inputs | **Pass** | `components/AuthPanel.tsx:160-162` (emailError rendered inside Email label), `:233` (confirmError inside Confirm password label), `:236` (general error uses `role="alert"`) |
| 4.3 | Required field indicators | **Pass** | `components/AuthPanel.tsx:145` (email), `:168` (password), `:207` (confirm password) — all use `required` attribute |
| 4.4 | Autocomplete attributes | **Pass** | `components/AuthPanel.tsx:147` (`autoComplete="email"`), `:172` (`autoComplete="current-password"` / `"new-password"`), `:209` (`autoComplete="new-password"`) |

---

## 5. Motion Sensitivity

| # | Requirement | Status | Location |
|---|-------------|--------|----------|
| 5.1 | prefers-reduced-motion respected | **Pass** | `app/globals.css:20-29` — Media query sets `animation-duration: 0.001ms`, `transition-duration: 0.001ms`, and `scroll-behavior: auto` for all elements when user prefers reduced motion |

---

## 6. Touch Targets

| # | Requirement | Status | Location |
|---|-------------|--------|----------|
| 6.1 | Controls.tsx buttons meet 44px minimum | **Pass** | `components/Controls.tsx:33-45,49-57` — `px-6 py-3` yields approximately 52px height, exceeding 44px |
| 6.2 | VoiceTutor.tsx header buttons meet 44px minimum | **Pass** | `components/VoiceTutor.tsx:253-270,279-289` — `w-11 h-11` equals 44px x 44px; sign-out button at `:290-296` uses `px-3 py-2` (approx. 44px) |
| 6.3 | AuthPanel.tsx eye toggles meet 44px minimum | **Todo** | `components/AuthPanel.tsx:177-186,222-231` — button uses `p-1.5` (6px padding) with a 20px icon, yielding approximately 32px total. Needs `min-w-[44px] min-h-[44px]` to meet WCAG 2.5.5 |

---

## 7. Internationalization

| # | Requirement | Status | Location |
|---|-------------|--------|----------|
| 7.1 | No hardcoded English-only assumptions | **Todo** | `app/layout.tsx:11-13` (title/description English), `components/AuthPanel.tsx:110-111` (English-only labels), `components/VoiceTutor.tsx:272` ("Voice Tutor"). No i18n framework detected. All user-facing strings are hardcoded in English |
| 7.2 | Locale-ready text patterns | **Todo** | `components/ChatHistory.tsx:24-35` (relative time uses English strings like "m ago", "h ago", "d ago") — these should use `Intl.RelativeTimeFormat` for locale-aware output |
| 7.3 | Date and number formatting | **Todo** | `components/ChatHistory.tsx:24-35` — timestamps formatted with raw arithmetic and English labels instead of `Intl.DateTimeFormat` or `Intl.RelativeTimeFormat` |

---

## 8. Testing Strategy

| # | Requirement | Status | Location |
|---|-------------|--------|----------|
| 8.1 | Keyboard-only test | **Todo** | No automated keyboard navigation test found in the project. Recommended: add Cypress/Playwright test tabbing through skip link, auth form, controls, and drawer |
| 8.2 | Screen reader test (NVDA/VoiceOver) | **Todo** | No screen reader test documented. Recommended: manual test with NVDA on Windows and VoiceOver on macOS/iOS for all major flows |
| 8.3 | Color-blind simulation | **Todo** | No color-blind simulation test found. Recommended: run Chrome DevTools rendering panel with Protanopia/Deuteranopia/Tritanopia filters; verify status indicators use shape/pattern in addition to color |
| 8.4 | Lighthouse audit — performance >90 | **Todo** | No Lighthouse CI configured. Target: performance score >90 on simulated mobile and desktop |
| 8.5 | Lighthouse audit — accessibility >95 | **Todo** | No Lighthouse CI configured. Target: accessibility score >95. Known gap: AuthPanel.tsx eye toggle touch targets (6.3) will impact this score |

---

*Checklist generated from codebase analysis. Pass items are verified in code; Todo items require follow-up implementation.*
