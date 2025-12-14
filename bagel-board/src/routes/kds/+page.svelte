<script lang="ts">
    import { orders, seats } from "$lib/stores/realtime";
    import { teachers, fetchTeachers } from "$lib/stores/teachers";
    import { fade, slide, scale } from "svelte/transition";
    import { onMount } from "svelte";
    import { toast } from "svelte-sonner";

    let now = Date.now();
    let interval: any;
    let previousOrderCount = 0;

    onMount(() => {
        // Load teacher data
        fetchTeachers();

        interval = setInterval(() => {
            now = Date.now();
        }, 1000);

        return () => clearInterval(interval);
    });

    // Watch for new orders and play sound
    $: {
        const currentCount = activeOrders.filter(
            (o) => o.status === "pending",
        ).length;
        if (previousOrderCount > 0 && currentCount > previousOrderCount) {
            // New order arrived! Create new audio instance to allow layering
            const audio = new Audio("/sounds/new-order.wav");
            audio.play().catch(() => {
                // Ignore if audio play fails (e.g., no user interaction yet)
            });
            toast.info("🔔 New order received!", { duration: 3000 });
        }
        previousOrderCount = currentCount;
    }

    // Enrich orders with teacher and seat info (depends on now for live timer)
    $: enrichedOrders = $orders.map((order) => {
        const teacher = $teachers.find((t) => t.id === order.teacher_id);
        const seat = $seats.find((s) => s.id === order.seat_id);
        const elapsed = getElapsedSeconds(order.created_at, now);
        const timeRemaining = 120 - elapsed; // 2 minute target

        return {
            ...order,
            teacher,
            seat,
            elapsed,
            timeRemaining,
        };
    });

    // Filter and sort: active orders by urgency (least time remaining first)
    $: activeOrders = enrichedOrders
        .filter((o) => o.status !== "served")
        .sort((a, b) => {
            // Ready orders go to the end
            if (a.status === "ready" && b.status !== "ready") return 1;
            if (a.status !== "ready" && b.status === "ready") return -1;

            // Otherwise sort by time remaining (least first = most urgent)
            return a.timeRemaining - b.timeRemaining;
        });

    function getElapsedSeconds(createdAt: string | null, currentTime: number) {
        if (!createdAt) return 0;
        return Math.floor((currentTime - new Date(createdAt).getTime()) / 1000);
    }

    function formatTime(seconds: number) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    function getTimerColor(elapsed: number) {
        if (elapsed > 120) return "text-red-500"; // > 2 mins
        if (elapsed > 60) return "text-orange-500"; // > 1 min
        return "text-green-500";
    }

    function getCardStyle(elapsed: number, status: string) {
        if (status === "ready") return "border-green-500 bg-green-900/20";
        if (elapsed > 120) return "border-red-500 bg-red-900/20 animate-pulse";
        if (elapsed > 60) return "border-orange-500 bg-orange-900/10";
        return "border-zinc-700";
    }

    async function markReady(orderId: string) {
        const res = await fetch("/api/orders/status", {
            method: "POST",
            body: JSON.stringify({ order_id: orderId, status: "ready" }),
        });

        // Create new audio instance to allow layering
        const readyAudio = new Audio("/sounds/ready.wav");
        readyAudio.play().catch(() => {});

        if (res.ok) {
            toast.success("Order marked ready!");
        } else {
            toast.error("Failed to update order");
        }
    }

    async function markServed(orderId: string) {
        const res = await fetch("/api/orders/status", {
            method: "POST",
            body: JSON.stringify({ order_id: orderId, status: "served" }),
        });

        if (res.ok) {
            toast.success("Order completed!");
        } else {
            toast.error("Failed to update order");
        }
    }
</script>

