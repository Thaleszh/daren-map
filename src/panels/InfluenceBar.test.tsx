// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Atlas } from "@/domain/selectors";
import { loadWorld } from "@/domain/world";
import { makeWorld } from "@/domain/world.fixture";
import type { AreaId } from "@/domain/ids";
import { InfluenceBar } from "./InfluenceBar";

const atlas = () => new Atlas(loadWorld(makeWorld()));

describe("InfluenceBar", () => {
  it("labels the bar with each faction's share and renders one segment each", () => {
    const standings = atlas().standings("centro-s" as AreaId); // Coroa 75%, Guilda 25%
    const { container } = render(<InfluenceBar standings={standings} />);
    const bar = screen.getByRole("img");
    expect(bar).toHaveAttribute("aria-label", "Coroa 75%, Guilda 25%");
    expect(container.querySelectorAll(".infbar__seg")).toHaveLength(2);
    const coroa = container.querySelector<HTMLElement>(".infbar__seg")!;
    expect(coroa.style.width).toBe("75%");
    expect(coroa.style.background).toBe("rgb(255, 0, 0)");
  });

  it("renders an inert, unlabeled bar when there are no standings", () => {
    const { container } = render(<InfluenceBar standings={[]} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    const bar = container.querySelector(".infbar")!;
    expect(bar).toHaveAttribute("aria-hidden");
    expect(container.querySelectorAll(".infbar__seg")).toHaveLength(0);
  });
});
