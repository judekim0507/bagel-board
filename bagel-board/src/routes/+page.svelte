<script lang="ts">
    import {
        seatAssignments,
        seats,
        orders,
        fetchSeatAssignments,
        initRealtime,
        type SeatAssignment,
    } from "$lib/stores/realtime";
    import { teachers, fetchTeachers } from "$lib/stores/teachers";
    import { onMount } from "svelte";
    import { fade, scale } from "svelte/transition";
    import { getDeviceId } from "$lib/utils/device";
    import Modal from "$lib/components/Modal.svelte";
    import OrderInterface from "$lib/components/OrderInterface.svelte";
    import ReadyOrderPanel from "$lib/components/ReadyOrderPanel.svelte";
    import { toast } from "svelte-sonner";
    import { supabase } from "$lib/supabase";
    import { isTableAssigned, getAssignedTables } from "$lib/utils/tableAssignment";

    // State
    let selectedTableId: number | null = null;
    let selectedSeatId: string | null = null;
    let showTeacherModal = false;
    let showOrderModal = false;
    let selectedTeacher: any = null;
    let searchQuery = "";
    let loading = true;
    let editingDietary = false;
    let dietaryNotes = "";
    let notifiedOrderIds = new Set<string>();
    let readyOrderPanels: Array<{ order: any; seat: any; teacher: any; isMinimized: boolean }> = [];
    let tableIds: number[] = [];

    onMount(async () => {
        await initRealtime();
        await fetchTeachers();
        loading = false;

        // Initialize with current ready orders to avoid showing old notifications
        const currentReady = $orders.filter(o => o.status === "ready");
        currentReady.forEach(o => notifiedOrderIds.add(o.id));
    });

    // Watch for ready orders and alert waiters
    $: {
        const currentReadyOrders = $orders.filter(o => o.status === "ready");

        // Check for NEW ready orders we haven't notified about yet
        for (const order of currentReadyOrders) {
            if (!notifiedOrderIds.has(order.id)) {
                notifiedOrderIds.add(order.id);

                const seat = $seats.find(s => s.id === order.seat_id);
                const teacher = $teachers.find(t => t.id === order.teacher_id);

                // Only show notification if this table is assigned to the waiter
                if (seat && isTableAssigned(seat.table_id)) {
                    // Create NEW audio instance each time to allow layering
                    const audio = new Audio("/sounds/ready.wav");
                    audio.play().catch(() => {});

                    // Add to panels array (not minimized initially)
                    readyOrderPanels = [...readyOrderPanels, { order, seat, teacher, isMinimized: false }];

                    console.log("🔔 Notification triggered for table", seat.table_id);
                }
            }
        }
    }

    // Computed - sort tables to show assigned ones first
    $: {
        const assignedTables = getAssignedTables();
        const allTables = Array.from({ length: 22 }, (_, i) => i + 1);

        if (assignedTables.length === 0) {
            tableIds = allTables;
        } else {
            // Sort: assigned tables first, then rest
            tableIds = [
                ...allTables.filter(id => assignedTables.includes(id)).sort((a, b) => a - b),
                ...allTables.filter(id => !assignedTables.includes(id)).sort((a, b) => a - b)
            ];
        }
    }

    // Helpers
    function getTableOccupancy(tableId: number) {
        // Get seats for this table
        const tableSeats = $seats.filter((s) => s.table_id === tableId);
        // Count active assignments for these seats
        const assignedCount = tableSeats.filter((s) =>
            $seatAssignments.some((a) => a.seat_id === s.id && a.active),
        ).length;

        return {
            total: tableSeats.length,
            occupied: assignedCount,
            isFull:
                assignedCount === tableSeats.length && tableSeats.length > 0,
            hasAnyone: assignedCount > 0,
        };
    }

    function getSeatStatus(seatId: string) {
        const assignment = $seatAssignments.find(
            (a) => a.seat_id === seatId && a.active,
        );
        return assignment ? assignment.teachers : null;
    }

    function hasReadyOrder(seatId: string) {
        return $orders.some(
            (o) => o.seat_id === seatId && o.status === "ready",
        );
    }

    function handleTableClick(id: number) {
        selectedTableId = id;
    }

    function handleSeatClick(seatId: string) {
        selectedSeatId = seatId;
        const assignment = $seatAssignments.find(
            (a) => a.seat_id === seatId && a.active,
        );

        if (assignment) {
            // Seat is occupied - open order modal
            selectedTeacher = $teachers.find(
                (t) => t.id === assignment.teacher_id,
            );
            showOrderModal = true;
        } else {
            // Seat is empty - open teacher assignment modal
            showTeacherModal = true;
        }
    }

    async function assignTeacher(teacherId: string) {
        if (!selectedSeatId) return;

        const deviceId = getDeviceId();
        const teacher = $teachers.find((t) => t.id === teacherId);
        if (!teacher) return;

        // Update dietary notes if changed
        if (dietaryNotes !== (teacher.dietary_notes || "")) {
            const { error } = await supabase
                .from("teachers")
                .update({ dietary_notes: dietaryNotes || null })
                .eq("id", teacherId);

            if (!error) {
                teacher.dietary_notes = dietaryNotes || null;
                await fetchTeachers(); // Refresh teachers list
            }
        }

        const res = await fetch("/api/seats/assign", {
            method: "POST",
            body: JSON.stringify({
                seat_id: selectedSeatId,
                teacher_id: teacherId,
                device_id: deviceId,
            }),
        });

        if (!res.ok) {
            toast.error("Failed to assign seat");
            return;
        }

        const data = await res.json();
        showTeacherModal = false;
        editingDietary = false;
        toast.success(`${teacher.name} checked in!`);

        // Update store immediately with full teacher data
        seatAssignments.update(assignments => {
            const filtered = assignments.filter(a => a.seat_id !== selectedSeatId);
            return [...filtered, { ...data, teachers: teacher }];
        });

        // Check for pre-orders
        const preOrderRes = await fetch(
            `/api/preorders?teacher_id=${teacherId}&fulfilled=false`,
        );

        if (preOrderRes.ok) {
            const preOrders = await preOrderRes.json();

            if (preOrders && preOrders.length > 0) {
                const preOrder = preOrders[0];
                // Auto-load pre-order
                toast.info(`Loading ${teacher?.name}'s pre-order...`, {
                    duration: 2000,
                });

                // Create order from pre-order
                const orderRes = await fetch("/api/orders", {
                    method: "POST",
                    body: JSON.stringify({
                        teacher_id: teacherId,
                        seat_id: selectedSeatId,
                        device_id: deviceId,
                        items: preOrder.pre_order_items.map((item: any) => ({
                            menu_item_id: item.menu_item_id,
                            toppings: item.toppings || [],
                            notes: item.notes || "",
                        })),
                        from_preorder: true,
                    }),
                });

                if (orderRes.ok) {
                    // Mark pre-order as fulfilled
                    await fetch(`/api/preorders/${preOrder.id}/fulfill`, {
                        method: "POST",
                    });
                    toast.success("Pre-order loaded and sent to kitchen!");
                    return;
                }
            }
        }

        // No pre-order or failed to load - open order modal
        selectedTeacher = teacher;
        showOrderModal = true;
    }

    $: filteredTeachers = $teachers.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
