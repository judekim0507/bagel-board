const STORAGE_KEY = 'waiter_assigned_tables';

export function getAssignedTables(): number[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch {
        return [];
    }
}

export function setAssignedTables(tables: number[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
}

export function isTableAssigned(tableId: number): boolean {
    const assigned = getAssignedTables();
    return assigned.length === 0 || assigned.includes(tableId); // If no tables selected, show all
}
