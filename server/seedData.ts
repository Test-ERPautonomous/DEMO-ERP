/**
 * Seed data operations permanently disabled for production.
 * Supabase PostgreSQL is the SINGLE permanent source of truth.
 * Application startup NEVER deletes, truncates, or resets data.
 */

export function seedDatabase(_force: boolean = false) {
  // Destructive startup seeding permanently disabled for Supabase PostgreSQL production persistence.
  return;
}

export function seedMastersIfEmpty() {
  // Disabled - all data reads directly from Supabase PostgreSQL.
  return;
}
