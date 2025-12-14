<script lang="ts">
    import { fly, fade } from "svelte/transition";
    import { createEventDispatcher } from "svelte";

    // shadcn-svelte components
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";

    // Icons
    import Check from "lucide-svelte/icons/check";
    import X from "lucide-svelte/icons/x";
    import AlertTriangle from "lucide-svelte/icons/alert-triangle";
    import MapPin from "lucide-svelte/icons/map-pin";
    import User from "lucide-svelte/icons/user";
    import Bell from "lucide-svelte/icons/bell";

    export let order: any;
    export let seat: any;
    export let teacher: any;
    export let isMinimized = false;
    export let stackIndex = 0;

    const dispatch = createEventDispatcher();

    function minimize() {
        dispatch("minimize");
    }

    function complete() {
        dispatch("complete");
    }
</script>

{#if isMinimized}
    <!-- Minimized Tab -->
    <button
        class="fixed right-0 z-50 bg-card border border-border border-r-0 rounded-l-xl shadow-lg
               hover:bg-accent transition-all group"
        style="top: calc(40% + {stackIndex * 70}px);"
        onclick={() => dispatch("restore")}
        transition:fly={{ x: 100, duration: 200 }}
        aria-label="Restore order panel for Table {seat?.table_id}"
    >
        <div class="flex items-center gap-3 px-3 py-4">
            <div class="relative">
                <div class="w-2 h-2 rounded-full bg-green-500 absolute -top-0.5 -right-0.5 animate-pulse"></div>
                <Bell class="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div class="text-left">
                <p class="text-xs text-muted-foreground">Ready</p>
                <p class="text-sm font-semibold text-foreground">T{seat?.table_id}</p>
            </div>
        </div>
    </button>
{:else}
    <!-- Dimmed Overlay -->
    <button
        class="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onclick={minimize}
        transition:fade={{ duration: 150 }}
        aria-label="Minimize panel"
    ></button>

    <!-- Side Panel -->
    <div
        class="fixed top-0 right-0 bottom-0 w-full md:w-[400px] bg-card z-50 flex flex-col shadow-2xl border-l border-border"
        transition:fly={{ x: 400, duration: 250 }}
    >
        <!-- Header -->
        <header class="p-5 border-b flex-none">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Check class="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                        <h2 class="text-lg font-semibold text-foreground">Order Ready</h2>
                        <p class="text-muted-foreground text-sm">Ready for pickup</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onclick={minimize}>
                    <X class="w-5 h-5" />
                </Button>
            </div>

            <!-- Location -->
            <div class="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                <MapPin class="w-4 h-4 text-muted-foreground" />
                <div>
                    <p class="text-xs text-muted-foreground">Deliver to</p>
                    <p class="text-foreground font-semibold">Table {seat?.table_id} · Seat {seat?.position}</p>
                </div>
            </div>
        </header>

        <!-- Content -->
        <ScrollArea class="flex-1">
            <div class="p-5 space-y-4">
                <!-- Teacher -->
                <div class="space-y-2">
                    <div class="flex items-center gap-2 text-muted-foreground">
                        <User class="w-3.5 h-3.5" />
                        <span class="text-xs font-medium uppercase tracking-wide">Teacher</span>
                    </div>
                    <p class="text-foreground font-medium">{teacher?.name || "Unknown"}</p>

                    {#if teacher?.dietary_notes}
                        <div class="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <AlertTriangle class="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                            <p class="text-sm text-orange-400">{teacher.dietary_notes}</p>
                        </div>
                    {/if}
                </div>

                <!-- Divider -->
                <div class="border-t"></div>

                <!-- Order Items -->
                <div class="space-y-3">
                    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Items</p>

                    {#each order.order_items || [] as item}
                        <div class="p-3 rounded-lg bg-muted/30 border">
                            <p class="font-medium text-foreground">{item.menu_items?.name || "Unknown Item"}</p>

                            {#if item.toppings && Array.isArray(item.toppings) && item.toppings.length > 0}
                                <div class="flex flex-wrap gap-1 mt-2">
                                    {#each item.toppings as topping}
                                        <Badge variant="secondary" class="text-xs font-normal">
                                            {topping}
                                        </Badge>
                                    {/each}
                                </div>
                            {/if}

                            {#if item.notes}
                                <p class="text-sm text-yellow-500 mt-2 italic">"{item.notes}"</p>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        </ScrollArea>

        <!-- Footer -->
        <div class="p-5 border-t flex-none">
            <Button class="w-full" size="lg" onclick={complete}>
                <Check class="w-4 h-4 mr-2" />
                Mark as Served
            </Button>
        </div>
    </div>
{/if}
