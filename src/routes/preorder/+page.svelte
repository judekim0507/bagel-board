<script lang="ts">
    import { teachers, fetchTeachers } from "$lib/stores/teachers";
    import { onMount } from "svelte";
    import { fade, scale } from "svelte/transition";
    import { getDeviceId } from "$lib/utils/device";
    import OrderInterface from "$lib/components/OrderInterface.svelte";
    import { toast } from "svelte-sonner";

    import { Button } from "$lib/components/ui/button/index.js";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { Input } from "$lib/components/ui/input/index.js";
    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import Search from "lucide-svelte/icons/search";
    import Check from "lucide-svelte/icons/check";
    import UtensilsCrossed from "lucide-svelte/icons/utensils-crossed";
    import ChevronRight from "lucide-svelte/icons/chevron-right";
    import Pencil from "lucide-svelte/icons/pencil";
    import Trash2 from "lucide-svelte/icons/trash-2";
    import ShoppingBag from "lucide-svelte/icons/shopping-bag";

    let step = 1;
    let selectedTeacher: any = null;
    let searchQuery = "";
    let existingPreorders: Map<string, any> = new Map();
    let selectedPreorder: any = null;

    onMount(async () => {
        await fetchTeachers();
        await fetchPreorders();
    });

    async function fetchPreorders() {
        const res = await fetch("/api/preorders?fulfilled=false");
        if (res.ok) {
            const data = await res.json();
            existingPreorders = new Map(
                data.map((p: any) => [p.teacher_id, p]),
            );
        }
    }

    $: filteredTeachers = $teachers.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    function selectTeacher(teacher: any) {
        selectedTeacher = teacher;
        selectedPreorder = existingPreorders.get(teacher.id) || null;
        step = 2;
    }

    async function handleOrderComplete() {
        await fetchPreorders();
        editingCart = [];
        editingPreorderId = "";
        step = 3;
        setTimeout(() => {
            step = 1;
            selectedTeacher = null;
            selectedPreorder = null;
            searchQuery = "";
        }, 5000);
    }

    function handleOrderClose() {
        step = 1;
        selectedTeacher = null;
        selectedPreorder = null;
        editingCart = [];
        editingPreorderId = "";
    }

    async function deletePreorder(preorderId: string) {
        const res = await fetch(`/api/preorders/${preorderId}`, {
            method: "DELETE",
        });

        if (res.ok) {
            await fetchPreorders();
            return true;
        } else {
            toast.error("Failed to delete pre-order");
            return false;
        }
    }

    async function handleDelete() {
        const confirmed = await confirmDialog.confirm({
            title: "Delete Pre-order",
            description: `Delete ${selectedTeacher?.name}'s pre-order?`,
            confirmText: "Delete",
            variant: "destructive",
        });
        if (!confirmed) return;

        const success = await deletePreorder(selectedPreorder.id);
        if (success) {
            toast.success("Pre-order deleted");
            handleOrderClose();
        }
    }

    function handleEdit() {
        // Convert pre_order_items to cart format
        const cartItems = (selectedPreorder.pre_order_items || []).map((item: any) => ({
            menu_item_id: item.menu_item_id,
            name: item.menu_items?.name || "Unknown Item",
            toppings: item.toppings || [],
            notes: item.notes || "",
        }));
        editingCart = cartItems;
        editingPreorderId = selectedPreorder.id;
        selectedPreorder = null; // This will show OrderInterface
    }

    let editingCart: any[] = [];
    let editingPreorderId: string = "";
    let confirmDialog: ConfirmDialog;
</script>

