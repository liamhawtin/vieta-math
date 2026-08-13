# Theming VietaMath

VietaMath is styled through CSS custom properties. The package injects its own
CSS at runtime, which makes the editor self-contained but affects the cascade:
when a host stylesheet loads first, add `!important` to host overrides.

The defaults respond to the system color scheme. Put `data-theme="light"` or
`data-theme="dark"` on an ancestor to select a fixed default theme.

```css
.my-math-surface .vieta-root {
  --bg-primary: #ffffff !important;
  --bg-secondary: #f8f9fa !important;
  --text-primary: #212529 !important;
  --border-color: #dee2e6 !important;
  --brand-primary: #405d63 !important;
  --brand-primary-rgb: 64, 93, 99 !important;
}

.my-math-surface .vieta-root .interactive-mathml {
  --mm-caret: #004288 !important;
  --mm-selection: rgba(0, 123, 255, 0.2) !important;
}
```

Use an RGB triplet for variables whose name ends in `-rgb`, without `rgb()`.
That allows dependent values such as `rgba(var(--brand-primary-rgb), 0.1)`.

## UI variables

Apply these to `.vieta-root`.

| Group | Variables |
| --- | --- |
| Surface | `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-hover` |
| Text | `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-disabled` |
| Borders | `--border-color`, `--border-light`, `--border-medium` |
| Shadows | `--shadow-subtle`, `--shadow-medium`, `--shadow-large` |
| Selection/removal | `--math-select-fill`, `--math-select-stroke`, `--math-remove-fill`, `--math-remove-stroke` |
| Brand | `--brand-primary`, `--brand-primary-rgb`, `--brand-secondary`, `--brand-tertiary`, `--brand-light`, `--brand-lightest` |
| Accent | `--accent-color`, `--accent-color-rgb`, `--accent-hover`, `--accent-light`, `--hover-bg`, `--active-bg` |
| Status | `--success-color`, `--success-color-rgb`, `--warning-color`, `--warning-color-rgb`, `--error-color`, `--error-color-rgb`, `--info-color`, `--info-color-rgb` |
| Radii | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl` |
| Spacing | `--spacing-xs`, `--spacing-sm`, `--spacing-md`, `--spacing-lg`, `--spacing-xl`, `--spacing-2xl` |
| General type | `--font-size-2xs`, `--font-size-xs`, `--font-size-s`, `--font-size-sm`, `--font-size-base`, `--font-size-lg`, `--font-size-xl`, `--font-size-2xl`, `--font-size-3xl` |
| UI type | `--font-size-ui-2xs`, `--font-size-ui-xs`, `--font-size-ui-sm`, `--font-size-ui-base` |
| Math type | `--font-size-math-sm`, `--font-size-math-base`, `--font-size-math-lg`, `--font-size-math-xl` |
| Icons | `--icon-size-xs`, `--icon-size-sm`, `--icon-size-md`, `--icon-size-lg`, `--icon-size-xl`, `--icon-size-2xl` |
| Type weight | `--font-weight-light`, `--font-weight-normal`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold` |
| Line height | `--line-height-tight`, `--line-height-normal`, `--line-height-relaxed` |
| Math spacing | `--space-rel`, `--space-bin`, `--space-punct`, `--space-op`, `--space-open`, `--space-close`, `--space-inner` |
| Layout | `--logo-height`, `--header-height` |
| Motion | `--duration-fast`, `--duration-normal`, `--duration-slow`, `--ease-in`, `--ease-out`, `--ease-in-out` |

## Direct-math interaction variables

Apply these to `.vieta-root .interactive-mathml`. They are defined on that
child element, so a value set only on `.vieta-root` does not replace its local
default.

| Group | Variables |
| --- | --- |
| Core | `--mm-text`, `--mm-caret` |
| Overlays | `--mm-overlay-weak`, `--mm-overlay-light`, `--mm-overlay-medium`, `--mm-overlay-strong` |
| Borders | `--mm-border-weak`, `--mm-border-medium`, `--mm-border-strong`, `--mm-delimiter-active-border` |
| Interaction | `--mm-accent`, `--mm-danger`, `--mm-warning`, `--mm-selection`, `--mm-loading-bg` |

The current default values live in
[`src/styles/global.scss`](../src/styles/global.scss) and
[`src/components/InteractiveMathML/InteractiveMathML.scss`](../src/components/InteractiveMathML/InteractiveMathML.scss).
When adding a new public custom property, update this file in the same change.
