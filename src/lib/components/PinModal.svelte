<script lang="ts">
    import { verifyAdminPin } from "$lib/stores/auth";
    import { fade, scale } from "svelte/transition";
    import { createEventDispatcher } from "svelte";

    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import Lock from "lucide-svelte/icons/lock";
    import Delete from "lucide-svelte/icons/delete";
    import ShieldCheck from "lucide-svelte/icons/shield-check";

    interface Props {
        open?: boolean;
        title?: string;
        description?: string;
    }

    let { open = $bindable(false), title = "Admin Access Required", description = "Enter the admin PIN to continue" }: Props = $props();

    const dispatch = createEventDispatcher();

    let pin = $state("");
    let error = $state(false);
    let shaking = $state(false);

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

    async function checkPin() {
        const success = await verifyAdminPin(pin);

        if (success) {
            dispatch("success");
            pin = "";
            open = false;
        } else {
            error = true;
            shaking = true;
            setTimeout(() => {
                shaking = false;
                pin = "";
                error = false;
            }, 600);
        }
    }

    function handleClose() {
        pin = "";
        error = false;
        open = false;
        dispatch("cancel");
    }

    function handleKeyboard(e: KeyboardEvent) {
        if (!open) return;
        if (e.key >= "0" && e.key <= "9") {
            handleKeyPress(e.key);
        } else if (e.key === "Backspace") {
            e.preventDefault();
            handleDelete();
        }
    }
</script>

<svelte:window onkeydown={handleKeyboard} />

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
    <Dialog.Content
        class="sm:max-w-sm dark bg-stone-950 border-stone-800 p-0 overflow-hidden"
    >
        <div class="p-6 pb-4 text-center border-b border-stone-800">
            <div
                class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3"
            >
                <ShieldCheck class="w-6 h-6 text-primary" />
            </div>
            <Dialog.Title class="text-foreground text-lg">{title}</Dialog.Title>
            <Dialog.Description class="text-muted-foreground text-sm mt-1">
                {description}
            </Dialog.Description>
        </div>

        <div class="p-6 flex flex-col items-center">
            <div class="flex gap-2 mb-6" class:animate-shake={shaking}>
                {#each [0, 1, 2, 3] as i}
                    <div
                        class="w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all
                               {error
                            ? 'border-destructive bg-destructive/10'
                            : pin.length > i
                              ? 'border-primary bg-primary/10'
                              : 'border-stone-700 bg-stone-900'}"
                    >
                        {#if pin.length > i}
                            <div
                                class="w-2.5 h-2.5 rounded-full {error
                                    ? 'bg-destructive'
                                    : 'bg-primary'}"
                                in:scale={{ duration: 100 }}
                            ></div>
                        {/if}
                    </div>
                {/each}
            </div>

            {#if error}
                <p class="text-destructive text-sm mb-3">Incorrect PIN</p>
            {/if}

            <div class="grid grid-cols-3 gap-2 w-full max-w-[220px]">
                {#each ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as digit}
                    <button
                        class="h-14 rounded-full bg-stone-800 hover:bg-stone-700 active:bg-stone-600
                               text-foreground text-xl font-semibold transition-all active:scale-95
                               border border-stone-700"
                        onclick={() => handleKeyPress(digit)}
                    >
                        {digit}
                    </button>
                {/each}

                <div></div>

                <button
                    class="h-14 rounded-full bg-stone-800 hover:bg-stone-700 active:bg-stone-600
                           text-foreground text-xl font-semibold transition-all active:scale-95
                           border border-stone-700"
                    onclick={() => handleKeyPress("0")}
                >
                    0
                </button>

                <button
                    class="h-14 rounded-full hover:bg-stone-800 active:bg-stone-600
                           text-muted-foreground transition-all active:scale-95 flex items-center justify-center"
                    onclick={handleDelete}
                >
                    <Delete class="w-5 h-5" />
                </button>
            </div>
        </div>
    </Dialog.Content>
</Dialog.Root>

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
