import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = 'https://ajpzroepfitjngsfjkmu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcHpyb2VwZml0am5nc2Zqa211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTY3NDQsImV4cCI6MjA4MTE3Mjc0NH0.-19Qiy_lNwyJdudsab2N36U3yryXJ7exAXAt9wsJ7L4';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
