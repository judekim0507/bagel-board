import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import type { Database } from '$lib/database.types';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

export const menuItems = writable<MenuItem[]>([]);

export async function fetchMenu() {
    const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true)
        .order('category', { ascending: false }) // grouping manually later
        .order('name');
    
    if (data && !error) {
        menuItems.set(data);
    }
}
