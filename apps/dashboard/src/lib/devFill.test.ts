import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { z } from 'zod'
import { buildFill } from './devFill'
import {
  assessmentSchema,
  driverSchema,
  examSchema,
  studentSchema,
  teacherPersonalSchema,
  teacherProfessionalSchema,
} from './validations'

describe('buildFill', () => {
  test('reads Zod 4 enums, booleans, and wrapped values', () => {
    const schema = z.object({
      status: z.enum(['active', 'inactive']),
      enabled: z.boolean().optional().default(false),
      name: z.string(),
    })

    const fill = buildFill(schema)

    assert.ok(['active', 'inactive'].includes(fill.status))
    assert.equal(fill.enabled, true)
    assert.equal(typeof fill.name, 'string')
  })

  test('builds nested objects and object arrays', () => {
    const schema = z.object({
      profile: z.object({ name: z.string() }),
      parents: z.array(z.object({
        relationshipType: z.enum(['mother', 'father']),
        isEmergencyContact: z.boolean(),
      })),
    })

    const fill = buildFill(schema)

    assert.equal(typeof fill.profile.name, 'string')
    assert.equal(fill.parents.length, 1)
    assert.ok(['mother', 'father'].includes(fill.parents[0].relationshipType))
    assert.equal(fill.parents[0].isEmergencyContact, true)
  })

  test('uses Moroccan seed data for person fields', () => {
    const schema = z.object({
      studentCode: z.string(),
      classId: z.string(),
      name: z.string(),
      email: z.string(),
      phone: z.string(),
      address: z.string(),
      dateOfBirth: z.string(),
      gender: z.enum(['M', 'F']),
      medicalConditions: z.string(),
      previousSchool: z.string(),
    })

    const fill = buildFill(schema, { classId: 'class-1' })

    assert.match(fill.studentCode, /^STU\d{6}$/)
    assert.doesNotMatch(fill.name, /Test|Alpha|Beta|Gamma|Omega/)
    assert.match(fill.email, /^[a-z0-9._]+@[a-z0-9.-]+\.[a-z]{2,}$/)
    assert.match(fill.phone, /^212[567]\d{8}$/)
    assert.match(fill.address, /^\d+, .+, .+$/)
    assert.match(fill.dateOfBirth, /^\d{4}-\d{2}-\d{2}$/)
  })

  test('builds a valid student with nullable hidden map coordinates', () => {
    const fill = buildFill(studentSchema, {
      classId: 'CL1',
      sectionId: 'SC1',
    })

    assert.equal(fill.addressLatitude, null)
    assert.equal(fill.addressLongitude, null)
    assert.equal(studentSchema.safeParse(fill).success, true)
  })

  test('keeps parent relationship consistent with generated gender', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string(),
      phone: z.string(),
      gender: z.enum(['M', 'F']),
      cin: z.string(),
      relationshipType: z.enum(['mother', 'father', 'guardian']),
    })

    const fill = buildFill(schema)

    assert.equal(fill.relationshipType, fill.gender === 'F' ? 'mother' : 'father')
  })

  test('uses existing entity generators for domain forms', () => {
    const relationOverrides = {
      classId: 'CL1',
      sectionId: 'SC1',
      subjectId: 'SU1',
      teacherId: 'TE1',
    }
    const cases = [
      [teacherPersonalSchema, {}],
      [teacherProfessionalSchema, {}],
      [driverSchema, {}],
      [examSchema, relationOverrides],
      [assessmentSchema, relationOverrides],
    ] as const

    for (const [schema, overrides] of cases) {
      assert.equal(schema.safeParse(buildFill(schema, overrides)).success, true)
    }
  })
})