<div class="flex-1 p-6 overflow-hidden flex flex-col bg-zinc-900">
    <header class="mb-6 flex justify-between items-center">
        <div>
            <h1 class="text-2xl font-bold text-white">Kitchen Display</h1>
            <p class="text-zinc-500 text-sm">
                Real-time orders • Auto-sorted by urgency
            </p>
        </div>
        <div class="flex items-center gap-4">
            <div class="text-right">
                <div class="text-zinc-500 text-xs uppercase tracking-wide">
                    Active Orders
                </div>
                <div class="text-3xl font-bold text-orange-400">
                    {activeOrders.length}
                </div>
            </div>
        </div>
    </header>

    <div
        class="flex-1 overflow-x-auto overflow-y-hidden flex gap-4 pb-4 custom-scrollbar"
    >
        {#each activeOrders as order (order.id)}
            {@const elapsed = order.elapsed}
            {@const isUrgent = elapsed > 90}
            {@const isOverdue = elapsed > 120}
            <div
                class="w-80 flex-none bg-zinc-800 rounded-2xl p-5 flex flex-col border-2 shadow-xl transition-all {getCardStyle(
                    elapsed,
                    order.status,
                )}"
                in:scale={{ duration: 200, start: 0.9 }}
                out:slide={{ axis: "x", duration: 300 }}
            >
                <!-- Header -->
                <div class="mb-4 border-b border-zinc-700 pb-3">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <div
                                class="text-2xl font-bold text-white mb-1 flex items-center gap-2"
                            >
                                Table {order.seat?.table_id || "?"}
                                <span class="text-zinc-600">•</span>
                                <span class="text-zinc-400 text-lg"
                                    >Seat {order.seat?.position || "?"}</span
                                >
                            </div>
                            <div class="text-sm text-zinc-400">
                                {order.teacher?.name || "Unknown Teacher"}
                            </div>
                            {#if order.teacher?.dietary_notes}
                                <div
                                    class="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded mt-1 inline-block"
                                >
                                    ⚠ {order.teacher.dietary_notes}
                                </div>
                            {/if}
                        </div>
                        <div class="text-right">
                            <div
                                class="font-mono font-bold text-3xl {getTimerColor(
                                    elapsed,
                                )} {isOverdue ? 'animate-pulse' : ''}"
                            >
                                {formatTime(elapsed)}
                            </div>
                            {#if isUrgent && order.status !== "ready"}
                                <div
                                    class="text-xs text-red-400 font-bold mt-1"
                                >
                                    URGENT
                                </div>
                            {/if}
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <span class="text-xs text-zinc-500 font-mono"
                            >#{order.id.slice(0, 8)}</span
                        >
                        <span
                            class="text-xs px-2 py-0.5 rounded-full {order.status ===
                            'ready'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-zinc-700 text-zinc-400'}"
                        >
                            {order.status}
                        </span>
                    </div>
                </div>

                <!-- Order Items -->
                <div
                    class="flex-1 overflow-y-auto min-h-[120px] mb-4 custom-scrollbar"
                >
                    <ul class="space-y-3">
                        {#each order.order_items as item}
                            <li
                                class="bg-zinc-900/50 p-3 rounded-lg border border-zinc-700"
                            >
                                <div class="font-bold text-lg text-white mb-1">
                                    {item.menu_items?.name || "Unknown Item"}
                                </div>
                                {#if item.toppings && Array.isArray(item.toppings) && item.toppings.length > 0}
                                    <div class="flex flex-wrap gap-1 mb-2">
                                        {#each item.toppings as topping}
                                            <span
                                                class="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded"
                                            >
                                                {topping}
                                            </span>
                                        {/each}
                                    </div>
                                {/if}
                                {#if item.notes}
                                    <div
                                        class="text-sm text-yellow-400 italic mt-1 bg-yellow-900/20 px-2 py-1 rounded"
                                    >
                                        💬 "{item.notes}"
                                    </div>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                </div>

                <!-- Action Buttons -->
                <div class="mt-auto">
                    {#if order.status === "pending" || order.status === "preparing"}
                        <button
                            class="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg"
                            on:click={() => markReady(order.id)}
                        >
                            ✓ Mark Ready to Serve
                        </button>
                    {:else if order.status === "ready"}
                        <button
                            class="w-full py-4 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg animate-pulse"
                            on:click={() => markServed(order.id)}
                        >
                            ✓ Complete & Remove
                        </button>
                    {/if}
                </div>
            </div>
        {/each}

        {#if activeOrders.length === 0}
            <div
                class="flex-1 flex flex-col items-center justify-center text-zinc-600"
            >
                <div class="text-6xl mb-4">🎉</div>
                <div class="text-xl font-bold">All caught up!</div>
                <div class="text-sm italic">No active orders</div>
            </div>
        {/if}
    </div>
</div>
