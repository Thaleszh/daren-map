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

  it("switches to the expeditions view and shows the newest expedition", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Expedições" }));
    expect(screen.queryByRole("group", { name: /Mapa de/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Escolinha da guarda");
  });

  it("restores an expedition selection from the URL hash", () => {
    window.location.hash = "#view=expeditions&sel=expedition:exp-irvantir";
    render(<App />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Exploração de Irvantir");
  });

  it("switches to the relations view", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Relações" }));
    expect(screen.queryByRole("group", { name: /Mapa de/ })).not.toBeInTheDocument();
    expect(screen.getByText("Histórico")).toBeInTheDocument();
  });

  it("shows a faction's history and jumps to the linked expedition", async () => {
    window.location.hash = "#view=relations&sel=faction:ortar";
    render(<App />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Ortar");
    expect(screen.getByText("Os pioneiros voltam com o maringo")).toBeInTheDocument();
    // Both Ortar events happened on the same expedition; either link will do.
    await userEvent.click(screen.getAllByRole("button", { name: /^Expedição: Pioneiros/ })[0]!);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Pioneiros das Frutas do Leste",
    );
  });

  it("restores the initiatives view from the URL hash", () => {
    window.location.hash = "#view=initiatives";
    render(<App />);
    // Seeded straight into the initiatives view — no map stage rendered.
    expect(screen.queryByRole("group", { name: /Mapa de/ })).not.toBeInTheDocument();
  });
});
