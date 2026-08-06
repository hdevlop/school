
import * as fs from 'fs/promises';
import * as path from 'path';
import _isEmpty from 'lodash.isempty';
import { SQL, sql } from 'drizzle-orm';
import { AnyPgColumn } from 'drizzle-orm/pg-core';
import { Readable } from 'stream';
import { getBusinessDate } from './businessDate';

export {
  getBusinessClockInfo,
  getBusinessDate,
  getBusinessDateOnly,
  getBusinessDateOverride,
} from './businessDate';

export const avatarsPath = path.join(process.cwd(), 'avatars');

export const clean = (obj: any): any => {
  const cleaned = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

export const getAvatarFile = async (fileName) => {
  try {
    const filePath = path.join(avatarsPath, fileName);
    const buffer: any = await fs.readFile(filePath);
    const file = new File([buffer], fileName, {
      type: 'image/png'
    });
    return file;
  }
  catch (error) {
    return null;
  }
}

export const formatDate = (dateValue) => {
  if (!dateValue) return null;

  let date: Date;

  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else {
    return null;
  }

  if (isNaN(date.getTime())) return null;

  return date.toISOString().split('T')[0];
}

export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;

  const formattedDate = formatDate(dateOfBirth);
  if (!formattedDate) return null;

  const birth = new Date(formattedDate);
  const today = getBusinessDate();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

export function calculateYearsOfExperience(hireDate) {
  if (!hireDate) return null;

  const formattedDate = formatDate(hireDate);
  if (!formattedDate) return null;

  const hire = new Date(formattedDate);
  const today = getBusinessDate();
  let years = today.getFullYear() - hire.getFullYear();
  const monthDiff = today.getMonth() - hire.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < hire.getDate())) {
    years--;
  }

  return years;
}

export function pickProps<T>(source: T, keys): Partial<T> {
  const result = {};

  for (const key of keys) {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }

  return result;
}

export const isEmpty = _isEmpty;

export function jsonAgg(
  fields: Record<string, AnyPgColumn | SQL>,
  orderBy?: AnyPgColumn | SQL
) {
  const fieldEntries = Object.entries(fields);
  const jsonBuildArgs = fieldEntries.flatMap(([key, column]) => [
    sql.raw(`'${key}'`),
    column
  ]);

  let aggregation = sql`json_agg(json_build_object(${sql.join(jsonBuildArgs, sql`, `)})`;

  if (orderBy) {
    aggregation = sql`${aggregation} ORDER BY ${orderBy}`;
  }

  aggregation = sql`${aggregation})`;

  // Wrap with COALESCE to return empty array instead of null
  return sql`COALESCE(${aggregation}, '[]'::json)`;
}

export function jsonAggSubquery(
  fields: Record<string, AnyPgColumn | SQL>,
  from: any,
  where: SQL,
  orderBy?: AnyPgColumn | SQL
) {
  const fieldEntries = Object.entries(fields);
  const jsonBuildArgs = fieldEntries.flatMap(([key, column]) => [
    sql.raw(`'${key}'`),
    column
  ]);

  let aggregation = sql`
    SELECT json_agg(DISTINCT json_build_object(${sql.join(jsonBuildArgs, sql`, `)}))
    FROM ${from}
    WHERE ${where}
  `;

  if (orderBy) {
    aggregation = sql`
      SELECT json_agg(json_build_object(${sql.join(jsonBuildArgs, sql`, `)}) ORDER BY ${orderBy})
      FROM ${from}
      WHERE ${where}
    `;
  }

  return sql`COALESCE((${aggregation}), '[]'::json)`;
}

export const isPath = (img) =>
  typeof img === 'string' && img.trim().length > 0 && (img.startsWith('/') || img.startsWith('http') || img.startsWith('storage/'));


export const isFile = (img) =>
  !!img && typeof img !== 'string' && img instanceof File;
