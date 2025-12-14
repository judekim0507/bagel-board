import { browser } from '$app/environment';
import { v4 as uuidv4 } from 'uuid';

export function getDeviceId(): string {
    if (!browser) return 'server-side';

    const STORAGE_KEY = 'bagel_board_device_id';
    let deviceId = localStorage.getItem(STORAGE_KEY);

    if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem(STORAGE_KEY, deviceId);
    }

    return deviceId;
}
