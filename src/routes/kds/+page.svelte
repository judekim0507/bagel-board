<script lang="ts">
    import { orders, seats } from "$lib/stores/realtime";
    import { teachers, fetchTeachers } from "$lib/stores/teachers";
    import { supabase } from "$lib/supabase";
    import { slide, scale } from "svelte/transition";
    import { onMount, onDestroy } from "svelte";
    import { toast } from "svelte-sonner";
    import { audioManager } from "$lib/utils/audio";

    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";

    import Check from "lucide-svelte/icons/check";
    import Clock from "lucide-svelte/icons/clock";
    import AlertTriangle from "lucide-svelte/icons/alert-triangle";
    import ChefHat from "lucide-svelte/icons/chef-hat";
    import PartyPopper from "lucide-svelte/icons/party-popper";
    import Undo2 from "lucide-svelte/icons/undo-2";
    import Circle from "lucide-svelte/icons/circle";

    let now = Date.now();
    let interval: ReturnType<typeof setInterval>;
    let knownOrderIds = new Set<string>();
    let initialized = false;
    let connected = true;
    let connectionChannel: ReturnType<typeof supabase.channel> | null = null;

    onMount(() => {
        fetchTeachers();

        interval = setInterval(() => {
            now = Date.now();
        }, 1000);

        connectionChannel = supabase.channel("kds-connection");
        connectionChannel.subscribe((status) => {
            connected = status === "SUBSCRIBED";
        });
    });

    onDestroy(() => {
        clearInterval(interval);
        if (connectionChannel) {
            supabase.removeChannel(connectionChannel);
        }
    });

    $: {
        const pendingOrders = $orders.filter(
            (o) =>
                o.status === "pending" &&
                o.order_items &&
                o.order_items.length > 0,
        );

        if (!initialized && $orders.length > 0) {
            pendingOrders.forEach((o) => knownOrderIds.add(o.id));
            initialized = true;
        } else if (initialized) {
            for (const order of pendingOrders) {
                if (!knownOrderIds.has(order.id)) {
                    knownOrderIds.add(order.id);
                    audioManager.play("newOrder");
                    toast.info("New order received!", { duration: 3000 });
                }
            }
        }
    }

    $: enrichedOrders = $orders.map((order) => {
        const teacher = $teachers.find((t) => t.id === order.teacher_id);
        const seat = $seats.find((s) => s.id === order.seat_id);
        const elapsed = getElapsedSeconds(order.created_at, now);
        const timeRemaining = 120 - elapsed;

        return { ...order, teacher, seat, elapsed, timeRemaining };
    });

    $: activeOrders = enrichedOrders
        .filter(
            (o) =>
                o.status !== "served" &&
                o.order_items &&
                o.order_items.length > 0,
        )
        .sort((a, b) => {
            if (a.status === "ready" && b.status !== "ready") return 1;
            if (a.status !== "ready" && b.status === "ready") return -1;
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

    function getTimerVariant(
        elapsed: number,
    ): "default" | "secondary" | "destructive" | "outline" {
        if (elapsed > 120) return "destructive";
        if (elapsed > 60) return "secondary";
        return "outline";
    }

    function getCardBorder(elapsed: number, status: string) {
        if (status === "ready") return "border-green-500/50 bg-green-500/5";
        if (elapsed > 120) return "border-destructive/50 bg-destructive/5";
        if (elapsed > 60) return "border-orange-500/30 bg-orange-500/5";
        return "border-border";
    }

    async function markReady(orderId: string) {
        const res = await fetch("/api/orders/status", {
            method: "POST",
            body: JSON.stringify({ order_id: orderId, status: "ready" }),
        });

        audioManager.play("ready");

        if (res.ok) {
            toast.success("Order marked ready!");
        } else {
            toast.error("Failed to update order");
        }
    }

    async function undoReady(orderId: string) {
        const res = await fetch("/api/orders/status", {
            method: "POST",
            body: JSON.stringify({ order_id: orderId, status: "pending" }),
        });

        if (res.ok) {
            toast.info("Order moved back to queue");
        } else {
            toast.error("Failed to update order");
        }
    }
</script>

<div class="flex-1 p-4 md:p-6 overflow-hidden flex flex-col max-h-full">
    <header class="mb-6 flex justify-between items-center flex-none">
        <div>
            <h1
                class="text-3xl font-instrument-serif font-medium text-foreground flex items-center gap-2"
            >
                <ChefHat class="w-6 h-6" />
                Kitchen Display
            </h1>
            <p class="text-muted-foreground text-sm flex items-center gap-2">
                <!-- {#if connected}
                    <span class="flex items-center gap-1 text-green-500">
                        <Circle class="w-2 h-2 fill-green-500 text-green-500" />
                        Live
                    </span>
                {:else}
                    <span
                        class="flex items-center gap-1 text-red-500 animate-pulse"
                    >
                        <Circle class="w-2 h-2 fill-red-500 text-red-500" />
                        Disconnected
                    </span>
                {/if}
                <span class="text-muted-foreground">·</span> -->
                <!-- Orders sorted by urgency -->
            </p>
        </div>
        <div class="flex items-center gap-3">
            <div class="bg-card border rounded-lg px-4 py-2 text-center">
                <p
                    class="text-xs text-muted-foreground uppercase tracking-wide"
                >
                    Active
                </p>
                <p class="text-2xl font-bold text-primary">
                    {activeOrders.length}
                </p>
            </div>
        </div>
    </header>

    <div class="flex-1 overflow-x-auto overflow-y-hidden min-h-0 no-scrollbar">
        <div class="flex gap-4 pb-4 h-full">
            {#each activeOrders as order (order.id)}
                {@const elapsed = order.elapsed}
                {@const isUrgent = elapsed > 90}
                {@const isOverdue = elapsed > 120}

                <div
                    class="h-full flex-shrink-0"
                    in:scale={{ duration: 200, start: 0.95 }}
                    out:slide={{ axis: "x", duration: 300 }}
                >
                    <Card.Root
                        class="w-[min(320px,calc(100vw-2rem))] h-full flex flex-col overflow-hidden {getCardBorder(
                            elapsed,
                            order.status,
                        )} {isOverdue && order.status !== 'ready'
                            ? 'animate-pulse'
                            : ''}"
                    >
                        <Card.Header class="pb-3 flex-shrink-0">
                            <div class="flex justify-between items-start">
                                <div>
                                    <Card.Title class="flex items-center gap-2">
                                        Table {order.seat?.table_id || "?"}
                                        <span
                                            class="text-muted-foreground font-normal"
                                        >
                                            · Seat {order.seat?.position || "?"}
                                        </span>
                                    </Card.Title>
                                    <Card.Description>
                                        {order.teacher?.name || "Unknown"}
                                    </Card.Description>
                                </div>
                                <div class="text-right">
                                    <Badge
                                        variant={getTimerVariant(elapsed)}
                                        class="font-mono text-base px-3 py-0.5 {isOverdue &&
                                        order.status !== 'ready'
                                            ? 'animate-pulse'
                                            : ''}"
                                    >
                                        <Clock class="w-3.5 h-3.5 mr-1" />
                                        {formatTime(elapsed)}
                                    </Badge>
                                </div>
                            </div>

                            {#if order.teacher?.dietary_notes}
                                <div
                                    class="mt-2 flex items-start gap-1.5 p-2 rounded-lg bg-orange-500/10 border border-orange-500/30"
                                >
                                    <AlertTriangle
                                        class="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5"
                                    />
                                    <span
                                        class="text-sm text-orange-400 break-words"
                                        >{order.teacher.dietary_notes}</span
                                    >
                                </div>
                            {/if}
                        </Card.Header>

                        <Card.Content
                            class="flex-1 overflow-hidden min-h-0 no-scrollbar"
                        >
                            <ScrollArea class="h-full no-scrollbar">
                                <div class="space-y-2 no-scrollbar">
                                    {#each order.order_items || [] as item}
                                        <div
                                            class="bg-muted/50 border rounded-lg p-3 overflow-hidden no-scrollbar"
                                        >
                                            <p
                                                class="font-semibold text-foreground break-words"
                                            >
                                                {item.menu_items?.name ||
                                                    "Unknown Item"}
                                            </p>
                                            {#if item.toppings?.length > 0}
                                                <div
                                                    class="flex flex-wrap gap-1 mt-1.5"
                                                >
                                                    {#each item.toppings as topping}
                                                        <Badge
                                                            variant="secondary"
                                                            class="text-xs py-0"
                                                        >
                                                            {topping}
                                                        </Badge>
                                                    {/each}
                                                </div>
                                            {/if}
                                            {#if item.notes}
                                                <div
                                                    class="mt-2 text-sm bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded px-2 py-1 break-words"
                                                >
                                                    "{item.notes}"
                                                </div>
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            </ScrollArea>
                        </Card.Content>

                        <Card.Footer class="pt-3 flex-shrink-0">
                            {#if order.status === "pending" || order.status === "preparing"}
                                <Button
                                    class="w-full"
                                    size="lg"
                                    onclick={() => markReady(order.id)}
                                >
                                    <Check class="w-4 h-4 mr-2" />
                                    Mark Ready
                                </Button>
                            {:else if order.status === "ready"}
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onclick={() => undoReady(order.id)}
                                    class="w-full"
                                >
                                    <Undo2 class="w-4 h-4 mr-2" />
                                    Undo
                                </Button>
                            {/if}
                        </Card.Footer>
                    </Card.Root>
                </div>
            {/each}

            {#if activeOrders.length === 0}
                <div
                    class="flex-1 flex flex-col items-center justify-center text-muted-foreground min-w-[300px]"
                >
                    <PartyPopper class="w-16 h-16 mb-4 opacity-30" />
                    <p class="text-xl font-semibold">All caught up!</p>
                    <p class="text-sm">No active orders</p>
                </div>
            {/if}
        </div>
    </div>
</div>
