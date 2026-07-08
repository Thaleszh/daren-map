// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Atlas } from "@/domain/selectors";
import { loadWorld } from "@/domain/world";
import { makeWorld } from "@/domain/world.fixture";
import { MapView } from "./MapView";

function setup() {
  const atlas = new Atlas(loadWorld(makeWorld()));
  const surface = atlas.levels().find((l) => l.depth === 0)!;
  const onSelectArea = vi.fn();
  render(
    <MapView
      atlas={atlas}
      level={surface}
      selectedAreaId={null}
      selectedLandmarkId={null}
      selectedElevatorId={null}
      onSelectArea={onSelectArea}
      onSelectLandmark={vi.fn()}
      onSelectElevator={vi.fn()}
    />,
  );
  return { atlas, onSelectArea };
}

describe("MapView", () => {
  it("labels the stage and renders the areas on the level", () => {
    setup();
    expect(screen.getByRole("group", { name: /Mapa de Superfície/ })).toBeInTheDocument();
    expect(screen.getByText("Centro (superfície)")).toBeInTheDocument();
    expect(screen.getByText("Porto")).toBeInTheDocument();
    // An area from another level must not leak in.
    expect(screen.queryByText("Centro (-1)")).not.toBeInTheDocument();
  });

  it("invokes onSelectArea when an area is activated", async () => {
    const { onSelectArea } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Centro (superfície)" }));
    expect(onSelectArea).toHaveBeenCalledOnce();
    expect(onSelectArea.mock.calls[0]![0].id).toBe("centro-s");
  });

  it("recomputes captions when the lens changes", async () => {
    setup();
    // Default "dominant" lens: Coroa holds 6/8 of centro-s.
    expect(screen.getByText("Coroa · 75%")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox"), "contested");
    expect(screen.queryByText("Coroa · 75%")).not.toBeInTheDocument();
    expect(screen.getByText("2 facções")).toBeInTheDocument();
  });

  it("toggles markers off and on", async () => {
    setup();
    const elevator = { name: "Elevador Poço Central" };
    expect(screen.getByRole("button", { name: elevator.name })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: /Marcadores/ }));
    expect(screen.queryByRole("button", { name: elevator.name })).not.toBeInTheDocument();
  });
});
