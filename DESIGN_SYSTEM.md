# Voice Tutor Design System

## 1. Project overview

Voice Tutor is a conversational learning interface built around the DeltaOS Core brand. It connects learners to an AssemblyAI-powered voice agent, presenting speech, listening, transcript, and lesson feedback in a focused terminal-like environment. The experience should feel precise, calm, and technical without becoming cold or inaccessible. The interface is a tool for learning first: voice input, clear prompts, fast feedback, and readable lesson content take priority over decoration.

The visual language combines DeltaOS Core's engineering identity with a dark terminal aesthetic. Deep charcoal and violet-black surfaces create a low-glare canvas. Mint-green accents identify active voice work, successful actions, and primary controls, while the Delta blue scale provides semantic structure, links, information, and depth. JetBrains Mono reinforces the idea of a developer-grade voice workstation and keeps transcripts, status text, and controls visually consistent.

The design system applies to the web application, reusable React components, responsive layouts, and future voice-tutor surfaces. Every decision should support these goals:

- Make the voice agent's state obvious at a glance.
- Keep learner attention on the current prompt and response.
- Provide strong contrast and keyboard support for all interactive work.
- Preserve the terminal character of the product without sacrificing legibility.
- Reuse a small set of tokens, primitives, and components consistently.

The system is intentionally restrained. A limited palette, a compact type scale, and three approved animations reduce visual noise and make voice interactions predictable.

## 2. Color palette

Colors are defined as tokens so that components do not depend on arbitrary hex values. Use semantic aliases where possible, with the raw palette as the source of truth.

### Terminal scale

| Token | Value | Intended use |
| --- | --- | --- |
| `terminal.bg` | `#0a0a0f` | Application background, full-screen canvas, and terminal base. |
| `terminal.surface` | `#14141e` | Cards, panels, input surfaces, menus, and elevated terminal regions. |
| `terminal.border` | `#2a2a3a` | Dividers, input borders, separators, and subtle component outlines. |
| `terminal.text` | `#e0e0e0` | Primary body text, labels, headings, and transcript content. |
| `terminal.accent` | `#6ee7b7` | Active voice state, primary actions, success signals, and high-priority focus emphasis. |
| `terminal.accentDim` | `#34d399` | Secondary mint treatment, subdued success, and supporting active-state details. |
| `terminal.muted` | `#6b7280` | Secondary labels, timestamps, helper text, and low-emphasis metadata. |

`terminal.bg` is the default page color. `terminal.surface` is for content that needs to separate from the canvas, not for every empty area. `terminal.border` should be thin and quiet; it defines structure without making the interface feel boxed in. `terminal.text` is the default readable foreground. Use `terminal.muted` only for information that is not required to understand or complete the current task.

`terminal.accent` is the primary voice color. Use it for the listening indicator, the main send or start-listening action, active transcript markers, and the focus ring. `terminal.accentDim` can support a secondary accent, a less prominent success state, or a muted mint detail. Do not use mint for large decorative areas because it can compete with the voice state.

### Delta blue scale

The Delta scale provides a cool, technical counterpoint to mint and is used for information and brand detail:

| Token | Value |
| --- | --- |
| `delta.50` | `#eff6ff` |
| `delta.100` | `#dbeafe` |
| `delta.200` | `#bfdbfe` |
| `delta.300` | `#93c5fd` |
| `delta.400` | `#60a5fa` |
| `delta.500` | `#3b82f6` |
| `delta.600` | `#2563eb` |
| `delta.700` | `#1d4ed8` |
| `delta.800` | `#1e40af` |
| `delta.900` | `#1e3a8a` |
| `delta.950` | `#020617` |

Use `delta.500` or `delta.600` for links, informational controls, and selected navigation on dark surfaces when mint would imply a voice or success action. Use lighter values such as `delta.200` and `delta.300` for text or icons that must remain legible on dark backgrounds. Use `delta.900` and `delta.950` for deep backgrounds, overlays, and brand-grade depth. Avoid placing blue text on blue backgrounds unless contrast is verified. Blue is not the default action color; mint remains the signal for voice activity and primary completion.

Always check contrast in the actual component state. A color that passes on the page background may fail on a surface, hover state, or translucent overlay.

## 3. Typography

Voice Tutor uses JetBrains Mono for interface text, transcripts, controls, timestamps, and lesson metadata. The approved weights are 400, 600, and 700. Use 400 for body copy and transcripts, 600 for labels, buttons, and medium-emphasis headings, and 700 for short headings, status values, and important numeric or state information.

