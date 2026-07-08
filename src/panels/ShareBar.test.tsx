// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShareBar } from "./ShareBar";

const items = [
  { label: "Baixa", color: "#111111", share: 0.2 },
  { label: "Média", color: "#222222", share: 0.6 },
  { label: "Alta", color: "#333333", share: 0.2 },
];

describe("ShareBar", () => {
  it("sorts segments by share descending and labels them as percentages", () => {
    const { container } = render(<ShareBar items={items} />);
    // Sorted: Média 60%, then Baixa/Alta 20% each.
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Média 60%, Baixa 20%, Alta 20%");
    const segs = container.querySelectorAll<HTMLElement>(".infbar__seg");
    expect(segs).toHaveLength(3);
    expect(segs[0]!.style.width).toBe("60%");
  });

  it("normalizes against the summed share when items don't total 1", () => {
    // Shares sum to 4 → each renders as 25%.
    const { container } = render(
      <ShareBar
        items={[
          { label: "A", color: "#111111", share: 1 },
          { label: "B", color: "#222222", share: 3 },
        ]}
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "B 75%, A 25%");
    const segs = container.querySelectorAll<HTMLElement>(".infbar__seg");
    expect(segs[0]!.style.width).toBe("75%");
  });

  it("renders a legend entry per item", () => {
    render(<ShareBar items={items} />);
    expect(screen.getByText(/Média · 60%/)).toBeInTheDocument();
    expect(screen.getByText(/Baixa · 20%/)).toBeInTheDocument();
  });
});
