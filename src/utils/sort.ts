/**
 * Shared sort functions for consistent sorting across the project.
 * Controllers import these. UI components never sort directly.
 */

export const sortByNameAsc = <T extends { name: string }>(a: T, b: T): number =>
  a.name.localeCompare(b.name);

export const sortByNameDesc = <T extends { name: string }>(a: T, b: T): number =>
  b.name.localeCompare(a.name);

export const sortByDateDesc = <T extends { createdAt: string }>(a: T, b: T): number =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export const sortByDateAsc = <T extends { createdAt: string }>(a: T, b: T): number =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
