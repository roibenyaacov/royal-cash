import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
// Uses environment variables in production, falls back to defaults for development
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gfchswspvayyvdlxbggw.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY2hzd3NwdmF5eXZkbHhiZ2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MDI1NTUsImV4cCI6MjA3OTM3ODU1NX0.5vIkcgyGEWEW3uI5Y2bJKG7Ex2uhIAsUtC8US6BFVtA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// UUID validation regex
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validate UUID
export function isValidUUID(uuid: string | null | undefined): boolean {
  if (!uuid || uuid === 'null' || uuid === 'undefined' || typeof uuid !== 'string') {
    return false;
  }
  return UUID_REGEX.test(uuid);
}