</script>

{#if loading}
    <div class="flex-1 flex items-center justify-center">
        <div class="text-center">
            <div
                class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"
            ></div>
            <p class="text-zinc-600">Loading tables...</p>
        </div>
    </div>
{:else}
    <div
        class="flex-1 flex flex-col px-4 md:px-6 pt-4 md:pt-4 overflow-hidden relative"
    >
        <!-- Header -->
        <header class="flex justify-between items-center mb-6 px-2 flex-none">
            <div>
                <h1 class="text-zinc-800 text-2xl font-bold">
                    {selectedTableId
                        ? `Table ${selectedTableId}`
                        : "Waiter Mode"}
                </h1>
                <p class="text-zinc-500 text-sm">
                    Thursday, Dec 12 • Breakfast
                </p>
            </div>

            {#if selectedTableId}
                <button
                    class="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 rounded-full text-zinc-800 text-sm font-bold transition-colors"
                    on:click={() => (selectedTableId = null)}
                >
                    Back to All Tables
                </button>
            {:else}
                <div class="flex gap-2">
                    <div
                        class="px-4 py-2 bg-white rounded-full text-zinc-600 text-sm font-medium shadow-sm"
                    >
                        Occupied: {$seatAssignments.filter((a) => a.active)
                            .length} /
                        {$seats.length || 176}
                    </div>
                </div>
            {/if}
        </header>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto custom-scrollbar relative">
            {#if !selectedTableId}
                <!-- All Tables Grid -->
                <div
                    class="grid grid-cols-4 md:grid-cols-5 gap-4 px-2 pb-24"
                    in:fade={{ duration: 200 }}
                >
                    {#each tableIds as id}
                        {@const status = getTableOccupancy(id)}
                        {@const isAssigned = getAssignedTables().includes(id)}
                        <button
                            class="aspect-square rounded-3xl flex flex-col items-center justify-center relative transition-all active:scale-95 group bg-white hover:bg-zinc-50 shadow-sm text-zinc-800 border-2 border-transparent"
                            class:!border-orange-500={status.hasAnyone}
                            class:ring-2={isAssigned}
                            class:ring-blue-500={isAssigned}
                            class:ring-offset-2={isAssigned}
                            class:ring-offset-zinc-200={isAssigned}
                            on:click={() => handleTableClick(id)}
                        >
                            <span class="text-3xl font-bold mb-1">{id}</span>
                            <span class="text-xs font-medium opacity-60">
                                {status.total > 0
                                    ? `${status.occupied}/${status.total}`
                                    : "..."}
                            </span>

                            {#if isAssigned}
                                <div class="absolute top-2 left-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-blue-500">
                                        <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />
                                    </svg>
                                </div>
                            {/if}

                            {#if status.hasAnyone}
                                <div
                                    class="absolute top-3 right-3 w-2 h-2 rounded-full bg-orange-500"
                                ></div>
                            {/if}
                        </button>
                    {/each}
                </div>
            {:else}
                <!-- Single Table View (Zoomed) -->
                <div
                    class="flex items-center justify-center h-full pb-20"
                    in:scale={{ start: 0.9, duration: 200 }}
                >
                    <div
                        class="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-zinc-300 rounded-full flex items-center justify-center shadow-inner"
                        style="--seat-radius: 210px;"
                    >
                        <span class="text-4xl font-bold text-zinc-500"
                            >Table {selectedTableId}</span
                        >

                        <!-- Seats around the table -->
                        {#each $seats
                            .filter((s) => s.table_id === selectedTableId)
                            .sort((a, b) => a.position - b.position) as seat, i (seat.id)}
                            {@const teacher = getSeatStatus(seat.id)}
                            {@const ready = hasReadyOrder(seat.id)}
                            {@const angle = (i * 360) / 8 - 90}

                            <button
                                class="absolute w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 border-4 z-10"
                                class:bg-white={!teacher}
                                class:bg-orange-500={teacher && !ready}
                                class:bg-green-500={teacher && ready}
                                class:text-zinc-900={!teacher}
                                class:text-white={teacher}
                                class:border-white={!teacher}
                                class:border-orange-600={teacher && !ready}
                                class:border-green-600={teacher && ready}
                                class:animate-pulse={ready}
                                style="transform: rotate({angle}deg) translate(var(--seat-radius, 210px)) rotate({-angle}deg);"
                                on:click={() => handleSeatClick(seat.id)}
                            >
                                {#if ready}
                                    <div class="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg animate-pulse">
                                        ✓
                                    </div>
                                {/if}
                                {#if teacher}
                                    <div class="text-center leading-tight text-xs font-bold px-1">
                                        {teacher.name.split(" ")[0]}<br/>
                                        {teacher.name.split(" ")[1]?.[0] || ""}
                                    </div>
                                {:else}
                                    <span class="text-xl font-bold opacity-30">{seat.position}</span>
                                {/if}
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>
{/if}

<!-- Teacher Selection Modal -->
{#if showTeacherModal}
    <Modal title={editingDietary ? "Dietary Requirements" : "Assign Seat"} on:close={() => { showTeacherModal = false; editingDietary = false; }}>
        <div class="flex flex-col gap-4 min-w-[300px]">
            {#if !editingDietary}
                <input
                    type="text"
                    placeholder="Search teachers..."
                    bind:value={searchQuery}
                    class="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-zinc-500"
                    autoFocus
                />

                <div class="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                    {#each filteredTeachers as teacher}
                        {@const alreadyCheckedIn = $seatAssignments.some(a => a.teacher_id === teacher.id && a.active)}
                        <button
                            class="flex items-center gap-3 p-3 rounded-xl transition-colors text-left {alreadyCheckedIn ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-800'}"
                            disabled={alreadyCheckedIn}
                            on:click={() => {
                                if (alreadyCheckedIn) return;
                                selectedTeacher = teacher;
                                dietaryNotes = teacher.dietary_notes || "";
                                editingDietary = true;
                            }}
                        >
                            <div
                                class="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 font-bold"
                            >
                                {teacher.name[0]}
                            </div>
                            <div class="flex-1">
                                <p class="font-bold text-white">{teacher.name}</p>
                                {#if alreadyCheckedIn}
                                    <p class="text-xs text-green-400">✓ Already checked in</p>
                                {:else if teacher.dietary_notes}
                                    <p class="text-xs text-orange-400">
                                        {teacher.dietary_notes}
                                    </p>
                                {/if}
                            </div>
                        </button>
                    {/each}

                    {#if filteredTeachers.length === 0}
                        <div class="p-4 text-center text-zinc-500">
                            No teachers found.
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="flex flex-col gap-4">
                    <div>
                        <p class="text-white font-bold mb-1">Teacher: {selectedTeacher.name}</p>
                        <p class="text-zinc-400 text-sm">Add or update dietary requirements</p>
                    </div>

                    <div class="flex flex-wrap gap-2">
                        {#each ["Vegan", "Vegetarian", "Gluten-free", "Dairy-free", "Nut allergy", "Shellfish allergy", "Kosher", "Halal", "Low sodium", "Diabetic"] as option}
                            <button
                                class="px-3 py-1.5 bg-zinc-800 hover:bg-orange-500 text-zinc-300 hover:text-white text-xs rounded-full transition-colors border border-zinc-700 hover:border-orange-500"
                                on:click={() => {
                                    if (dietaryNotes.trim()) {
                                        dietaryNotes = dietaryNotes.trim() + ", " + option;
                                    } else {
                                        dietaryNotes = option;
                                    }
                                }}
                            >
                                {option}
                            </button>
                        {/each}
                    </div>

                    <textarea
                        bind:value={dietaryNotes}
                        placeholder="Click tags above or type custom notes..."
                        class="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:border-zinc-500 min-h-[100px] resize-none"
                        autoFocus
                    />
                    <div class="flex gap-2">
                        <button
                            class="flex-1 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-white font-bold transition-colors"
                            on:click={() => { editingDietary = false; selectedTeacher = null; }}
                        >
                            Back
                        </button>
                        <button
                            class="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl text-white font-bold transition-colors"
                            on:click={() => assignTeacher(selectedTeacher.id)}
                        >
                            Check In
                        </button>
                    </div>
                </div>
            {/if}
        </div>
    </Modal>
{/if}

<!-- Order Interface Modal -->
{#if showOrderModal && selectedSeatId && selectedTeacher}
    <div class="fixed inset-0 z-50 bg-zinc-900">
        <OrderInterface
            teacher={selectedTeacher}
            seatId={selectedSeatId}
            deviceId={getDeviceId()}
            on:close={async () => {
                showOrderModal = false;
                await fetchSeatAssignments();
            }}
            on:complete={() => {
                showOrderModal = false;
                selectedSeatId = null;
                selectedTableId = null;
            }}
        />
    </div>
{/if}

<!-- Ready Order Notification Panels -->
{#each readyOrderPanels as panel, index (panel.order.id)}
    <ReadyOrderPanel
        order={panel.order}
        seat={panel.seat}
        teacher={panel.teacher}
        isMinimized={panel.isMinimized}
        stackIndex={readyOrderPanels.filter(p => p.isMinimized).findIndex(p => p.order.id === panel.order.id)}
        on:minimize={() => {
            readyOrderPanels[index].isMinimized = true;
            readyOrderPanels = readyOrderPanels;
        }}
        on:restore={() => {
            readyOrderPanels[index].isMinimized = false;
            readyOrderPanels = readyOrderPanels;
        }}
        on:complete={async () => {
            // Mark order as served
            const res = await fetch("/api/orders/status", {
                method: "POST",
                body: JSON.stringify({
                    order_id: panel.order.id,
                    status: "served"
                }),
            });

            if (res.ok) {
                toast.success("Order completed!");
                // Remove this panel from the array
                readyOrderPanels = readyOrderPanels.filter((_, i) => i !== index);
            } else {
                toast.error("Failed to update order");
            }
        }}
    />
{/each}
