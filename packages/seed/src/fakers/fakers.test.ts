import { describe, expect, it } from "bun:test";

import {
  createId,
  getSubjectByName,
  getSubjectsNames,
  randomDriver,
  schedule,
} from "./fakers";

describe("faker helpers", () => {
  it("pads generated ids with the requested width", () => {
    expect(createId("SC", 3, 2)).toBe("SC03");
    expect(createId("CLS", 12, 4)).toBe("CLS0012");
  });

  it("uses one-time scheduling for one-time payment types", () => {
    expect(schedule("oneTime")).toBe("oneTime");
  });

  it("uses a recurring schedule for recurring payment types", () => {
    expect(["monthly", "quarterly", "semester", "annually"]).toContain(
      schedule("recurring"),
    );
  });

  it("returns null for empty driver pools and the selected driver id otherwise", () => {
    expect(randomDriver([])).toBeNull();
    expect(randomDriver([{ id: "DRV01" }])).toBe("DRV01");
  });

  it("can resolve exported subjects by name", () => {
    const firstSubjectName = getSubjectsNames()[0];

    expect(firstSubjectName).toBeTruthy();
    expect(getSubjectByName(firstSubjectName)?.name).toBe(firstSubjectName);
  });
});
