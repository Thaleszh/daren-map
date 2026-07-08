// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Atlas } from "@/domain/selectors";
import { loadWorld } from "@/domain/world";
import { makeWorld } from "@/domain/world.fixture";
import type { AreaId } from "@/domain/ids";
import { AreaPanel } from "./AreaPanel";

function setup() {
  const atlas = new Atlas(loadWorld(makeWorld()));
  const area = atlas.area("centro-s" as AreaId)!;
  render(<AreaPanel atlas={atlas} area={area} />);
  return { atlas };
}

describe("AreaPanel", () => {
  it("shows the district eyebrow with the slice position and the area title", () => {
    setup();
    // Centro spans two levels; centro-s is the first (surface) slice.
    expect(screen.getByText(/Centro · nível 1\/2/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Centro (superfície)" })).toBeInTheDocument();
  });

  it("lists per-level standings with control shares and raw power/influence", () => {
    setup();
    expect(screen.getByText("Controle neste nível (fatia de influência)")).toBeInTheDocument();
    // Coroa/Guilda appear in both this section and the district rollup below.
    expect(screen.getAllByText("Coroa").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Guilda").length).toBeGreaterThanOrEqual(1);
    // Coroa 6/8 = 75%, Guilda 2/8 = 25%.
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    // Guilda's per-level line (pow 4 · inf 2) is distinct from its rollup total.
    expect(screen.getByText("pow 4 · inf 2")).toBeInTheDocument();
  });

  it("rolls district influence up across every level slice", () => {
    setup();
    // Coroa 6, Guilda 2 + 4 = 6 → 50% / 50% across the two centro slices.
    expect(screen.getByText("Centro — controle em todos os 2 níveis")).toBeInTheDocument();
    expect(screen.getAllByText("50%").length).toBeGreaterThanOrEqual(2);
  });

  it("renders the population section with total and race legend", () => {
    setup();
    expect(screen.getByText("População")).toBeInTheDocument();
    expect(screen.getByText(/1k/)).toBeInTheDocument(); // ≈ 1k habitantes
    // Humans are the computed remainder: 1000 - (100 + 50) = 850.
    expect(screen.getByText(/Humanos · 850/)).toBeInTheDocument();
    expect(screen.getByText(/Anões · 100/)).toBeInTheDocument();
  });

  it("lists NPCs whose home district is this one", () => {
    setup();
    expect(screen.getByText("Pessoas")).toBeInTheDocument();
    expect(screen.getByText("Regente")).toBeInTheDocument();
    // Andarilho has no district and must not appear here.
    expect(screen.queryByText("Andarilho")).not.toBeInTheDocument();
  });

  it("shows the empty-presence note for an area with no factions", () => {
    const atlas = new Atlas(loadWorld(makeWorld()));
    render(<AreaPanel atlas={atlas} area={atlas.area("porto-s" as AreaId)!} />);
    expect(screen.getByText("Nenhuma presença de facção registrada aqui.")).toBeInTheDocument();
    // Single-slice district: no cross-level rollup section.
    expect(screen.queryByText(/controle em todos os/)).not.toBeInTheDocument();
  });

  it("renders an initiative that affects the area", () => {
    const input = makeWorld();
    input.initiatives!.push({
      id: "init-1",
      name: "Reforma do Porto",
      summary: "Recuperar as docas",
      status: "active",
      progress: 40,
      areaIds: ["centro-s" as AreaId],
    });
    const atlas = new Atlas(loadWorld(input));
    render(<AreaPanel atlas={atlas} area={atlas.area("centro-s" as AreaId)!} />);
    const section = screen.getByText("Iniciativas da guilda aqui");
    expect(section).toBeInTheDocument();
    expect(screen.getByText("Reforma do Porto")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(within(section.parentElement!).getByText("active")).toBeInTheDocument();
  });
});
