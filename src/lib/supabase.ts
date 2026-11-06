import { createClient } from '@supabase/supabase-js';

const url = (import.meta as any).env?.VITE_SUPABASE_URL;
const key = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(url, key);
