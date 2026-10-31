---
name: ezworkspace
description: Public wayfinding for an anxious change. Calm signage that always says where the team is, what comes next, and what stays sealed.
colors:
  concourse: "#f3f5f6"
  panel: "#ffffff"
  ink: "#192024"
  sign-charcoal: "#20272c"
  muted-ink: "#525b60"
  muted-surface: "#edf0f2"
  rule: "#d7dce0"
  control-edge: "#8b969c"
  signal-yellow: "#ffc814"
  route-green: "#186d47"
  route-green-soft: "#e6f4ed"
  review-amber: "#8e5306"
  review-amber-soft: "#fff3d1"
  stop-red: "#af261d"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "4rem"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  count:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  figure:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.375
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-dense:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.375
  chat:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.375
  sign:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  bubble: "20px"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  gutter: "32px"
components:
  button-primary:
    backgroundColor: "{colors.sign-charcoal}"
    textColor: "{colors.panel}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  button-next:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  next-plate:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.sign}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  done-plate:
    backgroundColor: "{colors.route-green}"
    textColor: "{colors.panel}"
    typography: "{typography.sign}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  bubble-coach:
    backgroundColor: "{colors.muted-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.chat}"
    rounded: "{rounded.bubble}"
    padding: "10px 16px"
  bubble-me:
    backgroundColor: "{colors.sign-charcoal}"
    textColor: "{colors.panel}"
    typography: "{typography.chat}"
    rounded: "{rounded.bubble}"
    padding: "10px 16px"
---

# Design System: ezworkspace

## Overview

**Creative North Star: "The Signposted Route"**

ezworkspace borrows from airport and hospital wayfinding: signage built for stressed people who are not experts and have no time. Every screen answers three questions in plain words: where are we, what happens next, and what is closed off. The COO dashboard, the worker chat, and the signed-out page share one band of sign charcoal, one face designed for legibility, and one route line that carries the product's mechanism (workers join, the COO signs, the map opens).

The world lends type, palette, density, and one signature move. Layout, navigation, and controls stay the standard ones for web apps: panels, tables, buttons, inputs, a chat composer. Calm comes from restraint in color, not from emptiness: color only ever reports state.

**Key Characteristics:**
- A charcoal overhead-sign band on every surface, wordmark in lowercase bold.
- The route line: voice dots and interchange stops, traveled segments solid green, the road ahead dashed gray.
- A yellow plate with an arrow marks the single next step, never more than one at a time.
- Diagonal hatch marks areas that exist but are sealed.
- One face, Atkinson Hyperlegible Next, whose slashed zero and open shapes are kept on purpose.

## Colors

Restrained: tinted neutrals carry the surface; four state colors each mean exactly one thing.

### Primary
- **Sign Charcoal** (sign-charcoal): the overhead band, primary buttons, the worker's own chat bubbles, stop numbers, and the "Sealed" sign. It is the voice of the system.

### Secondary
- **Wayfinding Yellow** (signal-yellow): the "next step" plate, the one control that performs that step, and the inner focus ring. Nothing else.
- **Route Green** (route-green, route-green-soft): done states, the traveled route, the signed stamp, the Keep List, and the workers' share of the payout (the only saturated payout bar; the fee and the company's share are control-edge gray).

### Tertiary
- **Review Amber** (review-amber, review-amber-soft): "Pending review" in the public registry, where a person must look before anything happens.
- **Stop Red** (stop-red): errors and the armed second click of a destructive action.

### Neutral
- **Concourse** (concourse): the page ground, a cool light gray. **Panel** (panel) white for work areas. **Ink** (ink) for text, **Muted Ink** (muted-ink) for captions (6:1 on white), **Rule** (rule) for dividers and hatch lines, **Control Edge** (control-edge) for input and outline-button borders (3:1 on white).

### Named Rules
**The One Yellow Rule.** Yellow marks only what happens next and keyboard focus. The next-step plate and the control that performs that step may both carry it (the plate links to the control); any other yellow on screen is wrong.

**The Fixed Legend Rule.** Green is done or paid to workers, yellow is next, amber needs a human, red is destructive or an error. Every state also carries an icon or a word, so color is never the only signal.

## Typography

**Face:** Atkinson Hyperlegible Next (Braille Institute, SIL OFL), self-hosted variable woff2 (weights 200 to 800), with system-ui fallback.

**Character:** a humanist sans drawn so that confusable characters (I, l, 1, 0, O) never collide. Its slashed zero reads as a legibility mark, familiar from forms and checks in accounts payable.

### Hierarchy
- **Display** (700, 4rem, 1.04, -0.03em): the signed-out promise only. 2.75rem on phones.
- **Count** (700, 3.75rem, tabular): the voices counter on the route strip.
- **Figure** (700, 1.875rem, tabular): the map's hours-per-week total.
- **Title** (700, 1.125rem): panel headings.
- **Sign** (700, 1.125rem): route stop names and the next/done plates, sized to read at arm's length from a laptop.
- **Body** (400, 1rem, 1.5) and **Body Dense** (400, 0.9375rem, 1.375): prose, dashboard rows, and panel descriptions (75% ink), 65 to 75ch for prose.
- **Chat** (400, 1.0625rem): bubbles on phones, 1rem from 640px up.
- **Label** (600, 0.875rem): form labels and small buttons.

