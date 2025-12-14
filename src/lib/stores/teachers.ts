import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import type { Database } from '$lib/database.types';

type Teacher = Database['public']['Tables']['teachers']['Row'];

export const teachers = writable<Teacher[]>([]);

export async function fetchTeachers() {
    const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('name');
    
    if (data && !error) {
        teachers.set(data);
    }
}
