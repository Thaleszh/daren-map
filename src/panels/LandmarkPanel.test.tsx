// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Atlas } from "@/domain/selectors";
import { loadWorld } from "@/domain/world";
import { makeWorld } from "@/domain/world.fixture";
import type { DistrictId, FactionId, LevelId } from "@/domain/ids";
import { LandmarkPanel } from "./LandmarkPanel";

function atlasWithLandmark() {
  const input = makeWorld();
  input.landmarks!.push({
    id: "lm-1",
    levelId: "surface" as LevelId,
    districtId: "centro" as DistrictId,
    name: "Teatro de Sanvil",
    category: "culture",
    position: { x: 20, y: 20 },
    description: "Casa de espetáculos da cidade.",
    factionId: "coroa" as FactionId,
  });
  return new Atlas(loadWorld(input));
}

describe("LandmarkPanel", () => {
  it("renders the category eyebrow with district, title and description", () => {
    const atlas = atlasWithLandmark();
    render(<LandmarkPanel atlas={atlas} landmark={atlas.world.landmarks[0]!} />);
    // "culture" → glyph ♪ + label "Cultura", followed by the district name.
    expect(screen.getByText(/Cultura · Centro/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Teatro de Sanvil" })).toBeInTheDocument();
    expect(screen.getByText("Casa de espetáculos da cidade.")).toBeInTheDocument();
  });

  it("shows the associated faction section", () => {
    const atlas = atlasWithLandmark();
    render(<LandmarkPanel atlas={atlas} landmark={atlas.world.landmarks[0]!} />);
    expect(screen.getByText("Facção associada")).toBeInTheDocument();
    expect(screen.getByText("Coroa")).toBeInTheDocument();
  });

  it("omits the faction section for a landmark with no faction", () => {
    const input = makeWorld();
    input.landmarks!.push({
      id: "lm-2",
      levelId: "surface" as LevelId,
      name: "Fonte Antiga",
      category: "other",
      position: { x: 30, y: 30 },
    });
    const atlas = new Atlas(loadWorld(input));
    render(<LandmarkPanel atlas={atlas} landmark={atlas.world.landmarks[0]!} />);
    expect(screen.getByRole("heading", { name: "Fonte Antiga" })).toBeInTheDocument();
    expect(screen.queryByText("Facção associada")).not.toBeInTheDocument();
  });
});
