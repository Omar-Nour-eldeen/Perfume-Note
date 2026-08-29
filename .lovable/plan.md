Plan: Rebuild the Hommi-style home design landing page

Goal
Replace the current placeholder index page with a dark, premium landing page for a home design platform inspired by https://hommi-app.vercel.app/.

What we will build

1. Replace `src/routes/index.tsx`
   - Add a `head()` with unique metadata, title, description, and Open Graph/Twitter tags for a home design platform.
   - Build a full landing page with these sections:
     - Navigation: minimal logo, nav links, Sign In / Sign Up pill button.
     - Hero: left-aligned heading with italic serif accent word (“Dream”), tagline, and teal CTA pill.
     - Stats: years, projects, satisfaction metrics.
     - Features: “From Vision to Reality” with before/after visual and six feature cards.
     - House Plans: four or more plan cards with image, title, and description.
     - How It Works: numbered steps with vertical progression and images.
     - Final CTA: dark card with two actions.
     - Footer: simple copyright and links.

2. Update `src/styles.css`
   - Redesign the token system to match the reference: very dark background (`#050505`-like), white foreground, teal accent (`#14b8a6`/`#2dd4bf` range), muted grays.
   - Add a serif font for headings and a clean sans-serif for body.
   - Keep all colors in `oklch` format as required by the project.
   - Ensure no hardcoded color utilities in components; use semantic tokens (`bg-primary`, `text-primary`, `text-muted-foreground`, etc.).

3. Assets
   - Generate images for house plan cards and how-it-works steps using imagegen so they feel cohesive and architectural.
   - Store generated images under `src/assets/` and import them as ES6 modules.

4. Design fidelity
   - Match the reference composition: left-aligned hero, dark background, teal accent, rounded pill buttons, serif italic accent word, numbered steps with vertical line, card-based house plans.
   - Keep the page responsive for mobile, tablet, and desktop.

5. Technical constraints
   - Use TanStack Start (`createFileRoute`) and Tailwind v4.
   - No new backend or database work; this is a static marketing landing page.
   - No custom hardcoded colors in components.
   - Keep the root route unchanged except where the theme needs it.

6. Verification
   - Run the build/typecheck after edits.
   - Capture a preview screenshot to confirm the visual match.
