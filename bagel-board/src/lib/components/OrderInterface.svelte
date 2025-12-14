<script lang="ts">
    import { menuItems, fetchMenu } from "$lib/stores/menu";
    import { onMount, createEventDispatcher } from "svelte";
    import { fade, scale } from "svelte/transition";
    import { toast } from "svelte-sonner";
    import Modal from "./Modal.svelte";

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

        const itemName = selectedItem.name;
        cart = [
            ...cart,
            {
                menu_item_id: selectedItem.id,
                name: itemName,
                toppings: customizeToppings,
                notes: customizeNotes,
            },
        ];

        showCustomizeModal = false;
        selectedItem = null;
        customizeToppings = [];
        customizeNotes = "";
        toast.success(`${itemName} added to order`);
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
        const payload = mode === "preorder"
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
            const successMessage = mode === "preorder"
                ? "Pre-order submitted!"
                : "Order sent to kitchen!";
            toast.success(successMessage);
            dispatch("complete");
        } else {
            const errorMessage = mode === "preorder"
                ? "Failed to submit pre-order"
                : "Failed to submit order";
            toast.error(errorMessage);
        }
    }
</script>

<div
    class="flex flex-col h-full bg-zinc-900 text-white overflow-hidden"
>
    <!-- Header -->
    <div
        class="px-6 py-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center flex-none"
    >
        <div class="flex-1">
            <h2 class="text-xl font-bold">{headerTitle}</h2>
            <p class="text-zinc-400 text-sm">For {teacher.name}</p>
        </div>
        <div class="flex items-center gap-2">
            {#if mode === "preorder"}
                <button
                    on:click={() => dispatch("close")}
                    class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 hover:text-white transition-colors font-medium"
                >
                    ← Change Teacher
                </button>
            {:else}
                <button
                    on:click={() => dispatch("checkout")}
                    class="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-white transition-colors font-medium flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
                    </svg>
                    Check Out
                </button>
                <button
                    on:click={() => dispatch("close")}
                    class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>
            {/if}
        </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
        <!-- Menu -->
        <div
            class="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar"
        >
            {#each groupedItems as group}
                {#if group.items.length > 0}
                    <div>
                        <h3
                            class="text-lg font-bold mb-4 text-zinc-300 uppercase tracking-wider text-xs"
                        >
                            {group.name}
                        </h3>
                        <div class="grid grid-cols-2 gap-3">
                            {#each group.items as item}
                                <button
                                    class="bg-zinc-800 p-4 rounded-xl text-left hover:bg-zinc-700 transition-all flex flex-col gap-1 group border-2 border-transparent hover:border-orange-500 active:scale-95"
                                    on:click={() => openCustomizeModal(item)}
                                >
                                    <span class="font-bold">{item.name}</span>
                                    {#if item.toppings_config?.customizable}
                                        <span
                                            class="text-xs text-zinc-500 italic"
                                            >Customizable</span
                                        >
                                    {/if}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}
            {/each}
            {#if $menuItems.length === 0}
                <p class="text-zinc-500">Loading menu...</p>
            {/if}
        </div>

        <!-- Cart Sidebar -->
        <div
            class="w-96 bg-zinc-800/50 border-l border-zinc-700 flex flex-col flex-none"
        >
            <div class="p-4 border-b border-zinc-700">
                <h3 class="font-bold">Current Order ({cart.length} items)</h3>
            </div>

            {#if mode === "preorder"}
                <!-- Dietary Requirements Input (Preorder only) -->
                <div class="p-4 border-b border-zinc-700 bg-zinc-800">
                    <label class="block text-sm font-medium mb-2 text-zinc-300">
                        Dietary Requirements
                    </label>
                    <input
                        type="text"
                        bind:value={dietaryNotes}
                        placeholder="e.g., Vegetarian, Gluten-free, Nut allergy..."
                        class="w-full px-3 py-2 rounded-lg bg-zinc-900 text-white border border-zinc-700 focus:outline-none focus:border-orange-500 text-sm"
                    />
                </div>
            {/if}

            <div
                class="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar"
            >
                {#each cart as item, i (i)}
                    <div
                        class="bg-zinc-800 p-3 rounded-lg group hover:bg-zinc-750"
                        transition:scale={{ duration: 150 }}
                    >
                        <div class="flex justify-between items-start mb-1">
                            <p class="font-medium text-sm flex-1">
                                {item.name}
                            </p>
                            <button
                                class="text-zinc-500 hover:text-red-400 ml-2"
                                on:click={() => removeFromCart(i)}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    class="w-5 h-5"
                                >
                                    <path
                                        d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                                    />
                                </svg>
                            </button>
                        </div>
                        {#if item.toppings && item.toppings.length > 0}
                            <div class="flex flex-wrap gap-1 mb-1">
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
                            <p class="text-xs text-zinc-400 italic">
                                "{item.notes}"
                            </p>
                        {/if}
                    </div>
                {/each}
                {#if cart.length === 0}
                    <div
                        class="flex-1 flex items-center justify-center text-zinc-500 text-sm italic"
                    >
                        Select items from the menu
                    </div>
                {/if}
            </div>

            <div class="p-4 border-t border-zinc-700 bg-zinc-800 flex-none">
                <button
                    class="w-full py-4 rounded-xl font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    disabled={cart.length === 0 || submitting}
                    on:click={submitOrder}
                >
                    {#if submitting}
                        Submitting...
                    {:else if mode === "preorder"}
                        Place Pre-order
                    {:else}
                        Submit Order
                    {/if}
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Customization Modal -->
{#if showCustomizeModal && selectedItem}
    <Modal
        title="Customize {selectedItem.name}"
        on:close={() => (showCustomizeModal = false)}
    >
        <div class="flex flex-col gap-6 min-w-[400px] max-w-[500px]">
            <!-- Toppings -->
            {#if selectedItem.toppings_config?.customizable && selectedItem.toppings_config?.options}
                <div>
                    <h4 class="font-bold text-white mb-3">
                        Select Options (optional)
                    </h4>
                    <div class="flex flex-wrap gap-2">
                        {#each selectedItem.toppings_config.options as option}
                            {@const isSelected = customizeToppings.includes(
                                option,
                            )}
                            <button
                                class="px-4 py-2 rounded-lg border-2 transition-all active:scale-95"
                                class:bg-orange-500={isSelected}
                                class:border-orange-500={isSelected}
                                class:text-white={isSelected}
                                class:bg-zinc-800={!isSelected}
                                class:border-zinc-700={!isSelected}
                                class:text-zinc-300={!isSelected}
                                class:hover:border-zinc-500={!isSelected}
                                on:click={() => {
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
                            >
                                {option}
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Special Requests -->
            <div>
                <h4 class="font-bold text-white mb-3">
                    Special Requests (optional)
                </h4>
                <textarea
                    bind:value={customizeNotes}
                    placeholder="E.g., 'No salt', 'Extra crispy', 'Allergy to nuts'..."
                    class="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-orange-500 resize-none"
                    rows="3"
                ></textarea>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
                <button
                    class="flex-1 py-3 rounded-xl font-bold bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
                    on:click={() => (showCustomizeModal = false)}
                >
                    Cancel
                </button>
                <button
                    class="flex-1 py-3 rounded-xl font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                    on:click={confirmCustomization}
                >
                    Add to Order
                </button>
            </div>
        </div>
    </Modal>
{/if}
