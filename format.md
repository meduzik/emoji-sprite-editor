# Emoji Sprite Editor Format

## JSON Structure

The format is a compact JSON array of sprite objects, ordered from back to front (first element renders first/bottom, last element renders last/top). Property names use shorthand notation to minimize file size.

```json
[{"e":"😀","x":10.5,"y":-20.3,"r":45.2,"sx":1.5,"sy":2}]
```

## Sprite Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `e` | string | required | Any text/emoji to render |
| `x` | number | 0 | Horizontal position from canvas center (pixels) |
| `y` | number | 0 | Vertical position from canvas center (pixels) |
| `r` | number | 0 | Rotation in degrees, clockwise |
| `s` | number | 1 | Uniform scale multiplier (when scaleX = scaleY) |
| `sx` | number | 1 | Horizontal scale multiplier (non-uniform scaling) |
| `sy` | number | 1 | Vertical scale multiplier (non-uniform scaling) |

**Note**: Use `s` for uniform scaling, or `sx`/`sy` for non-uniform scaling. Never use both.

### Value Precision
- Position (`x`, `y`): Rounded to 2 decimal places (0.01 pixel precision)
- Rotation (`r`): Rounded to 1 decimal place (0.1 degree precision)
- Scale (`s`, `sx`, `sy`): Rounded to 4 decimal places (0.0001 precision)

### Default Omission
Properties with default values are omitted from export:
- `x: 0` → omitted
- `y: 0` → omitted
- `r: 0` → omitted
- `s: 1` → omitted
- `sx: 1` and `sy: 1` → omitted

### Whitespace
Exported JSON contains no whitespace (no indentation or line breaks) for minimal file size.

Minimal sprite: `{"e":"😀"}` (at origin, no rotation, scale 1)

## Rendering Specification

### Coordinate System
- Origin (0, 0) is at the **center** of the canvas
- X-axis: positive right, negative left
- Y-axis: positive down, negative up
- Sprites are layered by array order (earlier = behind, later = in front)

### Text Rendering
- **Font**: Any system font (implementation: Arial)
- **Base Font Size**: 80px when `scaleX = scaleY = 1.0`
- **Text Alignment**: `start` horizontal, `alphabetic` vertical (baseline)
- **Centering Method**: Uses actual glyph boundaries (via `measureText()` metrics), NOT font measurements
  - Horizontal: Centered using `actualBoundingBoxLeft` and `actualBoundingBoxRight`
  - Vertical: Centered using `actualBoundingBoxAscent` and `actualBoundingBoxDescent`
  - This ensures emojis appear visually centered at their origin, regardless of font metrics
- **Pivot Point**: Visual center of the emoji glyph (based on actual rendered bounds)
- **Rotation**: Applied around the pivot point (visual center)
- **Scaling**: Applied with separate horizontal (scaleX) and vertical (scaleY) factors around the pivot

### Render Order
1. Translate to world position: `(centerX + x, centerY + y)`
2. Rotate by `r` degrees around pivot
3. Scale by `s` (uniform) or `sx`/`sy` (non-uniform) factors
4. Render text with base font size 80px, scaled by the transform
5. Process sprites in array order (index 0 first, index n last)

### Bounding Box Estimation
For collision/selection purposes, uses actual glyph boundaries:
- Width: `(actualBoundingBoxLeft + actualBoundingBoxRight) * scaleX`
- Height: `(actualBoundingBoxAscent + actualBoundingBoxDescent) * scaleY`
- Bounds are centered on sprite position based on visual glyph extents
- This provides accurate hit detection matching the visual appearance

## Example

```json
[{"e":"🎨"},{"e":"✨","x":50,"y":-30,"r":15},{"e":"🌟","sx":2.5,"sy":1.5}]
```

Renders three sprites:
1. 🎨 at center (back layer)
2. ✨ offset right 50px, up 30px, rotated 15° (middle layer)
3. 🌟 at center, stretched 2.5x horizontally, 1.5x vertically (front layer)
