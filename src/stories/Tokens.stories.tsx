import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const tokens = [
  "background", "foreground", "primary", "primary-foreground",
  "secondary", "muted", "accent", "destructive", "border", "ring",
  "card", "popover",
];

const meta: Meta = {
  title: "Design Tokens/Colors",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const Palette: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4 p-4">
      {tokens.map((t) => (
        <div key={t} className="space-y-1">
          <div
            className="h-16 rounded-md border border-border"
            style={{ backgroundColor: `var(--${t})` }}
          />
          <p className="text-xs font-mono text-muted-foreground">--{t}</p>
        </div>
      ))}
    </div>
  ),
};