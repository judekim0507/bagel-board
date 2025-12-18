<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import { createEventDispatcher } from "svelte";

    interface Props {
        title?: string;
        children?: import('svelte').Snippet;
    }

    let { title = "", children }: Props = $props();

    const dispatch = createEventDispatcher();

    function close() {
        dispatch("close");
    }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <button
        class="absolute inset-0 bg-black/60 transition-all"
        onclick={close}
        transition:fade={{ duration: 200 }}
        aria-label="Close modal"
    ></button>

    <!-- Content -->
    <div
        class="bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh] border border-zinc-800"
        transition:scale={{ start: 0.95, duration: 200 }}
    >
        {#if title}
            <div
                class="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 z-10"
            >
                <h2 class="text-xl font-bold text-white">{title}</h2>
                <button
                    onclick={close}
                    class="p-2 -mr-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                        class="w-5 h-5"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>
        {/if}

        <div class="p-6 overflow-y-auto custom-scrollbar">
            {@render children?.()}
        </div>
    </div>
</div>

<style>
    /* Styling for scrollbar if needed */
</style>
