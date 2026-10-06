import { describe, expect, it } from "vitest";
import { filterProjects, matchesQuery, statusCounts } from "./project-filter";

const p = (title: string, over: Partial<{ summary: string; category: string; status: string; techStack: string[] }> = {}) => ({
  title,
  summary: "",
  category: "",
  status: "",
  techStack: [] as string[],
  ...over,
});

const items = [
  p("Homelab Orchestrator", { summary: "Wakes Proxmox nodes", category: "Homelab", status: "ongoing", techStack: ["Python", "Docker"] }),
  p("Switching Pro", { summary: "Velocity plugin", category: "Games", status: "discontinued", techStack: ["Java"] }),
  p("My Dutch Bike", { summary: "PSX style sim", category: "Games", status: "on_hold", techStack: ["Unity"] }),
  p("Untitled idea"),
];

describe("project search", () => {
  it("needs every word to match somewhere in title, summary, category, status or tech", () => {
    expect(matchesQuery(items[0], "proxmox python")).toBe(true);
    expect(matchesQuery(items[0], "proxmox java")).toBe(false);
    expect(matchesQuery(items[0], "")).toBe(true);
    expect(matchesQuery(items[0], "  HOMELAB ")).toBe(true);
  });

  it("finds projects by their visible status label too", () => {
    expect(filterProjects(items, { query: "on hold", status: "", labels: { on_hold: "On hold" } }).map((x) => x.title)).toEqual(["My Dutch Bike"]);
  });
});

describe("project filter", () => {
  it("combines status and search", () => {
    expect(filterProjects(items, { query: "", status: "ongoing" }).map((x) => x.title)).toEqual(["Homelab Orchestrator"]);
    expect(filterProjects(items, { query: "games", status: "discontinued" }).map((x) => x.title)).toEqual(["Switching Pro"]);
    expect(filterProjects(items, { query: "", status: "" })).toHaveLength(4);
  });

  it("counts the statuses that occur, in a fixed order", () => {
    expect(statusCounts(items)).toEqual([
      { status: "ongoing", count: 1 },
      { status: "on_hold", count: 1 },
      { status: "discontinued", count: 1 },
    ]);
  });
});
