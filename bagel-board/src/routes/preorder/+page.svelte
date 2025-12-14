<script lang="ts">
    import { teachers, fetchTeachers } from "$lib/stores/teachers";
    import { onMount } from "svelte";
    import { fade, scale } from "svelte/transition";
    import { getDeviceId } from "$lib/utils/device";
    import OrderInterface from "$lib/components/OrderInterface.svelte";

    // shadcn-svelte components
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";

    // Icons
    import Search from "lucide-svelte/icons/search";
    import Check from "lucide-svelte/icons/check";
    import UtensilsCrossed from "lucide-svelte/icons/utensils-crossed";
    import ChevronRight from "lucide-svelte/icons/chevron-right";

    let step = 1;
    let selectedTeacher: any = null;
    let searchQuery = "";

    onMount(() => {
        fetchTeachers();
    });

    $: filteredTeachers = $teachers.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    function selectTeacher(teacher: any) {
        selectedTeacher = teacher;
        step = 2;
    }

    function handleOrderComplete() {
        step = 3;
        setTimeout(() => {
            step = 1;
            selectedTeacher = null;
            searchQuery = "";
        }, 5000);
    }

    function handleOrderClose() {
        step = 1;
        selectedTeacher = null;
    }
</script>

<div class="h-full dark">
    {#if step === 1}
        <!-- Teacher Selection -->
        <div
            class="h-full bg-stone-950 text-foreground flex flex-col"
            in:fade={{ duration: 150 }}
        >
            <!-- Header -->
            <header class="px-6 pt-12 pb-8 text-center flex-none">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                    <UtensilsCrossed class="w-7 h-7 text-primary" />
                </div>
                <h1 class="text-2xl font-bold tracking-tight text-foreground">Pre-order Breakfast</h1>
                <p class="text-muted-foreground text-sm mt-1">
                    Order ahead for faster pickup
                </p>
            </header>

            <!-- Search -->
            <div class="px-6 pb-4 flex-none">
                <div class="max-w-md mx-auto">
                    <p class="text-sm font-medium text-muted-foreground mb-3 text-center">
                        Select your name to continue
                    </p>
                    <div class="relative">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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

            <!-- Teacher List -->
            <div class="flex-1 overflow-hidden px-6 pb-6">
                <ScrollArea class="h-full">
                    <div class="max-w-md mx-auto space-y-2">
                        {#each filteredTeachers as teacher}
                            <button
                                class="w-full flex items-center gap-3 p-3 rounded-xl bg-stone-900 border border-stone-800
                                       hover:border-stone-700 hover:bg-stone-800 transition-all text-left active:scale-[0.99] group"
                                onclick={() => selectTeacher(teacher)}
                            >
                                <Avatar.Root class="h-10 w-10 flex-shrink-0">
                                    <Avatar.Fallback class="bg-stone-800 text-foreground font-medium">
                                        {teacher.name[0]}
                                    </Avatar.Fallback>
                                </Avatar.Root>
                                <span class="flex-1 font-medium text-foreground">
                                    {teacher.name}
                                </span>
                                <ChevronRight class="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </button>
                        {/each}

                        {#if filteredTeachers.length === 0}
                            <div class="py-12 text-center text-muted-foreground">
                                <p class="text-sm">No results found</p>
                            </div>
                        {/if}
                    </div>
                </ScrollArea>
            </div>
        </div>
    {:else if step === 2}
        <!-- Order Interface -->
        <div class="h-full bg-card" in:fade={{ duration: 150 }}>
            <OrderInterface
                teacher={selectedTeacher}
                deviceId={getDeviceId()}
                mode="preorder"
                headerTitle="Your Pre-order"
                on:complete={handleOrderComplete}
                on:close={handleOrderClose}
            />
        </div>
    {:else if step === 3}
        <!-- Success -->
        <div
            class="h-full bg-stone-950 text-foreground flex items-center justify-center"
            in:scale={{ duration: 300, start: 0.95 }}
        >
            <div class="flex flex-col items-center gap-5 text-center px-6">
                <div class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check class="w-8 h-8 text-green-500" />
                </div>
                <div>
                    <h2 class="text-xl font-semibold text-foreground mb-1">Order Received</h2>
                    <p class="text-muted-foreground text-sm max-w-xs">
                        Thanks, {selectedTeacher?.name}! Your order will be ready when you check in.
                    </p>
                </div>
                <p class="text-xs text-muted-foreground">
                    Returning in 5 seconds...
                </p>
            </div>
        </div>
    {/if}
</div>
