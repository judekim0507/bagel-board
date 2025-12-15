import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import type { Database } from '$lib/database.types';

export type Order = Database['public']['Tables']['orders']['Row'] & {
    order_items: (Database['public']['Tables']['order_items']['Row'] & {
        menu_items: Database['public']['Tables']['menu_items']['Row'] | null
    })[]
};

export type SeatAssignment = Database['public']['Tables']['seat_assignments']['Row'] & {
    teachers: Database['public']['Tables']['teachers']['Row'] | null
};

export const orders = writable<Order[]>([]);
export const seatAssignments = writable<SeatAssignment[]>([]);
export const seats = writable<Database['public']['Tables']['seats']['Row'][]>([]);

let initializing: Promise<void> | null = null;
let subscriptionsSet = false;

export function initRealtime() {
    if (!initializing) {
        initializing = setupRealtime();
    }
    return initializing;
}

async function setupRealtime() {
    await Promise.all([fetchOrders(), fetchSeatAssignments(), fetchSeats()]);

    if (subscriptionsSet) return;
    subscriptionsSet = true;

    supabase
        .channel('public:orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            fetchOrders();
        })
        .subscribe();

    supabase
        .channel('public:order_items')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
            fetchOrders();
        })
        .subscribe();

    supabase
        .channel('public:seat_assignments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'seat_assignments' }, () => {
            fetchSeatAssignments();
        })
        .subscribe();
}

export async function fetchOrders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (
                *,
                menu_items (*)
            )
        `)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: true });

    if (!error && data) {
        orders.set(data as any);
    }
}

export async function fetchSeatAssignments() {
    const { data, error } = await supabase
        .from('seat_assignments')
        .select(`
            *,
            teachers (*)
        `)
        .eq('active', true);

    if (!error && data) {
        seatAssignments.set(data as any);
    }
}

export async function fetchSeats() {
    const { data, error } = await supabase.from('seats').select('*');
    if (data && !error) seats.set(data);
}