### Named Rules
**The One Face Rule.** One family carries everything. Hierarchy comes from weight and size steps, never from a second display face or a monospace costume.

## Layout

- Max content width 1376px, gutters 16px on phones and 32px from 640px. Panels pad 20px; panel grid gap 16px.
- Dashboard: sign band (56px), then the full-width route strip, then three panels in story order on a 12-column grid from 1024px: Compact (4), map (5), payout (3). Registry (8) and invite (4) sit below. The route, Compact, map, and payout must fit a 1440x790 viewport without scrolling.
- Below 1024px every panel stacks, and the route shows only its line and the next step (the full route at sign size needs about 700px).
- Chat: full-height column (100dvh) capped at 680px; header and composer fixed by flex, messages scroll in between; safe-area insets respected.
- Fixed rem sizes, no fluid type on working screens.

## Elevation & Depth

Flat signage. Panels sit on the concourse with a 1px rule border and no shadow. Only the "Sealed" sign hangs over its hatched area with a real drop shadow (0 8px 20px -6px, 45% charcoal). Nothing else floats.

### Named Rules
**The Sign Not Card Rule.** Anything laid over a closed area is a charcoal sign plate, never a bordered card nested inside a panel.

## Shapes

Gently rounded plates: 6px for controls and plates, 8px for panels, 20px for chat bubbles with a 6px tail corner, full pills for chips, circles for route stops (44px with a 3px ring on the dashboard route, 32px on the signed-out diagram, 24px with a 2px ring as a panel's title marker) and voice dots (28px).

**The Hatch Means Closed Rule.** A diagonal 1.5px hatch every 11px marks an area that exists but is sealed: the map before both keys turn, the payout bars before amounts are public. Never used as texture.

## Components

### Buttons
- **Primary:** charcoal fill, white 600 label, 6px radius, 40px tall (44 to 48px for the main action of a panel). Hover lightens to 90% fill. Busy state shows a spinning reload icon and disables.
- **Next:** when a panel's action is the team's next step, it takes the yellow plate fill, a bold label and a leading arrow (the Sign button once quorum is in). Before that it stays charcoal.
- **Outline:** white fill, control-edge border, ink label; hover fills muted surface.
- **Ghost:** muted-ink label for quiet actions such as "Reset demo". Destructive actions need a second click, turning stop-red with explicit copy, and auto-disarm after 4 seconds.
- **Focus:** every focusable element gets a 2px ink outline at 2px offset over a 2px yellow ring.

### Chips
Chat suggestions: white pills with a control-edge border, 36px tall, one horizontal scrolling row above the composer. Harmless suggestions only: erasing is never a chip.

### Cards / Containers
Panels: white, 1px rule border, 8px radius. A 36px title row (an action such as "Show me who said what" sits on it, right-aligned) led by the small marker of the route stop the panel belongs to, so the strip and the panels read as one sign. Then a 15px description at 75% ink, then content. Never nested.

### Inputs / Fields
40px tall, control-edge border, 6px radius, 16px text, visible label above. Errors appear as a small red line with a warning icon directly under the form; never alerts.

### Navigation
The charcoal sign band: wordmark left, team name after a thin divider, account control right. The worker chat band adds a lock icon and "Private. Only you see this.", and on its right a quiet underlined "Erase my data" text button that arms first (stop red, "Tap again to erase") and disarms after 4 seconds. The destructive action lives here, apart from the suggestions.

### The Route (signature)
Voice dots joined by short connectors, then interchange stops for the Compact and the map (the map stop carries a lock). Traveled segments are solid route green; the road ahead is a dashed gray line. Exactly one yellow "next" plate sits under the next stop; when the step is the COO's, the plate is a link that focuses the yellow Sign button in place (no scroll jump). Done stops read in green with a check. A voice that arrives while the page is open pops in with a soft green halo.

### Motion
Exponential ease-out (cubic-bezier(0.16, 1, 0.3, 1)) from visible defaults: rise (450ms) for new content, pop plus halo for an arriving voice, payout bars grow left to right (900ms) staggered 450ms so the workers' bar always lands first, the signed stamp settles in 350ms. Reduced motion collapses all of it to the final state.

## Do's and Don'ts

### Do:
- **Do** say the next step in plain words on a yellow plate, one at a time.
- **Do** replace a completed control with its stamp in place (Sign button becomes "Signed by ... at ...").
- **Do** pair every state color with an icon or word.
- **Do** keep money to workers in route green, list it first, and give it the largest figure in the payout panel.

### Don't:
- **Don't** use yellow for decoration, highlights, or a second meaning.
- **Don't** nest a bordered card inside a panel; hang a charcoal sign instead.
- **Don't** add a second typeface, gradient text, glass, or colored side stripes.
- **Don't** use AI jargon (model, prompt, token) in worker-facing copy.
