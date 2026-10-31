import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta: Meta = {
  title: "Design Tokens/Colors",
  tags: ["autodocs"],
  parameters: {
    docs: {
      source: { code: null },
    },
  },
};

export default meta;
type Story = StoryObj;

const colorTokens = [
  "background", "foreground", "primary", "primary-foreground",
  "secondary", "muted", "accent", "destructive", "border", "ring",
  "card", "popover",
];

const spacingTokens = ["token-spacing-1", "token-spacing-2", "token-spacing-4", "token-spacing-6", "token-spacing-8"];

const radiusTokens = ["radius"];

export const Palette: Story = {
  render: () => (
    <div
      className="bg-background text-foreground"
      style={{ backgroundColor: "var(--background, Canvas)", color: "var(--foreground, CanvasText)" }}
    >
      <div className="grid grid-cols-4 gap-4 p-4">
        {colorTokens.map((t) => (
          <div key={t} className="space-y-1">
            <div
              className="h-16 rounded-md border border-border"
              style={{ backgroundColor: `var(--${t}, Canvas)` }}
            />
            <p className="text-xs font-mono text-muted-foreground">--{t}</p>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const DarkPalette: Story = {
  decorators: [
    (Story) => (
      <div
        className="dark bg-background text-foreground"
        style={{ backgroundColor: "var(--background, Canvas)", color: "var(--foreground, CanvasText)" }}
      >
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid grid-cols-4 gap-4 p-4">
      {colorTokens.map((t) => (
        <div key={t} className="space-y-1">
          <div
            className="h-16 rounded-md border border-border"
            style={{ backgroundColor: `var(--${t}, Canvas)` }}
          />
          <p className="text-xs font-mono text-muted-foreground">--{t}</p>
        </div>
      ))}
    </div>
  ),
};

export const Spacing: Story = {
  render: () => (
    <div
      className="bg-background text-foreground"
      style={{ backgroundColor: "var(--background, Canvas)", color: "var(--foreground, CanvasText)" }}
    >
      <div className="space-y-4 p-4">
        {spacingTokens.map((t) => (
          <div key={t} className="space-y-1">
            <div
              className="h-8 rounded bg-primary/10 border border-primary/20"
              style={{ width: `var(--${t}, 1rem)` }}
            />
            <p className="text-xs font-mono text-muted-foreground">--{t} (width: var(--{t}))</p>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const DarkSpacing: Story = {
  decorators: [
    (Story) => (
      <div
        className="dark bg-background text-foreground"
        style={{ backgroundColor: "var(--background, Canvas)", color: "var(--foreground, CanvasText)" }}
      >
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="space-y-4 p-4">
      {spacingTokens.map((t) => (
        <div key={t} className="space-y-1">
          <div
            className="h-8 rounded bg-primary/10 border border-primary/20"
            style={{ width: `var(--${t}, 1rem)` }}
          />
          <p className="text-xs font-mono text-muted-foreground">--{t} (width: var(--{t}))</p>
        </div>
      ))}
    </div>
  ),
};

export const Radius: Story = {
  render: () => (
    <div
      className="bg-background text-foreground"
      style={{ backgroundColor: "var(--background, Canvas)", color: "var(--foreground, CanvasText)" }}
    >
      <div className="flex flex-wrap items-center gap-4 p-4">
        {radiusTokens.map((t) => (
          <div key={t} className="space-y-1">
            <div
              className="w-16 h-16 border-2 border-primary"
              style={{ borderRadius: `var(--${t}, 0.5rem)` }}
            />
            <p className="text-xs font-mono text-muted-foreground text-center">--{t}</p>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const DarkRadius: Story = {
  decorators: [
    (Story) => (
      <div
        className="dark bg-background text-foreground"
        style={{ backgroundColor: "var(--background, Canvas)", color: "var(--foreground, CanvasText)" }}
      >
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="flex flex-wrap items-center gap-4 p-4">
      {radiusTokens.map((t) => (
        <div key={t} className="space-y-1">
          <div
            className="w-16 h-16 border-2 border-primary"
            style={{ borderRadius: `var(--${t}, 0.5rem)` }}
          />
          <p className="text-xs font-mono text-muted-foreground text-center">--{t}</p>
        </div>
      ))}
    </div>
  ),
};

/** Pilot tokens from the fixture — verify light/dark semantic colors, spacing, and radius */
export const PilotTokens: Story = {
  render: () => (
    <div className="space-y-8 p-4">
      {/* Pilot Color (light) */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Pilot Light Theme</h3>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded border border-border" style={{ backgroundColor: "var(--primary)" }} />
          <div className="w-20 h-20 rounded border border-border" style={{ backgroundColor: "var(--pipeline-proof)" }} />
        </div>
        <p className="text-xs font-mono text-muted-foreground">
          --primary: var(--primary) (should be #171717) | --pipeline-proof: var(--pipeline-proof) (should be #abcdef)
        </p>
      </section>

      {/* Pilot Color (dark) */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Pilot Dark Theme</h3>
        <div className="dark flex items-center gap-4">
          <div className="w-20 h-20 rounded border border-border" style={{ backgroundColor: "var(--primary)" }} />
        </div>
        <p className="text-xs font-mono text-muted-foreground">
          --primary: var(--primary) (should be #e5e5e5 in dark)
        </p>
      </section>

      {/* Pilot Spacing */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Pilot Spacing</h3>
        <div className="space-y-2">
          <div className="h-4 rounded bg-primary/10 border border-primary/20" style={{ width: "var(--token-spacing-1)" }} />
          <div className="h-4 rounded bg-primary/10 border border-primary/20" style={{ width: "var(--token-spacing-2)" }} />
          <div className="h-4 rounded bg-primary/10 border border-primary/20" style={{ width: "var(--token-spacing-4)" }} />
          <div className="h-4 rounded bg-primary/10 border border-primary/20" style={{ width: "var(--token-spacing-6)" }} />
          <div className="h-4 rounded bg-primary/10 border border-primary/20" style={{ width: "var(--token-spacing-8)" }} />
        </div>
        <p className="text-xs font-mono text-muted-foreground">
          --token-spacing-1: 0.25rem | --token-spacing-2: 0.5rem | --token-spacing-4: 1rem | --token-spacing-6: 1.5rem | --token-spacing-8: 2rem
        </p>
      </section>

      {/* Pilot Radius */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Pilot Radius</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 border-2 border-primary" style={{ borderRadius: "var(--radius)" }} />
        </div>
        <p className="text-xs font-mono text-muted-foreground">--radius: 0.625rem</p>
      </section>
    </div>
  ),
};

export const PilotTokensDark: Story = {
  decorators: [
    (Story) => (
      <div className="dark">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="space-y-8 p-4">
      {/* Pilot Color (dark) */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Pilot Dark Theme</h3>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded border border-border" style={{ backgroundColor: "var(--primary)" }} />
        </div>
        <p className="text-xs font-mono text-muted-foreground">
          --primary: var(--primary) (should be #e5e5e5 in dark)
        </p>
      </section>

      {/* Pilot Spacing (dark) */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Pilot Spacing (Dark)</h3>
        <div className="space-y-2">
          <div className="h-4 rounded bg-primary/10 border border-primary/20" style={{ width: "var(--token-spacing-1)" }} />
          <div className="h-4 rounded bg-primary/10 border border-primary/20" style={{ width: "var(--token-spacing-2)" }} />
          <div className="h-4 rounded bg-primary/10 border border-primary/20" style={{ width: "var(--token-spacing-4)" }} />
          <div className="h-4 rounded bg-primary/10 border border-primary/20" style={{ width: "var(--token-spacing-6)" }} />
          <div className="h-4 rounded bg-primary/10 border border-primary/20" style={{ width: "var(--token-spacing-8)" }} />
        </div>
        <p className="text-xs font-mono text-muted-foreground">
          --token-spacing-1: 0.25rem | --token-spacing-2: 0.5rem | --token-spacing-4: 1rem | --token-spacing-6: 1.5rem | --token-spacing-8: 2rem
        </p>
      </section>

      {/* Pilot Radius (dark) */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Pilot Radius (Dark)</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 border-2 border-primary" style={{ borderRadius: "var(--radius)" }} />
        </div>
        <p className="text-xs font-mono text-muted-foreground">--radius: 0.625rem</p>
      </section>
    </div>
  ),
};