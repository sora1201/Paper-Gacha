# Paper Gacha UI Modernization Specification

## Goal

Modernize the Windows desktop app with an English, playful research-discovery experience. The interface should make drawing papers feel delightful without compromising readability or fast access to paper details.

## Product principles

- Keep the app local-first and desktop-first.
- Make a draw feel like opening a small collection of research cards.
- Keep paper metadata and primary actions easy to scan.
- Let users choose individual papers before posting to Bluesky.
- Do not persist the Bluesky app password.

## Navigation

Use a compact top navigation bar with these destinations:

- `Draw`
- `History`
- `Favorites`
- `Settings`

## Draw screen

The draw screen has a lightweight hero area, a theme summary, and an animated card-reveal area.

```
Paper Gacha                         Draw  History  Favorites  Settings

What will you discover today?
[ Core: robotics ] [ Related: computer vision ] [ 6 papers ]

                         [ Draw papers ]

                 ┌─────────────────────────┐
                 │       unrevealed cards   │
                 │            4             │
                 └─────────────────────────┘

                         [ Reveal next paper ]
```

After a card is revealed, show its category, title, authors, publication date, fields, and the actions `Open paper`, `Save`, and `Add to post`.

Reveal order remains `Core`, `Related`, then `Serendipity`. The unrevealed-card stack shows the remaining count and uses the category accent colors subtly.

## Paper cards

- Use generous spacing, rounded corners, and a faint paper-like shadow.
- Keep titles prominent and allow them to wrap naturally.
- Put field labels in compact chips.
- Use a visible check control for `Add to post`; do not make posting selection depend on text links.
- Show a gold selected state for papers included in a Bluesky post.

## Bluesky posting

- Display a fixed bottom selection bar when one or more papers are selected.
- The bar reads, for example, `3 papers selected` and provides `Post to Bluesky`.
- Before sending, show a confirmation dialog with the selected papers and their categories.
- Group sent papers into category-specific Bluesky threads.

## History and Favorites

- Use compact paper cards rather than a plain list.
- History cards show draw date, research-theme summary, and paper count.
- Favorites include a text search and a field filter.

## Settings

Organize settings into three named sections:

1. `Research profile` — core themes, related themes, and serendipity fields.
2. `Draw settings` — category counts and lookback period.
3. `Bluesky` — posting enablement, handle, and in-memory app password.

Themes should be editable as removable chips instead of comma-separated text where practical.

## Color tokens

| Token | Value | Purpose |
| --- | --- | --- |
| `background` | `#FFF8EE` | Warm paper-like app background |
| `surface` | `#FFFFFF` | Cards and input surfaces |
| `ink` | `#20212B` | Primary text and icons |
| `muted` | `#6B6E7A` | Secondary text |
| `border` | `#E9DFD1` | Subtle borders |
| `core` | `#F26B5E` | Core-paper accent |
| `related` | `#3E8ED0` | Related-paper accent |
| `serendipity` | `#8B63D9` | Serendipity-paper accent |
| `primary` | `#1F9D78` | Main actions, including `Draw papers` |
| `selection` | `#F4B740` | Favorites and Bluesky selection |

## Motion and accessibility

- Use short, optional reveal animations; they must not block interaction.
- Respect the operating system's reduced-motion preference when available.
- Preserve keyboard navigation, visible focus states, and high text contrast.
- Do not rely on color alone to communicate a paper category or selection state.

## Out of scope for the first implementation

- Dark mode
- Account synchronization
- Changes to paper retrieval, ranking, history storage, or Bluesky authentication behavior
