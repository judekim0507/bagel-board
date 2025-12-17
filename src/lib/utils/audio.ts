class AudioManager {
    private sounds: Map<string, HTMLAudioElement> = new Map();
    private unlocked = false;

    constructor() {
        if (typeof window !== 'undefined') {
            const unlock = () => {
                if (this.unlocked) return;

                const silentAudio = new Audio();
                silentAudio.play().then(() => {
                    this.unlocked = true;
                }).catch(() => {});

                this.sounds.forEach(audio => {
                    audio.load();
                });

                this.unlocked = true;
            };

            ['click', 'touchstart', 'keydown'].forEach(event => {
                document.addEventListener(event, unlock, { once: false, passive: true });
            });
        }
    }

    preload(name: string, src: string) {
        if (typeof window === 'undefined') return;

        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.load();
        this.sounds.set(name, audio);
    }

    play(name: string) {
        const audio = this.sounds.get(name);
        if (audio) {
            const clone = audio.cloneNode() as HTMLAudioElement;
            clone.volume = audio.volume;
            clone.play().catch(() => {});
        }
    }

    playUrl(src: string) {
        if (typeof window === 'undefined') return;

        const audio = new Audio(src);
        audio.play().catch(() => {});
    }
}

export const audioManager = new AudioManager();

if (typeof window !== 'undefined') {
    audioManager.preload('ready', '/sounds/ready.wav');
    audioManager.preload('newOrder', '/sounds/new-order.wav');
}
