<script lang="ts">
    import { menuItems, fetchMenu } from "$lib/stores/menu";
    import { orders } from "$lib/stores/realtime";
    import { onMount, createEventDispatcher } from "svelte";
    import { scale, slide } from "svelte/transition";
    import { toast } from "svelte-sonner";

    import { Button } from "$lib/components/ui/button/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
    import { Separator } from "$lib/components/ui/separator/index.js";

    // Icons
    import X from "lucide-svelte/icons/x";
    import ChevronLeft from "lucide-svelte/icons/chevron-left";
    import LogOut from "lucide-svelte/icons/log-out";
    import Plus from "lucide-svelte/icons/plus";
    import Trash2 from "lucide-svelte/icons/trash-2";
    import Send from "lucide-svelte/icons/send";
    import ShoppingBag from "lucide-svelte/icons/shopping-bag";
    import UtensilsCrossed from "lucide-svelte/icons/utensils-crossed";
    import Coffee from "lucide-svelte/icons/coffee";
    import Clock from "lucide-svelte/icons/clock";
    import ChefHat from "lucide-svelte/icons/chef-hat";
    import Check from "lucide-svelte/icons/check";
    import History from "lucide-svelte/icons/history";
    import ArrowRightLeft from "lucide-svelte/icons/arrow-right-left";
    import RotateCcw from "lucide-svelte/icons/rotate-ccw";

    interface Props {
        teacher: any;
        seatId?: string;
        deviceId: string;
        mode?: "waiter" | "preorder";
        headerTitle?: string;
        initialCart?: any[];
        existingPreorderId?: string;
    }

    let {
        teacher,
        seatId = "",
        deviceId,
        mode = "waiter",
        headerTitle = "New Order",
        initialCart = [],
        existingPreorderId = ""
    }: Props = $props();

    const dispatch = createEventDispatcher();

    let cart: any[] = $state(initialCart);
    let submitting = $state(false);
    let cancellingOrderId: string | null = $state(null);
    let selectedItem: any = $state(null);
    let showCustomizeModal = $state(false);
    let customizeToppings: string[] = $state([]);
    let customizeNotes = $state("");
    let dietaryNotes = $state(teacher?.dietary_notes || "");
    let activeTab = $state("menu");

    async function cancelOrder(orderId: string) {
        cancellingOrderId = orderId;
        const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
        cancellingOrderId = null;

        if (res.ok) {
            toast.success("Order recalled");
        } else {
            toast.error("Failed to recall order");
        }
    }

    let seatOrders =
        $derived(mode === "waiter" && seatId
            ? $orders
                  .filter((o) => o.seat_id === seatId)
                  .sort(
                      (a, b) =>
                          new Date(b.created_at || 0).getTime() -
                          new Date(a.created_at || 0).getTime(),
                  )
            : []);

    let hasOrderHistory = $derived(seatOrders.length > 0);

    function getStatusBadge(status: string) {
        switch (status) {
            case "pending":
                return {
                    label: "In Queue",
                    class: "bg-orange-500/20 text-orange-400 border-orange-500/30",
                };
            case "preparing":
                return {
                    label: "Preparing",
                    class: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                };
            case "ready":
                return {
                    label: "Ready",
                    class: "bg-green-500/20 text-green-400 border-green-500/30",
                };
            case "served":
                return {
                    label: "Served",
                    class: "bg-muted text-muted-foreground border-border",
                };
            default:
                return {
                    label: status,
                    class: "bg-muted text-muted-foreground border-border",
                };
        }
    }

    function getStatusIcon(status: string) {
        switch (status) {
            case "pending":
                return Clock;
            case "preparing":
                return ChefHat;
            case "ready":
                return Check;
            case "served":
                return Check;
            default:
                return Clock;
        }
    }

    onMount(() => {
        fetchMenu();
        if (initialCart.length > 0) {
            cart = [...initialCart];
        }
    });

    let categories = $derived(["meal", "drink"]);
    let groupedItems = $derived(categories.map((cat) => ({
        name: cat === "meal" ? "Main" : "Drinks",
        icon: cat === "meal" ? UtensilsCrossed : Coffee,
        items: $menuItems.filter((i) => i.category === cat),
    })));

    function openCustomizeModal(item: any) {
        selectedItem = item;
        customizeToppings = [];
        customizeNotes = "";
        showCustomizeModal = true;
    }

    function confirmCustomization() {
        if (!selectedItem) return;

        cart = [
            ...cart,
            {
                menu_item_id: selectedItem.id,
                name: selectedItem.name,
                toppings: customizeToppings,
                notes: customizeNotes,
            },
        ];

        showCustomizeModal = false;
        selectedItem = null;
        customizeToppings = [];
        customizeNotes = "";
        toast.success(`${selectedItem?.name || "Item"} added`);
    }

    function removeFromCart(index: number) {
        const item = cart[index];
        cart = cart.filter((_, i) => i !== index);
        toast.info(`${item.name} removed`);
    }

    async function submitOrder() {
        if (cart.length === 0 || submitting) return;
        submitting = true;

        if (existingPreorderId) {
            await fetch(`/api/preorders/${existingPreorderId}`, {
                method: "DELETE",
            });
        }

        const endpoint = mode === "preorder" ? "/api/preorders" : "/api/orders";
        const payload =
            mode === "preorder"
                ? {
                      teacher_id: teacher.id,
                      device_id: deviceId,
                      items: cart,
                      dietary_notes: dietaryNotes,
                  }
                : {
                      teacher_id: teacher.id,
                      seat_id: seatId,
                      device_id: deviceId,
                      items: cart,
                      dietary_notes: dietaryNotes,
                  };

        const res = await fetch(endpoint, {
            method: "POST",
            body: JSON.stringify(payload),
        });

        submitting = false;

        if (res.ok) {
            toast.success(
                existingPreorderId
                    ? "Pre-order updated!"
                    : mode === "preorder"
                      ? "Pre-order submitted!"
                      : "Order sent to kitchen!",
            );
            dispatch("complete");
        } else {
            toast.error(
                mode === "preorder"
                    ? "Failed to submit pre-order"
                    : "Failed to submit order",
            );
        }
    }
