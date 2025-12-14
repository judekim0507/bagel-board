import { writable } from 'svelte/store';

export const isAuthenticated = writable(false);

const CORRECT_PIN = '1234'; // Mock PIN

export function verifyPin(pin: string): boolean {
    if (pin === CORRECT_PIN) {
        isAuthenticated.set(true);
        return true;
    }
    return false;
}

export function logout() {
    isAuthenticated.set(false);
}
