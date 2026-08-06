import { describe, expect, it } from "bun:test";

import {
  generateFamilyUnit,
  generateFees,
  generateParents,
  generateStudent,
  INITIAL_FEE_TYPES,
  OPTIONAL_FEE_TYPES,
} from "./entities";

describe("entity generators", () => {
  it("generates two parents with a shared household address", () => {
    const [father, mother] = generateParents();

    expect(father.gender).toBe("M");
    expect(mother.gender).toBe("F");
    expect(father.address).toBe(mother.address);
  });

  it("preserves explicit student overrides", () => {
    const student = generateStudent({
      id: "STU01",
      firstName: "Sara",
      lastName: "Test",
      classId: "CL01",
      sectionId: "SC01",
      address: "1 Main St",
      parentIds: ["PAR01", "PAR02"],
    });

    expect(student.id).toBe("STU01");
    expect(student.name).toBe("Sara Test");
    expect(student.classId).toBe("CL01");
    expect(student.sectionId).toBe("SC01");
    expect(student.address).toBe("1 Main St");
    expect(student.parentIds).toEqual(["PAR01", "PAR02"]);
  });

  it("derives family metadata from the generated parents", () => {
    const family = generateFamilyUnit();

    expect(family.parents).toHaveLength(2);
    expect(family.parentIds).toEqual(family.parents.map((parent) => parent.id));
    expect(family.address).toBe(family.parents[0].address);
    expect(family.lastName).toBe(family.parents[0].name.split(" ").pop());
    expect([1, 2, 3]).toContain(family.childCount);
  });

  it("always includes mandatory fees and respects optional fee probabilities", () => {
    const requiredFeeTypeIds = INITIAL_FEE_TYPES.map((feeType) => feeType?.id);
    const optionalFeeTypeIds = OPTIONAL_FEE_TYPES.map((feeType) => feeType?.id);

    expect(requiredFeeTypeIds).not.toContain(undefined);
    expect(optionalFeeTypeIds).not.toContain(undefined);

    const noOptionalFees = generateFees({
      studentId: "STU01",
      policy: {
        SCHEDULE: { MONTHLY_PROBABILITY: 1 },
        FEES: { TRANSPORT: 0, CAFETERIA: 0, UNIFORM: 0, BOOKS: 0, SPORTS: 0, TECHNOLOGY: 0, FIELD_TRIP: 0 },
      },
    });

    expect(noOptionalFees).toHaveLength(INITIAL_FEE_TYPES.length);
    expect(noOptionalFees.map((fee) => fee.studentId)).toEqual(["STU01", "STU01"]);
    expect(noOptionalFees.map((fee) => fee.feeTypeId).sort()).toEqual(
      [...(requiredFeeTypeIds as string[])].sort(),
    );

    const allOptionalFees = generateFees({
      studentId: "STU01",
      policy: {
        SCHEDULE: { MONTHLY_PROBABILITY: 1 },
        FEES: { TRANSPORT: 1, CAFETERIA: 1, UNIFORM: 1, BOOKS: 1, SPORTS: 1, TECHNOLOGY: 1, FIELD_TRIP: 1 },
      },
    });

    expect(allOptionalFees).toHaveLength(
      INITIAL_FEE_TYPES.length + OPTIONAL_FEE_TYPES.length,
    );
    expect(allOptionalFees.every((fee) => ["monthly", "oneTime"].includes(fee.schedule))).toBe(
      true,
    );
  });
});
