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
    import Coffee from "lucide-svelte/icons/coffee";

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

{#if step === 1}
    <!-- Teacher Selection -->
    <div class="h-full bg-background text-foreground p-6 overflow-hidden flex flex-col" in:fade={{ duration: 150 }}>
        <header class="mb-8 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Coffee class="w-8 h-8 text-primary" />
            </div>
            <h1 class="text-3xl font-bold tracking-tight">Pre-order Breakfast</h1>
            <p class="text-muted-foreground mt-1">
                Order ahead and pick up when you arrive
            </p>
        </header>

        <div class="flex-1 overflow-hidden flex flex-col max-w-lg mx-auto w-full">
            <div class="mb-4">
                <h2 class="text-xl font-semibold text-center mb-4">
                    Who are you?
                </h2>
                <div class="relative">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search your name..."
                        bind:value={searchQuery}
                        class="pl-10 h-12 text-lg"
                        autofocus
                    />
                </div>
            </div>

            <ScrollArea class="flex-1">
                <div class="space-y-2">
                    {#each filteredTeachers as teacher}
                        <button
                            class="w-full flex items-center gap-4 p-4 rounded-xl bg-card border hover:border-primary hover:bg-accent transition-all text-left active:scale-[0.99]"
                            on:click={() => selectTeacher(teacher)}
                        >
                            <Avatar.Root class="h-12 w-12">
                                <Avatar.Fallback class="bg-primary text-primary-foreground text-lg font-semibold">
                                    {teacher.name[0]}
                                </Avatar.Fallback>
                            </Avatar.Root>
                            <div class="flex-1">
                                <p class="font-semibold text-foreground text-lg">
                                    {teacher.name}
                                </p>
                            </div>
                        </button>
                    {/each}

                    {#if filteredTeachers.length === 0}
                        <div class="py-12 text-center text-muted-foreground">
                            <p>No teachers found</p>
                        </div>
                    {/if}
                </div>
            </ScrollArea>
        </div>
    </div>
{:else if step === 2}
    <!-- Order Interface -->
    <div class="h-full" in:fade={{ duration: 150 }}>
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
        class="h-full bg-background text-foreground flex items-center justify-center"
        in:scale={{ duration: 300, start: 0.9 }}
    >
        <div class="flex flex-col items-center gap-6 text-center px-6">
            <div class="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                <Check class="w-12 h-12 text-white" />
            </div>
            <div>
                <h2 class="text-3xl font-bold mb-2">Pre-order Received!</h2>
                <p class="text-muted-foreground text-lg max-w-md">
                    Thanks, {selectedTeacher?.name}! Your order will be ready when you check in.
                </p>
            </div>
            <p class="text-sm text-muted-foreground mt-4">
                Resetting in 5 seconds...
            </p>
        </div>
    </div>
{/if}
