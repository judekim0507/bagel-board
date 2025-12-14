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

let initializing: Promise<void> | null = null;
let subscriptionsSet = false;

export function initRealtime() {
    if (!initializing) {
        initializing = setupRealtime();
    }
    return initializing;
}

async function setupRealtime() {
    // 1. Initial Load
    await Promise.all([fetchOrders(), fetchSeatAssignments(), fetchSeats()]);

    // 2. Realtime Subscriptions (idempotent)
    if (subscriptionsSet) return;
    subscriptionsSet = true;

    supabase
        .channel('public:orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            // In a robust app we'd optimistic update or just fetch single row
            // For simplicity, refetch all (fine for MVP)
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
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (
                *,
                menu_items (*)
            )
        `)
        .neq('status', 'served') // Don't show served orders by default in KDS? Or filter in UI.
        .order('created_at', { ascending: true }); // Oldest first (FIFO)
    
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

export const seats = writable<Database['public']['Tables']['seats']['Row'][]>([]);

export async function fetchSeats() {
    const { data, error } = await supabase.from('seats').select('*');
    if (data && !error) seats.set(data);
}
