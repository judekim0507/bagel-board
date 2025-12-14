<script lang="ts">
    import { menuItems, fetchMenu } from "$lib/stores/menu";
    import { onMount, createEventDispatcher } from "svelte";
    import { scale } from "svelte/transition";
    import { toast } from "svelte-sonner";

    // shadcn-svelte components
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";
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

    export let teacher: any;
    export let seatId: string = "";
    export let deviceId: string;
    export let mode: "waiter" | "preorder" = "waiter";
    export let headerTitle: string = "New Order";

    const dispatch = createEventDispatcher();

    let cart: any[] = [];
    let submitting = false;
    let selectedItem: any = null;
    let showCustomizeModal = false;
    let customizeToppings: string[] = [];
    let customizeNotes = "";
    let dietaryNotes = teacher?.dietary_notes || "";

    onMount(() => {
        fetchMenu();
    });

    $: categories = ["meal", "drink"];
    $: groupedItems = categories.map((cat) => ({
        name: cat === "meal" ? "Main" : "Drinks",
        icon: cat === "meal" ? UtensilsCrossed : Coffee,
        items: $menuItems.filter((i) => i.category === cat),
    }));

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
        if (cart.length === 0) return;
        submitting = true;

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
                  };

        const res = await fetch(endpoint, {
            method: "POST",
            body: JSON.stringify(payload),
        });

        submitting = false;

        if (res.ok) {
            toast.success(
                mode === "preorder"
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
    <!-- Header -->
    <header
        class="px-6 py-4 border-b bg-card flex justify-between items-center flex-none"
    >
        <div class="flex items-center gap-4">
            <!-- <Avatar.Root class="h-10 w-10">
                <Avatar.Fallback
                    class="bg-primary text-primary-foreground font-semibold"
                >
                    {teacher?.name?.[0]}
                </Avatar.Fallback>
            </Avatar.Root> -->
            <div>
                <h2 class="text-lg font-semibold text-foreground">
                    {headerTitle}
                </h2>
                <p class="text-sm text-muted-foreground">{teacher?.name}</p>
            </div>
        </div>

        <div class="flex items-center gap-2">
            {#if mode === "preorder"}
                <Button variant="ghost" onclick={() => dispatch("close")}>
                    <ChevronLeft class="w-4 h-4 mr-1" />
                    Change
                </Button>
            {:else}
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

    <div class="flex-1 flex overflow-hidden">
        <!-- Menu -->
        <div class="flex-1 overflow-hidden flex flex-col">
            <ScrollArea class="flex-1 p-6">
                <div class="space-y-8">
                    {#each groupedItems as group}
                        {#if group.items.length > 0}
                            <div>
                                <div class="flex items-center gap-2 mb-4">
                                    <svelte:component
                                        this={group.icon}
                                        class="w-4 h-4 text-muted-foreground"
                                    />
                                    <h3
                                        class="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                                    >
                                        {group.name}
                                    </h3>
                                </div>
                                <div
                                    class="grid grid-cols-2 lg:grid-cols-3 gap-3"
                                >
                                    {#each group.items as item}
                                        <button
                                            class="group relative bg-card border rounded-xl p-4 text-left hover:border-primary hover:bg-accent transition-all active:scale-[0.98]"
                                            on:click={() =>
                                                openCustomizeModal(item)}
                                        >
                                            <p
                                                class="font-medium text-foreground"
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
                            <ShoppingBag class="w-12 h-12 mb-3 opacity-30" />
                            <p>Loading menu...</p>
                        </div>
                    {/if}
                </div>
            </ScrollArea>
        </div>

        <!-- Cart Sidebar -->
        <div class="w-80 lg:w-96 border-l bg-card flex flex-col flex-none">
            <div class="p-4 border-b">
                <div class="flex items-center justify-between">
                    <h3 class="font-semibold text-foreground">Order</h3>
                    <Badge variant="secondary">{cart.length} items</Badge>
                </div>
            </div>

            {#if mode === "preorder"}
                <div class="p-4 border-b bg-muted/50">
                    <label class="block text-sm font-medium mb-2">
                        Dietary Requirements
                    </label>
                    <Input
                        type="text"
                        bind:value={dietaryNotes}
                        placeholder="e.g., Vegetarian, Gluten-free..."
                    />
                </div>
            {/if}

            <ScrollArea class="flex-1">
                <div class="p-4 space-y-2">
                    {#each cart as item, i (i)}
                        <div
                            class="group bg-background border rounded-lg p-3 hover:border-primary/50 transition-colors"
                            transition:scale={{ duration: 150, start: 0.95 }}
                        >
                            <div class="flex justify-between items-start mb-1">
                                <p class="font-medium text-sm flex-1">
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
                                <p class="text-xs text-muted-foreground italic">
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
                        Submitting...
                    {:else}
                        <Send class="w-4 h-4 mr-2" />
                        {mode === "preorder"
                            ? "Place Pre-order"
                            : "Submit Order"}
                    {/if}
                </Button>
            </div>
        </div>
    </div>
</div>

<!-- Customization Modal -->
<Dialog.Root bind:open={showCustomizeModal}>
    <Dialog.Content class="sm:max-w-lg dark bg-card border-border">
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
                            {@const isSelected = customizeToppings.includes(option)}
                            <Button
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onclick={() => {
                                    if (isSelected) {
                                        customizeToppings = customizeToppings.filter((t) => t !== option);
                                    } else {
                                        customizeToppings = [...customizeToppings, option];
                                    }
                                }}
                                class={isSelected ? "" : "text-muted-foreground"}
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
