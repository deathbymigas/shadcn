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

const tokens = [
  "background", "foreground", "primary", "primary-foreground",
  "secondary", "muted", "accent", "destructive", "border", "ring",
  "card", "popover",
];

export const Palette: Story = {
  render: () => (
    <div
      className="bg-background text-foreground"
      style={{ backgroundColor: "var(--background, Canvas)", color: "var(--foreground, CanvasText)" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "calc(var(--spacing, 0.25rem) * 4)",
          padding: "calc(var(--spacing, 0.25rem) * 4)",
        }}
      >
        {tokens.map((t) => (
          <div key={t} style={{ display: "grid", gap: "calc(var(--spacing, 0.25rem) * 1)" }}>
            <div
              style={{
                height: "calc(var(--spacing, 0.25rem) * 16)",
                borderRadius: "var(--radius-md, 0.375rem)",
                border: "1px solid var(--border, CanvasText)",
                backgroundColor: `var(--${t}, Canvas)`,
              }}
            />
            <p
              style={{
                color: "var(--muted-foreground, CanvasText)",
                fontSize: "0.75rem",
                fontFamily: "var(--font-family-mono, monospace)",
              }}
            >
              --{t}
            </p>
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: "calc(var(--spacing, 0.25rem) * 4)",
        padding: "calc(var(--spacing, 0.25rem) * 4)",
      }}
    >
      {tokens.map((t) => (
        <div key={t} style={{ display: "grid", gap: "calc(var(--spacing, 0.25rem) * 1)" }}>
          <div
            style={{
              height: "calc(var(--spacing, 0.25rem) * 16)",
              borderRadius: "var(--radius-md, 0.375rem)",
              border: "1px solid var(--border, CanvasText)",
              backgroundColor: `var(--${t}, Canvas)`,
            }}
          />
          <p
            style={{
              color: "var(--muted-foreground, CanvasText)",
              fontSize: "0.75rem",
              fontFamily: "var(--font-family-mono, monospace)",
            }}
          >
            --{t}
          </p>
        </div>
      ))}
    </div>
  ),
};
