# UI Guidelines

## Navigation
Use a persistent left sidebar (sections: Dashboard, Records, Settings) rather than a top bar,
because this is a data-oriented console where users jump between sections frequently and a
sidebar keeps that switch to one click. Do not add a second nav layer (tabs-within-sidebar);
nest deeper pages under their section in the URL instead, to keep orientation obvious.

## Layout and density
Default to a dense layout (`space-2`/`space-3` rhythm, `font-size-sm`/`font-size-md` body text)
because the primary users are repeat operators scanning many records, not first-time consumer
visitors. Reserve `space-4` and `font-size-lg` for card titles and section headers only, so
density stays low-key rather than cramped. Design for a single desktop breakpoint (≥1024px)
first, since this product is used at a desk; collapse the sidebar to icons-only below that
width rather than building a full mobile layout, because mobile is not a primary use case.

## Component usage
Use `.card` for a single entity's detail or a grouped settings panel, since a card implies one
cohesive unit a user reads top to bottom. Use a plain table (not cards-in-a-grid) for any list
of more than a handful of same-shaped records, because tables let users scan and compare
columns, which cards can't do at speed. Use `.chip` only for status/tag labels inline in text or
table cells, never as a clickable control, so chips stay visually distinct from buttons. Use
`.btn-primary` for exactly one action per screen (the one that commits a change) and
`.btn-secondary` for everything else, so the primary action stays findable at a glance.

## Theme
Light theme only for now (`color-bg`/`color-fg` as defined in tokens), because the product has
one brand surface and no user-facing theme switch has been requested; revisit if a dark variant
is explicitly prioritized.

## Voice and tone
Write copy in plain, direct, second person ("Add a record", not "Records may be added"), because
operators are mid-task and scanning, not reading prose. Prefer specific nouns over vague ones in
labels and errors ("No records match this filter" rather than "No data found"), so users can act
on what they read without guessing.
