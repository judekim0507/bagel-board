<script lang="ts">
    import { fly, fade } from "svelte/transition";
    import { createEventDispatcher } from "svelte";

    export let order: any;
    export let seat: any;
    export let teacher: any;
    export let isMinimized = false;
    export let stackIndex = 0; // For positioning multiple bookmarks

    const dispatch = createEventDispatcher();

    function minimize() {
        dispatch("minimize");
    }

    function complete() {
        dispatch("complete");
    }
</script>

{#if isMinimized}
    <!-- Floating Bookmark -->
    <button
        class="fixed right-0 z-50 bg-green-600 text-white px-4 py-6 rounded-l-2xl shadow-2xl hover:px-6 transition-all border-2 border-green-400 border-r-0"
        style="top: calc(50% + {stackIndex * 120}px - {stackIndex * 60}px);"
        on:click={() => dispatch("restore")}
        transition:fly={{ x: 100, duration: 300 }}
    >
        <div class="flex flex-col items-center gap-2">
            <div class="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                </svg>
            </div>
            <div class="text-xs font-bold whitespace-nowrap" style="writing-mode: vertical-rl;">
                Table {seat?.table_id}
            </div>
        </div>
    </button>
{:else}
    <!-- Dimmed Overlay -->
    <button
        class="fixed inset-0 bg-black/60 z-40"
        on:click={minimize}
        transition:fade={{ duration: 200 }}
    ></button>

    <!-- Side Panel -->
    <div
        class="fixed top-0 right-0 bottom-0 w-full md:w-1/3 bg-zinc-900 text-white z-50 flex flex-col shadow-2xl border-l-2 border-green-500"
        transition:fly={{ x: 500, duration: 300 }}
    >
        <!-- Header -->
        <div class="bg-green-600 p-6 flex-none">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-7 h-7">
                            <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-2xl font-bold">Order Ready!</h2>
                        <p class="text-green-100">Ready to serve</p>
                    </div>
                </div>
                <button
                    on:click={minimize}
                    class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-green-500 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>
            </div>

            <div class="bg-green-700/50 rounded-xl p-4">
                <div class="text-green-100 text-sm mb-1">Location</div>
                <div class="text-3xl font-bold">Table {seat?.table_id} • Seat {seat?.position}</div>
            </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            <!-- Teacher Info -->
            <div class="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                <div class="text-zinc-400 text-xs font-medium mb-2">TEACHER</div>
                <div class="text-xl font-bold mb-2">{teacher?.name || "Unknown"}</div>
                {#if teacher?.dietary_notes}
                    <div class="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3 flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5">
                            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                        </svg>
                        <div>
                            <div class="text-orange-400 text-xs font-bold mb-1">DIETARY REQUIREMENTS</div>
                            <div class="text-orange-300 text-sm">{teacher.dietary_notes}</div>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Order Items -->
            <div class="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                <div class="text-zinc-400 text-xs font-medium mb-4">ORDER ITEMS</div>
                <div class="space-y-4">
                    {#each order.order_items || [] as item}
                        <div class="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
                            <div class="text-lg font-bold mb-2">{item.menu_items?.name || "Unknown Item"}</div>
                            {#if item.toppings && Array.isArray(item.toppings) && item.toppings.length > 0}
                                <div class="flex flex-wrap gap-2 mb-2">
                                    {#each item.toppings as topping}
                                        <span class="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                                            + {topping}
                                        </span>
                                    {/each}
                                </div>
                            {/if}
                            {#if item.notes}
                                <div class="bg-yellow-900/20 border border-yellow-500/50 rounded p-2 mt-2">
                                    <div class="text-yellow-400 text-xs italic">"{item.notes}"</div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Order Info -->
            <div class="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                <div class="text-zinc-400 text-xs font-medium mb-2">ORDER ID</div>
                <div class="font-mono text-sm text-zinc-300">#{order.id.slice(0, 16)}</div>
            </div>
        </div>

        <!-- Footer Actions -->
        <div class="p-6 border-t border-zinc-800 flex-none bg-zinc-900">
            <button
                on:click={complete}
                class="w-full py-4 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold text-lg rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6">
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                </svg>
                Complete & Remove
            </button>
        </div>
    </div>
{/if}