Use the following fallback chain when JetBrains Mono is unavailable:

```text
"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace
```

The type scale is six steps and mobile-first. Keep line heights generous enough for transcripts and instructional prose.

| Step | Size | Line height | Typical use |
| --- | --- | --- | --- |
| `xs` | 0.75rem (12px) | 1rem (16px) | Timestamps, status labels, fine metadata. |
| `sm` | 0.875rem (14px) | 1.25rem (20px) | Helper text, captions, compact controls. |
| `base` | 1rem (16px) | 1.5rem (24px) | Body copy, transcripts, form labels, buttons. |
| `lg` | 1.125rem (18px) | 1.75rem (28px) | Lead text and prominent section introductions. |
| `xl` | 1.25rem (20px) | 1.75rem (28px) | Card titles and major interface headings. |
| `2xl` | 1.5rem (24px) | 2rem (32px) | Page titles and the primary voice-session heading. |

Use sentence case for headings and controls. Keep labels short and action-oriented. Avoid all-caps except for very short system badges where the meaning is clear. Do not use font size alone to communicate state; pair it with wording, iconography, or a status treatment.

Body prose must remain readable in a terminal interface. Limit prose blocks to a comfortable measure, use short paragraphs, and preserve enough vertical rhythm between transcript turns. Long lesson explanations may use a slightly larger line height, but should not switch to a non-monospace font. Never reduce transcript text below `sm`, and never use `xs` for essential instructions.

## 4. Spacing system

Spacing uses an 8px base unit. This keeps layouts predictable, supports touch targets, and maps cleanly to Tailwind's spacing scale. Use the smallest value that creates clear separation; do not add spacing merely to fill empty space.

| Token | Tailwind value | Pixels | Use |
| --- | --- | --- | --- |
| `space-1` | `1` | 4px | Tight internal padding and icon gaps. |
| `space-2` | `2` | 8px | Base unit for compact controls and labels. |
| `space-3` | `3` | 16px | Standard component padding and row gaps. |
| `space-4` | `4` | 24px | Card padding, section rhythm, and form groups. |
| `space-5` | `5` | 32px | Panel separation and major content blocks. |
| `space-6` | `6` | 40px | Section spacing on desktop and large panels. |
| `space-8` | `8` | 48px | Page-level rhythm and major voice-session regions. |

Tailwind also supports `space-0`, `space-px`, and fractional values when a design requires them, but component defaults should use the table above. Keep related controls close enough to show their relationship and separate independent groups with at least `space-4`. Use symmetrical horizontal and vertical padding unless the layout requires a deliberate edge alignment.

The voice console should have enough breathing room to make changing states visible. A transcript turn, status message, and control row should not touch one another. On small screens, reduce page-level gaps before reducing touch-target dimensions or text size.

## 5. Iconography

Use SVG-only icons. Every interactive icon should be a 24px by 24px viewBox with a consistent stroke width, rounded joins, and a simple geometric vocabulary. Prefer outlined icons for navigation and actions, with filled icons reserved for an active or selected state. Icons must have accessible names when they carry meaning and `aria-hidden="true"` when they only decorate a labeled control.

The icon set should cover microphone, stop, play, pause, send, transcript, settings, history, connection, error, and close states. Keep each concept visually distinct at 20px and 24px. Do not rely on color alone to explain an icon's function. Use the same stroke treatment across the product and avoid decorative illustrations inside controls.

Do not use emoji in interactive elements. Emoji vary by platform, can be announced inconsistently by screen readers, and weaken the terminal aesthetic. If a symbol is needed in prose, use a text label or an approved SVG icon instead.

## 6. Motion guidelines

Motion is functional and limited to three approved animations:

- `pulse-slow`: a gentle mint pulse for listening or processing. Use it only while the voice agent is actively listening or working.
- `wave`: a restrained waveform movement for audio activity. Use it in the voice-status visualization, never as a general page decoration.
- `fade-in`: a short opacity transition for newly rendered transcript turns, panels, and status messages.

All motion must be gated by `prefers-reduced-motion`. When reduced motion is requested, remove the pulse and wave animation, show a stable status indicator, and replace fade-in with an immediate or near-immediate state change. Never use motion to communicate the only available feedback.

