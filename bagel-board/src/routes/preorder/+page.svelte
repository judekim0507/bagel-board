<script lang="ts">
    import { teachers, fetchTeachers } from "$lib/stores/teachers";
    import { onMount } from "svelte";
    import { getDeviceId } from "$lib/utils/device";
    import { fade, scale } from "svelte/transition";
    import OrderInterface from "$lib/components/OrderInterface.svelte";

    let step = 1; // 1: Teacher Select, 2: OrderInterface (full screen), 3: Success
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
    <!-- Teacher Selection - Full Screen -->
    <div class="h-full bg-zinc-900 text-white p-6 overflow-hidden flex flex-col" in:fade>
        <header class="mb-6">
            <h1 class="text-3xl font-bold">Pre-order Your Breakfast</h1>
            <p class="text-zinc-500 text-sm">
                Order ahead • Pick up when you arrive
            </p>
        </header>

        <div class="flex-1 overflow-hidden flex flex-col">
            <div class="max-w-2xl mx-auto flex flex-col gap-4 h-full">
                <h2 class="text-2xl font-bold text-center mb-2">
                    Who are you?
                </h2>
                <input
                    type="text"
                    placeholder="Search your name..."
                    bind:value={searchQuery}
                    class="w-full px-6 py-4 rounded-2xl bg-zinc-800 text-white border-2 border-zinc-700 focus:outline-none focus:border-orange-500 text-lg"
                    autofocus
                />

                <div class="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                    {#each filteredTeachers as teacher}
                        <button
                            class="flex items-center gap-4 p-5 rounded-2xl hover:bg-zinc-800 transition-all text-left bg-zinc-800/30 border-2 border-transparent hover:border-orange-500 active:scale-95"
                            on:click={() => selectTeacher(teacher)}
                        >
                            <div
                                class="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xl"
                            >
                                {teacher.name[0]}
                            </div>
                            <div class="flex-1">
                                <p class="font-bold text-white text-xl">
                                    {teacher.name}
                                </p>
                            </div>
                        </button>
                    {/each}

                    {#if filteredTeachers.length === 0}
                        <div
                            class="flex-1 flex items-center justify-center text-zinc-500 italic"
                        >
                            No teachers found
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{:else if step === 2}
    <!-- OrderInterface - FULL SCREEN, NO NESTING -->
    <div class="h-full" in:fade>
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
    <!-- Success - Full Screen -->
    <div class="h-full bg-zinc-900 text-white flex items-center justify-center" in:scale={{ duration: 300, start: 0.9 }}>
        <div class="flex flex-col items-center gap-6">
            <div
                class="w-32 h-32 rounded-full bg-green-500 flex items-center justify-center animate-pulse"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="3"
                    stroke="currentColor"
                    class="w-16 h-16 text-white"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                    />
                </svg>
            </div>
            <h2 class="text-4xl font-bold">Pre-order Received!</h2>
            <p class="text-zinc-400 text-lg text-center max-w-md">
                Thanks, {selectedTeacher?.name}! Your order will be ready when you check in.
            </p>
            <p class="text-sm text-zinc-600 mt-8">Resetting in 5s...</p>
        </div>
    </div>
{/if}