</script>

<div class="flex flex-col h-full bg-background">
    <header
        class="px-6 py-4 border-b bg-card flex justify-between items-center flex-none"
    >
        <div>
            <h2 class="text-lg font-semibold text-foreground">
                {headerTitle}
            </h2>
            <p class="text-sm text-muted-foreground">{teacher?.name}</p>
        </div>

        <div class="flex items-center gap-2">
            {#if mode === "preorder"}
                <Button
                    variant="ghost"
                    onclick={() => dispatch("close")}
                    class="text-foreground"
                >
                    <ChevronLeft class="w-4 h-4 mr-1" />
                    Change
                </Button>
            {:else}
                <Button
                    variant="outline"
                    size="sm"
                    onclick={() => dispatch("move")}
                    class="text-muted-foreground"
                >
                    <ArrowRightLeft class="w-4 h-4 mr-1" />
                    Move
                </Button>
                <Button
                    variant="destructive"
                    size="sm"
                    onclick={() => dispatch("checkout")}
                >
                    <LogOut class="w-4 h-4 mr-1" />
                    Check Out
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onclick={() => dispatch("close")}
                    class="text-foreground"
                >
                    <X class="w-5 h-5" />
                </Button>
            {/if}
        </div>
    </header>

    <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div class="flex-1 overflow-hidden flex flex-col min-h-0">
            {#if mode === "waiter" && hasOrderHistory}
                <div class="px-4 md:px-6 pt-4 flex-shrink-0 border-b">
                    <Tabs.Root bind:value={activeTab}>
                        <Tabs.List
                            class="w-full justify-start bg-transparent p-0 h-auto"
                        >
                            <Tabs.Trigger
                                value="menu"
                                class="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                            >
                                <UtensilsCrossed class="w-4 h-4 mr-2" />
                                Menu
                            </Tabs.Trigger>
                            <Tabs.Trigger
                                value="history"
                                class="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3"
                            >
                                <History class="w-4 h-4 mr-2" />
                                Orders
                                <Badge variant="secondary" class="ml-2 text-xs"
                                    >{seatOrders.length}</Badge
                                >
                            </Tabs.Trigger>
                        </Tabs.List>
                    </Tabs.Root>
                </div>
            {/if}

            {#if activeTab === "menu" || mode === "preorder" || !hasOrderHistory}
                <ScrollArea class="flex-1 p-4 md:p-6">
                    <div class="space-y-8">
                        {#each groupedItems as group}
                            {#if group.items.length > 0}
                                <div>
                                    <div class="flex items-center gap-2 mb-4">
                                        <group.icon
                                            class="w-4 h-4 text-muted-foreground"
                                        />
                                        <h3
                                            class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                                        >
                                            {group.name}
                                        </h3>
                                    </div>
                                    <div
                                        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                                    >
                                        {#each group.items as item}
                                            <button
                                                class="group relative bg-card border rounded-xl p-4 text-left hover:border-primary hover:bg-accent transition-all active:scale-[0.98] overflow-hidden"
                                                onclick={() =>
                                                    openCustomizeModal(item)}
                                            >
                                                <p
                                                    class="font-medium text-foreground break-words"
                                                >
                                                    {item.name}
                                                </p>
                                                {#if item.toppings_config?.customizable}
                                                    <Badge
                                                        variant="secondary"
                                                        class="mt-2 text-xs"
                                                    >
                                                        Customizable
                                                    </Badge>
                                                {/if}
                                                <div
                                                    class="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Plus
                                                        class="w-3 h-3 text-primary"
                                                    />
                                                </div>
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        {/each}

                        {#if $menuItems.length === 0}
                            <div
                                class="flex flex-col items-center justify-center py-12 text-muted-foreground"
                            >
                                <ShoppingBag
                                    class="w-12 h-12 mb-3 opacity-30"
                                />
                                <p>Loading menu...</p>
                            </div>
                        {/if}
                    </div>
                </ScrollArea>
            {:else if activeTab === "history"}
                <ScrollArea class="flex-1 p-4 md:p-6">
                    <div class="space-y-4">
                        {#each seatOrders as order (order.id)}
                            {@const statusBadge = getStatusBadge(order.status)}
                            {@const StatusIcon = getStatusIcon(order.status)}
                            <div
                                class="rounded-xl border bg-card overflow-hidden"
                                transition:slide={{ duration: 200 }}
                            >
                                <div
                                    class="p-4 border-b bg-muted/30 flex items-center justify-between"
                                >
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="w-8 h-8 rounded-full flex items-center justify-center {order.status ===
                                            'ready'
                                                ? 'bg-green-500/20'
                                                : order.status === 'pending'
                                                  ? 'bg-orange-500/20'
                                                  : order.status === 'preparing'
                                                    ? 'bg-blue-500/20'
                                                    : 'bg-muted'}"
                                        >
                                            <StatusIcon
                                                class="w-4 h-4 {order.status ===
                                                'ready'
                                                    ? 'text-green-500'
                                                    : order.status === 'pending'
                                                      ? 'text-orange-400'
                                                      : order.status ===
                                                          'preparing'
                                                        ? 'text-blue-400'
                                                        : 'text-muted-foreground'}"
                                            />
                                        </div>
                                        <div>
                                            <Badge
                                                class="{statusBadge.class} border"
                                            >
                                                {statusBadge.label}
                                            </Badge>
                                            <p
                                                class="text-xs text-muted-foreground mt-1"
                                            >
                                                {new Date(
                                                    order.created_at,
                                                ).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        {#if order.status !== "served"}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                class="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onclick={() =>
                                                    cancelOrder(order.id)}
                                                disabled={cancellingOrderId ===
                                                    order.id}
                                            >
                                                <RotateCcw
                                                    class="w-3.5 h-3.5 mr-1 {cancellingOrderId ===
                                                    order.id
                                                        ? 'animate-spin'
                                                        : ''}"
                                                />
                                                Recall
                                            </Button>
                                        {/if}
                                        <Badge
                                            variant="outline"
                                            class="text-xs"
                                        >
                                            {order.order_items?.length || 0} items
                                        </Badge>
                                    </div>
                                </div>

                                <div class="p-4 space-y-2">
                                    {#each order.order_items || [] as item}
                                        <div
                                            class="flex items-start gap-3 p-2 rounded-lg bg-muted/30"
                                        >
                                            <div
                                                class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"
                                            >
                                                {#if item.menu_items?.category === "drink"}
                                                    <Coffee
                                                        class="w-3 h-3 text-primary"
                                                    />
                                                {:else}
                                                    <UtensilsCrossed
                                                        class="w-3 h-3 text-primary"
                                                    />
                                                {/if}
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <p
                                                    class="font-medium text-sm text-foreground break-words"
                                                >
                                                    {item.menu_items?.name ||
                                                        "Unknown Item"}
                                                </p>
                                                {#if item.toppings && item.toppings.length > 0}
                                                    <div
                                                        class="flex flex-wrap gap-1 mt-1"
                                                    >
                                                        {#each item.toppings as topping}
                                                            <Badge
                                                                variant="secondary"
                                                                class="text-xs py-0"
                                                                >{topping}</Badge
                                                            >
                                                        {/each}
                                                    </div>
                                                {/if}
                                                {#if item.notes}
                                                    <p
                                                        class="text-xs text-yellow-500 mt-1 italic break-words"
                                                    >
                                                        "{item.notes}"
                                                    </p>
                                                {/if}
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/each}

                        {#if seatOrders.length === 0}
                            <div
                                class="flex flex-col items-center justify-center py-12 text-muted-foreground"
                            >
                                <History class="w-12 h-12 mb-3 opacity-30" />
                                <p>No orders yet</p>
                            </div>
                        {/if}
                    </div>
                </ScrollArea>
            {/if}
        </div>

        <div
            class="w-full md:w-[min(384px,40vw)] border-t md:border-t-0 md:border-l bg-card flex flex-col flex-none max-h-[50vh] md:max-h-none overflow-hidden"
        >
            <div class="p-4 border-b">
                <div class="flex items-center justify-between">
                    <h3 class="font-semibold text-foreground">Order</h3>
                    <Badge variant="secondary">{cart.length} items</Badge>
                </div>
            </div>

            {#if /*mode === "preorder"*/ true}
                <div class="p-4 border-b bg-muted/50">
                    <label
                        class="block text-sm font-medium mb-2 text-foreground"
                    >
                        Dietary Requirements
                    </label>
                    <Input
                        type="text"
                        bind:value={dietaryNotes}
                        placeholder="e.g., Vegetarian, Gluten-free..."
                        class="text-muted-foreground"
                    />
                </div>
            {/if}

            <ScrollArea class="flex-1 min-h-0">
                <div class="p-4 space-y-2">
                    {#each cart as item, i (i)}
                        <div
                            class="group bg-background border rounded-lg p-3 hover:border-primary/50 transition-colors overflow-hidden"
                            transition:scale={{ duration: 150, start: 0.95 }}
                        >
                            <div
                                class="flex justify-between items-start mb-1 gap-2"
                            >
                                <p
                                    class="font-medium text-sm flex-1 text-foreground break-words min-w-0"
                                >
                                    {item.name}
                                </p>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="h-6 w-6 -mr-1 text-muted-foreground hover:text-destructive"
                                    onclick={() => removeFromCart(i)}
                                >
                                    <Trash2 class="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            {#if item.toppings?.length > 0}
                                <div class="flex flex-wrap gap-1 mb-1">
                                    {#each item.toppings as topping}
                                        <Badge
                                            variant="outline"
                                            class="text-xs py-0"
                                        >
                                            {topping}
                                        </Badge>
                                    {/each}
                                </div>
                            {/if}
                            {#if item.notes}
                                <p
                                    class="text-xs text-muted-foreground italic break-words"
                                >
                                    "{item.notes}"
                                </p>
                            {/if}
                        </div>
                    {/each}

                    {#if cart.length === 0}
                        <div
                            class="flex flex-col items-center justify-center py-12 text-muted-foreground"
                        >
                            <ShoppingBag class="w-10 h-10 mb-2 opacity-30" />
                            <p class="text-sm">Select items from menu</p>
                        </div>
                    {/if}
                </div>
            </ScrollArea>

            <div class="p-4 border-t bg-card flex-none">
                <Button
                    class="w-full"
                    size="lg"
                    disabled={cart.length === 0 || submitting}
                    onclick={submitOrder}
                >
                    {#if submitting}
                        <div
                            class="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2"
                        ></div>
                        {existingPreorderId ? "Updating..." : "Submitting..."}
                    {:else}
                        <Send class="w-4 h-4 mr-2" />
                        {existingPreorderId
                            ? "Update Order"
                            : mode === "preorder"
                              ? "Place Pre-order"
                              : "Submit Order"}
                    {/if}
                </Button>
            </div>
        </div>
    </div>
</div>

<Dialog.Root bind:open={showCustomizeModal}>
    <Dialog.Content
        class="w-[calc(100vw-2rem)] max-w-lg dark bg-card border-border"
    >
        <Dialog.Header>
            <Dialog.Title class="text-foreground"
                >Customize {selectedItem?.name}</Dialog.Title
            >
            <Dialog.Description class="text-muted-foreground">
                Add toppings and special requests
            </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-6">
            {#if selectedItem?.toppings_config?.customizable && selectedItem?.toppings_config?.options}
                <div>
                    <h4 class="text-sm font-medium text-foreground mb-3">
                        Options
                    </h4>
                    <div class="flex flex-wrap gap-2">
                        {#each selectedItem.toppings_config.options as option}
                            {@const isSelected =
                                customizeToppings.includes(option)}
                            <Button
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onclick={() => {
                                    if (isSelected) {
                                        customizeToppings =
                                            customizeToppings.filter(
                                                (t) => t !== option,
                                            );
                                    } else {
                                        customizeToppings = [
                                            ...customizeToppings,
                                            option,
                                        ];
                                    }
                                }}
                                class={isSelected
                                    ? ""
                                    : "text-muted-foreground"}
                            >
                                {option}
                            </Button>
                        {/each}
                    </div>
                </div>
            {/if}

            <div>
                <h4 class="text-sm font-medium text-foreground mb-3">
                    Special Requests
                </h4>
                <Textarea
                    bind:value={customizeNotes}
                    placeholder="E.g., 'No salt', 'Extra crispy'..."
                    rows={3}
                    class="bg-background border-border"
                />
            </div>
        </div>

        <Dialog.Footer class="gap-3">
            <Button
                variant="outline"
                class="text-muted-foreground"
                onclick={() => (showCustomizeModal = false)}
            >
                Cancel
            </Button>
            <Button onclick={confirmCustomization}>
                <Plus class="w-4 h-4 mr-1" />
                Add to Order
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
