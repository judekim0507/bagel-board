<script lang="ts">
    import { verifyPin } from "$lib/stores/auth";
    import { fade } from "svelte/transition";

    let pin = "";
    let error = false;
    let shaking = false;

    function handleInput(num: number) {
        if (pin.length >= 4) return;

        pin = pin + num.toString();
        error = false;

        // Auto-submit when we hit 4 digits
        if (pin.length === 4) {
            setTimeout(() => checkPin(), 200);
        }
    }

    function handleDelete() {
        pin = pin.slice(0, -1);
        error = false;
    }

    function checkPin() {
        const success = verifyPin(pin);

        if (!success) {
            error = true;
            shaking = true;
            setTimeout(() => {
                shaking = false;
                pin = "";
                error = false;
            }, 600);
        }
    }
</script>

<div
    class="fixed inset-0 bg-[#171717] z-50 flex items-center justify-center backdrop-blur-sm pointer-events-none"
    in:fade={{ duration: 150 }}
>
    <div class="w-full max-w-sm p-8 flex flex-col items-center pointer-events-auto">
        <h1 class="text-white text-2xl font-medium mb-4 tracking-tight">
            Enter PIN
        </h1>

        <!-- PIN Dots -->
        <div class="flex gap-6 mb-12" class:animate-shake={shaking}>
            {#each Array(4) as _, i}
                <div
                    class="w-5 h-5 rounded-full transition-all duration-200"
                    class:bg-[#ffffff1a]={!error && i >= pin.length}
                    class:bg-white={!error && i < pin.length}
                    class:bg-red-500={error}
                ></div>
            {/each}
        </div>

        <!-- Keypad -->
        <div class="grid grid-cols-3 gap-6 w-full max-w-[280px]">
            {#each [1, 2, 3, 4, 5, 6, 7, 8, 9] as num}
                <button
                    class="w-20 h-20 rounded-full hover:bg-white/20 active:bg-white/30 text-white text-2xl font-medium transition-colors flex items-center justify-center backdrop-blur-md border border-white/5"
                    on:click={() => handleInput(num)}
                >
                    {num}
                </button>
            {/each}
            <div class="w-20 h-20"></div>
            <button
                class="w-20 h-20 rounded-full hover:bg-white/20 active:bg-white/30 text-white text-2xl font-medium transition-colors flex items-center justify-center backdrop-blur-md border border-white/5"
                on:click={() => handleInput(0)}
            >
                0
            </button>
            <button
                class="w-20 h-20 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
                on:click={handleDelete}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-8 h-8"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.374-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33z"
                    />
                </svg>
            </button>
        </div>

        {#if error}
            <p class="text-red-400 text-sm mt-6">Incorrect PIN</p>
        {/if}
    </div>
</div>

<style>
    .animate-shake {
        animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }

    @keyframes shake {
        10%, 90% {
            transform: translate3d(-1px, 0, 0);
        }
        20%, 80% {
            transform: translate3d(2px, 0, 0);
        }
        30%, 50%, 70% {
            transform: translate3d(-4px, 0, 0);
        }
        40%, 60% {
            transform: translate3d(4px, 0, 0);
        }
    }
</style>
