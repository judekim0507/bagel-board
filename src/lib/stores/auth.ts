import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';

export const isAuthenticated = writable(false);

let cachedWaiterPin: string | null = null;
let cachedAdminPin: string | null = null;

export async function fetchPin(): Promise<string | null> {
    if (cachedWaiterPin) return cachedWaiterPin;

    const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'waiter_pin')
        .single();

    if (error || !data) {
        console.error('Failed to fetch PIN:', error);
        return null;
    }

    cachedWaiterPin = data.value;
    return cachedWaiterPin;
}

export async function fetchAdminPin(): Promise<string | null> {
    if (cachedAdminPin) return cachedAdminPin;

    const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'admin_pin')
        .single();

    if (error || !data) {
        console.error('Failed to fetch admin PIN:', error);
        return null;
    }

    cachedAdminPin = data.value;
    return cachedAdminPin;
}

export async function verifyPin(pin: string): Promise<boolean> {
    const correctPin = await fetchPin();

    if (pin === correctPin) {
        isAuthenticated.set(true);
        return true;
    }
    return false;
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
    const correctPin = await fetchAdminPin();
    return pin === correctPin;
}

export function logout() {
    isAuthenticated.set(false);
}
