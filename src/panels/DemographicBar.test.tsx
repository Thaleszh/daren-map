// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Atlas } from "@/domain/selectors";
import { loadWorld } from "@/domain/world";
import { makeWorld } from "@/domain/world.fixture";
import type { DistrictId } from "@/domain/ids";
import { DemographicBar } from "./DemographicBar";

describe("DemographicBar", () => {
  it("shows the total and a labeled proportional bar of race shares", () => {
    const atlas = new Atlas(loadWorld(makeWorld()));
    const demographics = atlas.demographics("centro" as DistrictId)!; // 850 human / 100 dwarf / 50 elf
    const { container } = render(<DemographicBar demographics={demographics} />);

    expect(screen.getByText(/1k/)).toBeInTheDocument(); // ≈ 1k habitantes
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "Humanos 85%, Anões 10%, Elfos 5%",
    );
    expect(container.querySelectorAll(".infbar__seg")).toHaveLength(3);
  });

  it("lists a legend entry per race with counts, and a percent for minorities", () => {
    const atlas = new Atlas(loadWorld(makeWorld()));
    render(<DemographicBar demographics={atlas.demographics("centro" as DistrictId)!} />);
    // Humans (the remainder) show a count but no percent suffix.
    expect(screen.getByText(/Humanos · 850/)).toBeInTheDocument();
    expect(screen.getByText(/Anões · 100/)).toBeInTheDocument();
    expect(screen.getByText(/\(10%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Elfos · 50/)).toBeInTheDocument();
  });
});
