<script lang="ts">
    import { verifyPin } from "$lib/stores/auth";
    import { fade, scale } from "svelte/transition";

    // Icons
    import Lock from "lucide-svelte/icons/lock";
    import Delete from "lucide-svelte/icons/delete";
    import UtensilsCrossed from "lucide-svelte/icons/utensils-crossed";

    let pin = "";
    let error = false;
    let shaking = false;

    function handleKeyPress(digit: string) {
        if (pin.length >= 4) return;
        pin += digit;

        if (pin.length === 4) {
            setTimeout(() => checkPin(), 150);
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
    class="fixed inset-0 bg-stone-950 z-50 flex flex-col items-center justify-center"
    in:fade={{ duration: 150 }}
>
    <div
        class="flex-1 flex flex-col items-center justify-center w-full max-w-sm px-8"
    >
        <!-- Header -->
        <div
            class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6"
        >
            <Lock class="w-8 h-8 text-primary" />
        </div>

        <h1 class="text-foreground text-2xl font-semibold mb-6 tracking-tight">
            Enter PIN
        </h1>

        <!-- PIN Display -->
        <div class="flex gap-3 mb-8" class:animate-shake={shaking}>
            {#each [0, 1, 2, 3] as i}
                <div
                    class="w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all
                           {error
                        ? 'border-destructive bg-destructive/10'
                        : pin.length > i
                          ? 'border-primary bg-primary/10'
                          : 'border-stone-700 bg-stone-900'}"
                >
                    {#if pin.length > i}
                        <div
                            class="w-3 h-3 rounded-full {error
                                ? 'bg-destructive'
                                : 'bg-primary'}"
                            in:scale={{ duration: 100 }}
                        ></div>
                    {/if}
                </div>
            {/each}
        </div>

        {#if error}
            <p class="text-destructive text-sm mb-4 animate-in fade-in">
                Incorrect PIN
            </p>
        {/if}

        <!-- Keypad -->
        <div class="grid grid-cols-3 gap-3 w-full max-w-[280px]">
            {#each ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as digit}
                <button
                    class="h-16 rounded-full bg-stone-800 hover:bg-stone-700 active:bg-stone-600
                           text-foreground text-2xl font-semibold transition-all active:scale-95
                           border border-stone-700"
                    onclick={() => handleKeyPress(digit)}
                >
                    {digit}
                </button>
            {/each}

            <!-- Empty space -->
            <div></div>

            <!-- 0 -->
            <button
                class="h-16 rounded-full bg-stone-800 hover:bg-stone-700 active:bg-stone-600
                       text-foreground text-2xl font-semibold transition-all active:scale-95
                       border border-stone-700"
                onclick={() => handleKeyPress("0")}
            >
                0
            </button>

            <!-- Delete -->
            <button
                class="h-16 rounded-full hover:bg-stone-800 active:bg-stone-600
                       text-muted-foreground transition-all active:scale-95 flex items-center justify-center"
                onclick={handleDelete}
            >
                <Delete class="w-6 h-6" />
            </button>
        </div>
    </div>

    <!-- Pre-order Link -->
    <div class="pb-8 pt-4">
        <a
            href="/preorder"
            class="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
            <UtensilsCrossed class="w-4 h-4" />
            <span>Want to place a pre-order?</span>
        </a>
    </div>
</div>

<style>
    .animate-shake {
        animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }

    @keyframes shake {
        10%,
        90% {
            transform: translate3d(-2px, 0, 0);
        }
        20%,
        80% {
            transform: translate3d(4px, 0, 0);
        }
        30%,
        50%,
        70% {
            transform: translate3d(-6px, 0, 0);
        }
        40%,
        60% {
            transform: translate3d(6px, 0, 0);
        }
    }
</style>
