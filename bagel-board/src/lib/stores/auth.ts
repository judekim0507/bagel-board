import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';

export const isAuthenticated = writable(false);

let cachedPin: string | null = null;

export async function fetchPin(): Promise<string | null> {
    if (cachedPin) return cachedPin;

    const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'waiter_pin')
        .single();

    if (error || !data) {
        console.error('Failed to fetch PIN:', error);
        return null;
    }

    cachedPin = data.value;
    return cachedPin;
}

export async function verifyPin(pin: string): Promise<boolean> {
    const correctPin = await fetchPin();

    if (pin === correctPin) {
        isAuthenticated.set(true);
        return true;
    }
    return false;
}

export function logout() {
    isAuthenticated.set(false);
}
