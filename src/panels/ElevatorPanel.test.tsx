// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Atlas } from "@/domain/selectors";
import { loadWorld } from "@/domain/world";
import { makeWorld } from "@/domain/world.fixture";
import type { LevelId } from "@/domain/ids";
import { ElevatorPanel } from "./ElevatorPanel";

function setup(currentLevelId: "surface" | "l1" = "surface") {
  const atlas = new Atlas(loadWorld(makeWorld()));
  const elevator = atlas.world.elevators[0]!; // reaches surface + l1
  const onGoToLevel = vi.fn();
  render(
    <ElevatorPanel
      atlas={atlas}
      elevator={elevator}
      currentLevelId={currentLevelId as LevelId}
      onGoToLevel={onGoToLevel}
    />,
  );
  return { onGoToLevel };
}

describe("ElevatorPanel", () => {
  it("lists the reachable levels in depth order with the count", () => {
    setup();
    expect(screen.getByText("Poço Central")).toBeInTheDocument();
    expect(screen.getByText("Acessos (2 níveis)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Superfície/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /-1/ })).toBeInTheDocument();
  });

  it("marks the current level as 'aqui' and disables it", () => {
    setup("surface");
    const current = screen.getByRole("button", { name: /Superfície/ });
    expect(current).toBeDisabled();
    expect(current).toHaveTextContent("aqui");
  });

  it("calls onGoToLevel with the target level when another stop is clicked", async () => {
    const { onGoToLevel } = setup("surface");
    await userEvent.click(screen.getByRole("button", { name: /-1/ }));
    expect(onGoToLevel).toHaveBeenCalledOnce();
    expect(onGoToLevel).toHaveBeenCalledWith("l1");
  });

  it("does not fire when the current-level row is clicked", async () => {
    const { onGoToLevel } = setup("l1");
    // From -1, the surface row is now the clickable one; the -1 row is disabled.
    await userEvent.click(screen.getByRole("button", { name: /-1/ }));
    expect(onGoToLevel).not.toHaveBeenCalled();
  });
});
