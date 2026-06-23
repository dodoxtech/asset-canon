# Activation Eval — Layer 2

A skill is useless if the agent does not pick it. This is a manual regression
checklist: open a **fresh** agent session, paste each prompt, and record whether
the correct skill activated and routed to the correct specialist.

Re-run this whenever a `description:` frontmatter changes — descriptions are what
drive activation, so editing one can silently break routing for another.

## How to run
1. Open a clean session with the plugin installed.
2. Paste the prompt verbatim. Do **not** name the skill in the prompt.
3. Record: did `asset-canon` activate? which specialist did it route to?
4. Mark PASS only if both match the expectation.

## Positive cases (skill SHOULD activate)

| # | Prompt | Expected specialist | Result |
|---|--------|---------------------|--------|
| 1 | "create a favicon for my website" | asset-icon | ☐ |
| 2 | "make a set of 5 navbar icons: home, search, cart, user, settings" | asset-icon | ☐ |
| 3 | "generate an iOS app icon, 1024px" | asset-icon | ☐ |
| 4 | "draw a hero illustration for a SaaS landing page" | asset-illustration | ☐ |
| 5 | "I need empty-state art for an inbox screen" | asset-illustration | ☐ |
| 6 | "make a character sprite for my platformer game" | asset-sprite | ☐ |
| 7 | "generate a tileset of grass and stone tiles" | asset-sprite | ☐ |
| 8 | "I need a repeating background pattern with no visible seams" | asset-texture | ☐ |
| 9 | "seamless concrete surface texture for a hero bg" | asset-texture | ☐ |
| 10 | "create an OG image for a blog post to share on Facebook" | asset-social | ☐ |
| 11 | "make a YouTube thumbnail, 1280x720" | asset-social | ☐ |

## Disambiguation cases (easy to route wrong)

| # | Prompt | Correct specialist | Common wrong pick | Result |
|---|--------|--------------------|-------------------|--------|
| 12 | "background image for my hero section" | ask user: texture (pattern) vs illustration (scene) | silently picks one | ☐ |
| 13 | "a banner for the top of my site" | asset-social (fixed size) | asset-illustration | ☐ |
| 14 | "icon-sized game item, 64x64" | asset-sprite (game style) | asset-icon | ☐ |
| 15 | "logo for my brand" | clarify: out of current scope OR icon-style mark | invents a logo skill | ☐ |

## Negative cases (skill SHOULD stay silent)

| # | Prompt | Expected | Result |
|---|--------|----------|--------|
| 16 | "fix the login bug in auth.ts" | no asset skill activates | ☐ |
| 17 | "write unit tests for the cart reducer" | no asset skill activates | ☐ |
| 18 | "explain how OAuth works" | no asset skill activates | ☐ |
| 19 | "rename this CSS variable everywhere" | no asset skill activates | ☐ |

## Scoring
- **Positive pass rate** = passed / 11 (target: 11/11)
- **Disambiguation** = how often it asks instead of guessing wrong (target: asks on 12 & 15)
- **Negative pass rate** = passed / 4 (target: 4/4 — false activation is worse than a miss)

Record the date, model, and pass rates below each run:

```
2026-06-23 · claude-opus-4-8 · pos __/11 · disambig __/4 · neg __/4
```
