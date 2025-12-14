<script lang="ts">
    import { orders, seats } from "$lib/stores/realtime";
    import { teachers, fetchTeachers } from "$lib/stores/teachers";
    import { slide, scale } from "svelte/transition";
    import { onMount } from "svelte";
    import { toast } from "svelte-sonner";

    // shadcn-svelte components
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";

    // Icons
    import Check from "lucide-svelte/icons/check";
    import Clock from "lucide-svelte/icons/clock";
    import AlertTriangle from "lucide-svelte/icons/alert-triangle";
    import ChefHat from "lucide-svelte/icons/chef-hat";
    import PartyPopper from "lucide-svelte/icons/party-popper";

    let now = Date.now();
    let interval: any;
    let previousOrderCount = 0;

    onMount(() => {
        fetchTeachers();

        interval = setInterval(() => {
            now = Date.now();
        }, 1000);

        return () => clearInterval(interval);
    });

    // Watch for new orders and play sound
    $: {
        const currentCount = activeOrders.filter((o) => o.status === "pending").length;
        if (previousOrderCount > 0 && currentCount > previousOrderCount) {
            const audio = new Audio("/sounds/new-order.wav");
            audio.play().catch(() => {});
            toast.info("New order received!", { duration: 3000 });
        }
        previousOrderCount = currentCount;
    }

    $: enrichedOrders = $orders.map((order) => {
        const teacher = $teachers.find((t) => t.id === order.teacher_id);
        const seat = $seats.find((s) => s.id === order.seat_id);
        const elapsed = getElapsedSeconds(order.created_at, now);
        const timeRemaining = 120 - elapsed;

        return { ...order, teacher, seat, elapsed, timeRemaining };
    });

    $: activeOrders = enrichedOrders
        .filter((o) => o.status !== "served")
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

    function getTimerVariant(elapsed: number): "default" | "secondary" | "destructive" | "outline" {
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

<div class="flex-1 p-6 overflow-hidden flex flex-col bg-background">
    <!-- Header -->
    <header class="mb-6 flex justify-between items-center flex-none">
        <div>
            <h1 class="text-2xl font-semibold text-foreground flex items-center gap-2">
                <ChefHat class="w-6 h-6" />
                Kitchen Display
            </h1>
            <p class="text-muted-foreground text-sm">
                Orders sorted by urgency
            </p>
        </div>
        <div class="flex items-center gap-3">
            <div class="bg-card border rounded-lg px-4 py-2 text-center">
                <p class="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
                <p class="text-2xl font-bold text-primary">{activeOrders.length}</p>
            </div>
        </div>
    </header>

    <!-- Orders -->
    <ScrollArea class="flex-1" orientation="horizontal">
        <div class="flex gap-4 pb-4 h-full">
            {#each activeOrders as order (order.id)}
                {@const elapsed = order.elapsed}
                {@const isUrgent = elapsed > 90}
                {@const isOverdue = elapsed > 120}

                <div
                    class="h-full"
                    in:scale={{ duration: 200, start: 0.95 }}
                    out:slide={{ axis: "x", duration: 300 }}
                >
                <Card.Root
                    class="w-80 h-full flex-none flex flex-col {getCardBorder(elapsed, order.status)} {isOverdue && order.status !== 'ready' ? 'animate-pulse' : ''}"
                >
                    <Card.Header class="pb-3">
                        <div class="flex justify-between items-start">
                            <div>
                                <Card.Title class="flex items-center gap-2">
                                    Table {order.seat?.table_id || "?"}
                                    <span class="text-muted-foreground font-normal">
                                        · Seat {order.seat?.position || "?"}
                                    </span>
                                </Card.Title>
                                <Card.Description>
                                    {order.teacher?.name || "Unknown"}
                                </Card.Description>
                            </div>
                            <div class="text-right">
                                <Badge variant={getTimerVariant(elapsed)} class="font-mono text-lg px-2 py-1 {isOverdue && order.status !== 'ready' ? 'animate-pulse' : ''}">
                                    <Clock class="w-3.5 h-3.5 mr-1" />
                                    {formatTime(elapsed)}
                                </Badge>
                                {#if isUrgent && order.status !== "ready"}
                                    <div class="flex items-center justify-end gap-1 mt-1 text-destructive">
                                        <AlertTriangle class="w-3 h-3" />
                                        <span class="text-xs font-semibold">URGENT</span>
                                    </div>
                                {/if}
                            </div>
                        </div>

                        {#if order.teacher?.dietary_notes}
                            <Badge variant="outline" class="mt-2 text-orange-400 border-orange-500/50 bg-orange-500/10">
                                <AlertTriangle class="w-3 h-3 mr-1" />
                                {order.teacher.dietary_notes}
                            </Badge>
                        {/if}

                        <div class="flex gap-2 mt-2">
                            <Badge variant="outline" class="text-xs font-mono">
                                #{order.id.slice(0, 8)}
                            </Badge>
                            <Badge variant={order.status === "ready" ? "default" : "secondary"} class="text-xs {order.status === 'ready' ? 'bg-green-500' : ''}">
                                {order.status}
                            </Badge>
                        </div>
                    </Card.Header>

                    <Card.Content class="flex-1 overflow-hidden">
                        <ScrollArea class="h-full max-h-[180px]">
                            <div class="space-y-2">
                                {#each order.order_items as item}
                                    <div class="bg-muted/50 border rounded-lg p-3">
                                        <p class="font-semibold text-foreground">
                                            {item.menu_items?.name || "Unknown Item"}
                                        </p>
                                        {#if item.toppings?.length > 0}
                                            <div class="flex flex-wrap gap-1 mt-1.5">
                                                {#each item.toppings as topping}
                                                    <Badge variant="secondary" class="text-xs py-0">
                                                        {topping}
                                                    </Badge>
                                                {/each}
                                            </div>
                                        {/if}
                                        {#if item.notes}
                                            <div class="mt-2 text-sm bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded px-2 py-1">
                                                "{item.notes}"
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        </ScrollArea>
                    </Card.Content>

                    <Card.Footer class="pt-3">
                        {#if order.status === "pending" || order.status === "preparing"}
                            <Button class="w-full" size="lg" onclick={() => markReady(order.id)}>
                                <Check class="w-4 h-4 mr-2" />
                                Mark Ready
                            </Button>
                        {:else if order.status === "ready"}
                            <Button
                                class="w-full bg-green-500 hover:bg-green-600"
                                size="lg"
                                onclick={() => markServed(order.id)}
                            >
                                <Check class="w-4 h-4 mr-2" />
                                Complete
                            </Button>
                        {/if}
                    </Card.Footer>
                </Card.Root>
                </div>
            {/each}

            {#if activeOrders.length === 0}
                <div class="flex-1 flex flex-col items-center justify-center text-muted-foreground min-w-[400px]">
                    <PartyPopper class="w-16 h-16 mb-4 opacity-30" />
                    <p class="text-xl font-semibold">All caught up!</p>
                    <p class="text-sm">No active orders</p>
                </div>
            {/if}
        </div>
    </ScrollArea>
</div>
