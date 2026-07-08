// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

afterEach(() => {
  // App seeds its view from the URL hash; keep tests independent of each other.
  window.location.hash = "";
});

describe("App", () => {
  it("renders the atlas view with a labeled map and the empty-selection prompt", () => {
    render(<App />);
    expect(screen.getByRole("group", { name: /Mapa de/ })).toBeInTheDocument();
    expect(screen.getByText(/Selecione uma área/)).toBeInTheDocument();
  });

  it("switches to the initiatives view and back", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Iniciativas" }));
    expect(screen.queryByRole("group", { name: /Mapa de/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Atlas" }));
    expect(screen.getByRole("group", { name: /Mapa de/ })).toBeInTheDocument();
  });

  it("announces the selected area in the live region", () => {
    const { container } = render(<App />);
    const area = container.querySelector(".area");
    expect(area).not.toBeNull();
    fireEvent.click(area!);
    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/^Área selecionada: .+/);
  });

  it("restores the initiatives view from the URL hash", () => {
    window.location.hash = "#view=initiatives";
    render(<App />);
    // Seeded straight into the initiatives view — no map stage rendered.
    expect(screen.queryByRole("group", { name: /Mapa de/ })).not.toBeInTheDocument();
  });
});