<div class="h-full dark">
    {#if step === 1}
        <div
            class="h-full bg-stone-950 text-foreground flex flex-col"
            in:fade={{ duration: 150 }}
        >
            <header class="px-6 pt-12 pb-8 text-center flex-none">
                <div
                    class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4"
                >
                    <UtensilsCrossed class="w-7 h-7 text-primary" />
                </div>
                <h1
                    class="text-4xl font-medium text-foreground font-instrument-serif"
                >
                    Pre-order Breakfast
                </h1>
                <p class="text-muted-foreground text-sm mt-1">
                    Select your name to continue
                </p>
            </header>

            <div class="px-6 pb-4 flex-none">
                <div class="max-w-md mx-auto">
                    <div class="relative">
                        <Search
                            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                        />
                        <Input
                            type="text"
                            placeholder="Search..."
                            bind:value={searchQuery}
                            class="pl-9 h-11 bg-stone-900 border-stone-800"
                            autofocus
                        />
                    </div>
                </div>
            </div>

            <div class="flex-1 overflow-hidden px-6 pb-6">
                <ScrollArea class="h-full">
                    <div class="max-w-md mx-auto space-y-2">
                        {#each filteredTeachers as teacher}
                            {@const hasPreorder = existingPreorders.has(
                                teacher.id,
                            )}
                            <button
                                class="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left active:scale-[0.99] group cursor-pointer
                                       {hasPreorder
                                    ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                                    : 'bg-stone-900 border-stone-800 hover:border-stone-700 hover:bg-stone-800'}"
                                onclick={() => selectTeacher(teacher)}
                            >
                                <!-- {#if hasPreorder}
                                    <div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                        <Check class="w-4 h-4 text-green-500" />
                                    </div>
                                {/if} -->
                                <span
                                    class="flex-1 font-medium text-foreground"
                                >
                                    {teacher.name}
                                </span>
                                {#if hasPreorder}
                                    <Badge
                                        variant="secondary"
                                        class="text-xs bg-green-500/20 text-green-400 border-0"
                                    >
                                        Ordered
                                    </Badge>
                                {:else}
                                    <ChevronRight
                                        class="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors"
                                    />
                                {/if}
                            </button>
                        {/each}

                        {#if filteredTeachers.length === 0}
                            <div
                                class="py-12 text-center text-muted-foreground"
                            >
                                <p class="text-sm">No results found</p>
                            </div>
                        {/if}
                    </div>
                </ScrollArea>
            </div>
        </div>
    {:else if step === 2}
        <div class="h-full bg-card" in:fade={{ duration: 150 }}>
            {#if selectedPreorder}
                <!-- Show existing order -->
                <div class="h-full flex flex-col bg-stone-950">
                    <header
                        class="px-6 py-4 border-b border-stone-800 flex items-center justify-between flex-none"
                    >
                        <div>
                            <h2 class="text-lg font-semibold text-foreground">
                                Your Pre-order
                            </h2>
                            <p class="text-sm text-muted-foreground">
                                {selectedTeacher?.name}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            onclick={handleOrderClose}
                            class="text-muted-foreground"
                        >
                            Back
                        </Button>
                    </header>

                    <div class="flex-1 overflow-y-auto p-6">
                        <div class="max-w-md mx-auto space-y-4">
                            <div
                                class="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30"
                            >
                                <div
                                    class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"
                                >
                                    <Check class="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <p class="font-medium text-foreground">
                                        Order Confirmed
                                    </p>
                                    <p class="text-sm text-muted-foreground">
                                        Your order will be ready when you check
                                        in
                                    </p>
                                </div>
                            </div>

                            <div class="space-y-2">
                                <p
                                    class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                                >
                                    Items
                                </p>
                                {#each selectedPreorder.pre_order_items || [] as item}
                                    <div
                                        class="p-3 rounded-lg bg-stone-900 border border-stone-800"
                                    >
                                        <p class="font-medium text-foreground">
                                            {item.menu_items?.name ||
                                                item.menu_item_id}
                                        </p>
                                        {#if item.toppings && item.toppings.length > 0}
                                            <div
                                                class="flex flex-wrap gap-1 mt-2"
                                            >
                                                {#each item.toppings as topping}
                                                    <Badge
                                                        variant="secondary"
                                                        class="text-xs"
                                                        >{topping}</Badge
                                                    >
                                                {/each}
                                            </div>
                                        {/if}
                                        {#if item.notes}
                                            <p
                                                class="text-sm text-yellow-500 mt-2 italic"
                                            >
                                                "{item.notes}"
                                            </p>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>

                    <div class="p-6 border-t border-stone-800 flex-none">
                        <div class="max-w-md mx-auto flex gap-3">
                            <Button
                                variant="outline"
                                class="flex-1 text-muted-foreground cursor-pointer"
                                onclick={handleDelete}
                            >
                                <Trash2 class="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                            <Button
                                class="flex-1 cursor-pointer"
                                onclick={handleEdit}
                            >
                                <Pencil class="w-4 h-4 mr-2" />
                                Edit Order
                            </Button>
                        </div>
                    </div>
                </div>
            {:else}
                <OrderInterface
                    teacher={selectedTeacher}
                    deviceId={getDeviceId()}
                    mode="preorder"
                    headerTitle={editingPreorderId ? "Edit Pre-order" : "Your Pre-order"}
                    initialCart={editingCart}
                    existingPreorderId={editingPreorderId}
                    on:complete={handleOrderComplete}
                    on:close={handleOrderClose}
                />
            {/if}
        </div>
    {:else if step === 3}
        <div
            class="h-full bg-stone-950 text-foreground flex items-center justify-center"
            in:scale={{ duration: 300, start: 0.95 }}
        >
            <div class="flex flex-col items-center gap-5 text-center px-6">
                <div
                    class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center"
                >
                    <Check class="w-8 h-8 text-green-500" />
                </div>
                <div>
                    <h2 class="text-xl font-semibold text-foreground mb-1">
                        Order Received
                    </h2>
                    <p class="text-muted-foreground text-sm max-w-xs">
                        Thanks, {selectedTeacher?.name}! Your order will be
                        ready when you check in.
                    </p>
                </div>
                <p class="text-xs text-muted-foreground">
                    Returning in 5 seconds...
                </p>
            </div>
        </div>
    {/if}
</div>

<!-- Confirm Dialog -->
<ConfirmDialog bind:this={confirmDialog} />
