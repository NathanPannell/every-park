# Interaction and Icon Design Language

This document preserves the strongest part of the map mockups: the collectible icon treatment and the playful feedback used when a person interacts with or completes something.

## Core character

The interface should feel like a friendly physical toy rather than a conventional productivity app. Icons and buttons should appear soft, chunky, colorful, and slightly raised from the surface. The visual language can borrow the satisfaction of a tower-defense or collection game without adding fantasy objects to real places.

The map, geography, labels, and data can remain practical. The game personality should be concentrated in interactive objects and moments of progress.

## Collectible place icons

### Shape

- Use a compact rounded-square token rather than a standard map pin.
- Corners should be generously rounded, but the token should retain enough flat edge to feel like a collectible tile.
- A useful proportion is a 42–44 px face inside a roughly 52 px interaction area.
- Use a thick warm-cream rim, approximately 3 px, to separate the icon from any map or background.
- Add a soft oval contact shadow underneath. It should make the token feel placed on the map, not floating arbitrarily above it.
- Avoid sharp diamonds, thin outlines, glossy glass effects, and ordinary teardrop map markers.

### Color

- Give each place category a strong but earthy color: forest green, ocean blue, alpine orange, beach teal, or clay red.
- Favor warm, slightly muted pigments over neon RGB colors.
- Use warm ivory for icon artwork and borders instead of pure white.
- Completed icons should be the most saturated objects on screen.
- Undiscovered icons should use a neutral stone or parchment fill with a dark muted question mark.

### Symbol artwork

- Symbols should be simple enough to read at a glance: a mountain triangle, water ripple, tree, waterfall, trail, or star.
- Prefer bold silhouettes and one-color glyphs over detailed illustration.
- Do not put castles, creatures, or fictional structures on real terrain.
- The symbol identifies the type of place; color reinforces it.

### States

**Undiscovered**

- Neutral clay or parchment token.
- Question-mark glyph.
- Reduced saturation and a modest shadow.

**Discovered**

- Category color fills the face.
- Place-type symbol replaces the question mark.
- A small golden check badge overlaps the upper-right corner.
- Shadow can deepen slightly to make the reward feel more substantial.

**Selected**

- Add a soft, color-matched halo around the token.
- Let the halo slowly expand and fade in a quiet breathing loop.
- Lift or enlarge the token very slightly.
- Selection feedback should remain calm enough that several markers do not create visual noise.

## Interaction “juice”

Juice means immediate, layered feedback that makes an action feel responsive and rewarding. It should reinforce the user’s intent, not delay it.

### Button press

1. On touch-down, compress the button to roughly 96–98% scale.
2. Move it down by about 2 px so the raised shadow becomes shallower.
3. On release, use a short spring back to its resting position.
4. Keep the entire response under roughly 250 ms unless it triggers a completion moment.

Buttons should look physically pressable before interaction: rounded shape, warm surface, colored face, and a small hard-edged lower shadow that suggests depth.

### Completing or visiting a place

Use a short sequence with overlapping effects rather than one long animation:

1. The token compresses briefly, acknowledging the tap.
2. It jumps upward and grows to approximately 125–130% scale.
3. The neutral face changes to its category color and the place symbol appears.
4. A color-matched ring expands outward and fades.
5. A small burst of 5–7 chunky confetti pieces travels away from the icon.
6. The golden completion check lands on the upper-right corner.
7. The token settles with a tiny overshoot, then returns to rest.
8. Nearby progress updates at the same moment so the celebration clearly corresponds to advancement.

The full sequence should take about 700–1000 ms. It should feel celebratory but not block the next interaction.

### Motion style

- Prefer spring motion, overshoot, squash, and settle over linear fades.
- Animate scale, translation, shadow depth, color, and opacity together in small amounts.
- Confetti should be chunky rounded rectangles, not numerous particles.
- Use the icon’s category color for the expanding ring, with a small warm palette for confetti.
- Never animate the entire map just to celebrate one place.

## Progress and increasing color

- Progress should make the experience gradually brighter rather than merely incrementing a number.
- Completed place tokens gain full color first.
- A completed region may receive a restrained warm tint or slightly increased saturation.
- The underlying real map should remain legible and structurally stable.
- Avoid recoloring roads or making functional cartography look like fantasy terrain.

## Restraint and usability

- Keep visible collectible markers sparse; approximately 7–10 at an island-wide zoom is appropriate.
- Prioritize widely separated, significant places at low zoom levels.
- Reveal denser local places only after zooming in.
- Maintain at least a 44 px touch target even if the visible face is smaller.
- Do not rely on color alone: pair color with a symbol, question mark, or check.
- Provide reduced-motion behavior that replaces jumps and confetti with a quick color change, check appearance, and subtle fade.
- Preserve strong contrast between glyphs, tokens, and the background.

## Guiding principle

Keep real geography practical and trustworthy. Put the game feeling into the objects the user can touch and the moments where exploration becomes progress.