Use a 150ms duration for hover and small state changes. Use 250ms for slides, panel entrances, and larger transitions. Keep easing consistent and subtle, such as a standard ease-out curve. Do not animate large areas of the page, move text during reading, or loop animations when the voice agent is idle. Motion should clarify system state, not create visual activity.

## 7. Component states

Every interactive component should define default, hover, active, focus-visible, disabled, and loading states.

- **Default:** Use `terminal.surface`, `terminal.border`, and `terminal.text`. Borders and backgrounds should be quiet until interaction.
- **Hover:** Slightly lighten the surface or border. Use a 150ms transition. Do not change the component's meaning or move it unexpectedly.
- **Active:** Increase the visual weight with a stronger border, a subtle surface change, or a small press treatment. Active is a pointer state and must not replace focus behavior.
- **Focus-visible:** Apply a 2px ring using `terminal.accent`, with `ring-offset-2`. The ring must be visible on both dark and blue surfaces. Do not remove the native focus indication without providing this replacement.
- **Disabled:** Reduce contrast with muted text, a subdued border, and a non-interactive cursor. Do not use opacity as the only signal. Disabled controls must not be focusable or operable.
- **Loading:** Show an accessible status message and a restrained indicator. Preserve the control's label and dimensions so the layout does not jump. For voice requests, use `pulse-slow` only when motion is allowed and pair it with text such as “Listening” or “Processing.”

Buttons, links, inputs, menu items, tabs, and voice controls all follow the same state model. A focus ring is not a hover style, and a loading spinner is not a substitute for a live-region announcement.

## 8. Accessibility checklist

Voice Tutor targets WCAG 2.1 AA behavior and should be tested with keyboard, screen reader, high-contrast, and reduced-motion settings.

- Maintain at least 4.5:1 contrast for normal text and 3:1 for large text and meaningful UI graphics.
- Provide a visible skip link as the first focusable element, targeting the main content.
- Use semantic landmarks: header, nav, main, aside, dialog, and footer where applicable.
- Give every input a persistent label, instructions, and an error message connected with `aria-describedby` when needed.
- Announce voice-state changes through appropriate live regions. Use `aria-live="polite"` for transcript and status updates and `aria-live="assertive"` only for urgent errors.
- Mark decorative icons and waveform graphics with `aria-hidden="true"`.
- Keep the main landmark `aria-hidden` while a modal or drawer is open, and restore it when the overlay closes. Ensure focus moves into the drawer or dialog and returns to the trigger on close.
- Provide a visible, keyboard-operable way to close drawers, dialogs, and voice panels.
- Make touch targets at least 44px by 44px, including the microphone, stop, send, navigation, and menu controls.
- Do not communicate state through mint, blue, or red alone. Pair color with text, icons, shape, or status wording.
- Respect `prefers-reduced-motion`, zoom to 200 percent without loss of content, and preserve reflow at narrow widths.
- Set `color-scheme: dark` so form controls, scrollbars, and native widgets match the terminal theme.
- Test focus order, transcript announcements, microphone permission errors, network failures, and empty states with assistive technology.

Accessibility is a release requirement, not a final styling pass. Add checks to component reviews and test representative voice flows on mobile and desktop.

## 9. Responsive breakpoints

Use a mobile-first layout. Start with one column, full-width controls, and compact vertical rhythm, then add structure at the following breakpoints:

- `sm`: 640px — improve control spacing, allow compact side-by-side metadata, and increase transcript measure where appropriate.
- `md`: 768px — introduce secondary columns, a more structured voice console, and wider controls without crowding the viewport.
- `lg`: 1024px — support the main workspace and contextual panels, navigation, or history views side by side.

Keep the primary content container at `max-w-4xl`. Center it with appropriate horizontal padding and never let long transcript lines span an unrestricted desktop width. At each breakpoint, preserve the same component states, touch targets, labels, and accessibility behavior. Do not hide essential voice controls on smaller screens; reposition or simplify them instead.

## 10. Implementation and governance

Map these tokens into Tailwind theme values and use semantic names in components. Avoid hard-coded colors, font sizes, and spacing values in feature code. When a new component is introduced, document its states, responsive behavior, accessibility requirements, and approved animation before merging it.

The design system should remain small enough for a team to apply consistently. Prefer a clear, accessible default over a special visual treatment. When product requirements conflict with this document, preserve voice-state clarity, keyboard operability, contrast, and learner readability before preserving decorative styling.
