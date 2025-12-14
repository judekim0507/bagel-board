<script lang="ts">
    import {
        seatAssignments,
        seats,
        orders,
        fetchSeatAssignments,
        initRealtime,
    } from "$lib/stores/realtime";
    import { teachers, fetchTeachers } from "$lib/stores/teachers";
    import { onMount } from "svelte";
    import { fade, scale } from "svelte/transition";
    import { getDeviceId } from "$lib/utils/device";
    import OrderInterface from "$lib/components/OrderInterface.svelte";
    import ReadyOrderPanel from "$lib/components/ReadyOrderPanel.svelte";
    import { toast } from "svelte-sonner";
    import { supabase } from "$lib/supabase";
    import {
        isTableAssigned,
        getAssignedTables,
    } from "$lib/utils/tableAssignment";

    // shadcn-svelte components
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as Avatar from "$lib/components/ui/avatar/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";

    // Icons
    import Star from "lucide-svelte/icons/star";
    import ArrowLeft from "lucide-svelte/icons/arrow-left";
    import Check from "lucide-svelte/icons/check";
    import X from "lucide-svelte/icons/x";
    import LogOut from "lucide-svelte/icons/log-out";
    import Users from "lucide-svelte/icons/users";

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
    let readyOrderPanels: Array<{
        order: any;
        seat: any;
        teacher: any;
        isMinimized: boolean;
    }> = [];
    let tableIds: number[] = [];
    let seatTeacherMap = new Map();

    onMount(async () => {
        await initRealtime();
        await fetchTeachers();
        loading = false;

        const currentReady = $orders.filter((o) => o.status === "ready");
        currentReady.forEach((o) => notifiedOrderIds.add(o.id));
    });

    // Watch for ready orders and alert waiters
    $: {
        const currentReadyOrders = $orders.filter((o) => o.status === "ready");

        for (const order of currentReadyOrders) {
            if (!notifiedOrderIds.has(order.id)) {
                notifiedOrderIds.add(order.id);

                const seat = $seats.find((s) => s.id === order.seat_id);
                const teacher = $teachers.find(
                    (t) => t.id === order.teacher_id,
                );

                if (seat && isTableAssigned(seat.table_id)) {
                    const audio = new Audio("/sounds/ready.wav");
                    audio.play().catch(() => {});

                    readyOrderPanels = [
                        ...readyOrderPanels,
                        { order, seat, teacher, isMinimized: false },
                    ];
                }
            }
        }
    }

    // Sort tables - assigned first
    $: {
        const assignedTables = getAssignedTables();
        const allTables = Array.from({ length: 22 }, (_, i) => i + 1);

        if (assignedTables.length === 0) {
            tableIds = allTables;
        } else {
            tableIds = [
                ...allTables.filter((id) => assignedTables.includes(id)).sort((a, b) => a - b),
                ...allTables.filter((id) => !assignedTables.includes(id)).sort((a, b) => a - b),
            ];
        }
    }

    // Reactive seat teacher map
    $: {
        seatTeacherMap = new Map(
            $seatAssignments
                .filter((a) => a.active)
                .map((a) => [a.seat_id, a.teachers])
        );
    }

    // Helpers
    function getTableOccupancy(tableId: number) {
        const tableSeats = $seats.filter((s) => s.table_id === tableId);
        const assignedCount = tableSeats.filter((s) =>
            $seatAssignments.some((a) => a.seat_id === s.id && a.active),
        ).length;

        return {
            total: tableSeats.length,
            occupied: assignedCount,
            isFull: assignedCount === tableSeats.length && tableSeats.length > 0,
            hasAnyone: assignedCount > 0,
        };
    }

    function getSeatStatus(seatId: string) {
        return seatTeacherMap.get(seatId) || null;
    }

    function hasReadyOrder(seatId: string) {
        return $orders.some((o) => o.seat_id === seatId && o.status === "ready");
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
            selectedTeacher = $teachers.find((t) => t.id === assignment.teacher_id);
            showOrderModal = true;
        } else {
            showTeacherModal = true;
        }
    }

    async function handleCheckout() {
        if (!selectedSeatId || !selectedTeacher) return;

        const confirmed = confirm(
            `Check out ${selectedTeacher.name}? This will remove them from this seat.`,
        );

        if (!confirmed) return;

        const res = await fetch("/api/seats/assign", {
            method: "POST",
            body: JSON.stringify({
                seat_id: selectedSeatId,
                teacher_id: selectedTeacher.id,
                device_id: getDeviceId(),
                active: false,
            }),
        });

        if (res.ok) {
            toast.success(`${selectedTeacher.name} checked out!`);
            await fetchSeatAssignments();
            showOrderModal = false;
            selectedTeacher = null;
            selectedSeatId = null;
        } else {
            toast.error("Failed to check out");
        }
    }

    async function assignTeacher(teacherId: string) {
        if (!selectedSeatId) return;

        const deviceId = getDeviceId();
        const teacher = $teachers.find((t) => t.id === teacherId);
        if (!teacher) return;

        if (dietaryNotes !== (teacher.dietary_notes || "")) {
            const { error } = await supabase
                .from("teachers")
                .update({ dietary_notes: dietaryNotes || null })
                .eq("id", teacherId);

            if (!error) {
                teacher.dietary_notes = dietaryNotes || null;
                await fetchTeachers();
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

        showTeacherModal = false;
        editingDietary = false;
        toast.success(`${teacher.name} checked in!`);

        await fetchSeatAssignments();

        const preOrderRes = await fetch(
            `/api/preorders?teacher_id=${teacherId}&fulfilled=false`,
        );

        if (preOrderRes.ok) {
            const preOrders = await preOrderRes.json();

            if (preOrders && preOrders.length > 0) {
                const preOrder = preOrders[0];
                toast.info(`Loading ${teacher?.name}'s pre-order...`, { duration: 2000 });

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
                    await fetch(`/api/preorders/${preOrder.id}/fulfill`, { method: "POST" });
                    toast.success("Pre-order loaded and sent to kitchen!");
                    showTeacherModal = false;
                    selectedTeacher = null;
                    editingDietary = false;
                    return;
                }
            }
        }

        selectedTeacher = teacher;
        showOrderModal = true;
    }

    $: filteredTeachers = $teachers.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    $: occupiedCount = $seatAssignments.filter((a) => a.active).length;
</script>

{#if loading}
    <div class="flex-1 flex items-center justify-center">
        <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-3"></div>
            <p class="text-muted-foreground text-sm">Loading tables...</p>
        </div>
    </div>
{:else}
    <div class="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
        <!-- Header -->
        <header class="flex justify-between items-center mb-6 flex-none">
            <div>
                <h1 class="text-foreground text-2xl font-semibold tracking-tight">
                    {selectedTableId ? `Table ${selectedTableId}` : "Tables"}
                </h1>
                <p class="text-muted-foreground text-sm">
                    {#if selectedTableId}
                        Select a seat to check in or take order
                    {:else}
                        {occupiedCount} of {$seats.length || 176} seats occupied
                    {/if}
                </p>
            </div>

            {#if selectedTableId}
                <Button variant="outline" onclick={() => (selectedTableId = null)}>
                    <ArrowLeft class="w-4 h-4" />
                    All Tables
                </Button>
            {:else}
                <div class="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
                    <Users class="w-4 h-4 text-muted-foreground" />
                    <span class="text-sm font-medium">{occupiedCount}</span>
                    <span class="text-muted-foreground text-sm">/ {$seats.length || 176}</span>
                </div>
            {/if}
        </header>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto">
            {#if !selectedTableId}
                <!-- All Tables Grid -->
                <div
                    class="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3"
                    in:fade={{ duration: 150 }}
                >
                    {#each tableIds as id}
                        {@const status = getTableOccupancy(id)}
                        {@const isAssigned = getAssignedTables().includes(id)}
                        <button
                            class="group relative aspect-square rounded-xl border-2 bg-card hover:bg-accent transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-1
                                   {status.hasAnyone ? 'border-primary bg-primary/5' : 'border-border'}"
                            on:click={() => handleTableClick(id)}
                        >
                            {#if isAssigned}
                                <Star class="absolute top-2 left-2 w-4 h-4 text-primary fill-primary" />
                            {/if}

                            <span class="text-2xl font-bold text-foreground">{id}</span>
                            <span class="text-xs text-muted-foreground">
                                {status.total > 0 ? `${status.occupied}/${status.total}` : "..."}
                            </span>

                            {#if status.hasAnyone}
                                <div class="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"></div>
                            {/if}
                        </button>
                    {/each}
                </div>
            {:else}
                <!-- Single Table View -->
                <div
                    class="flex items-center justify-center h-full"
                    in:scale={{ start: 0.95, duration: 150 }}
                >
                    <div
                        class="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-stone-800 rounded-full flex items-center justify-center shadow-inner"
                        style="--seat-radius: 210px;"
                    >
                        <span class="text-4xl font-bold text-stone-500">
                            Table {selectedTableId}
                        </span>

                        {#key seatTeacherMap}
                            {#each $seats
                                .filter((s) => s.table_id === selectedTableId)
                                .sort((a, b) => a.position - b.position) as seat, i (seat.id)}
                                {@const teacher = getSeatStatus(seat.id)}
                                {@const ready = hasReadyOrder(seat.id)}
                                {@const angle = (i * 360) / 8 - 90}

                                <button
                                    class="absolute w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 border-4 z-10"
                                    class:bg-stone-700={!teacher}
                                    class:bg-orange-500={teacher && !ready}
                                    class:bg-green-500={teacher && ready}
                                    class:text-stone-400={!teacher}
                                    class:text-white={teacher}
                                    class:border-stone-600={!teacher}
                                    class:border-orange-600={teacher && !ready}
                                    class:border-green-600={teacher && ready}
                                    class:animate-pulse={teacher && ready}
                                    style="transform: rotate({angle}deg) translate(var(--seat-radius, 210px)) rotate({-angle}deg);"
                                    on:click={() => handleSeatClick(seat.id)}
                                >
                                    {#if ready}
                                        <div class="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center shadow border-2 border-white">
                                            <Check class="w-3 h-3 text-white" />
                                        </div>
                                    {/if}
                                    {#if teacher}
                                        <div class="text-center leading-tight">
                                            <span class="text-xs font-bold">
                                                {teacher.name.split(" ")[0]?.[0]}{teacher.name.split(" ")[1]?.[0] || ""}
                                            </span>
                                        </div>
                                    {:else}
                                        <span class="text-xl font-bold opacity-30">{seat.position}</span>
                                    {/if}
                                </button>
                            {/each}
                        {/key}
                    </div>
                </div>
            {/if}
        </div>
    </div>
{/if}

<!-- Teacher Selection Modal -->
<Dialog.Root bind:open={showTeacherModal} onOpenChange={(open) => {
    if (!open) {
        editingDietary = false;
        searchQuery = "";
    }
}}>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>
                {editingDietary ? "Dietary Requirements" : "Check In Teacher"}
            </Dialog.Title>
            <Dialog.Description>
                {editingDietary
                    ? `Update dietary notes for ${selectedTeacher?.name}`
                    : "Search and select a teacher to assign to this seat"}
            </Dialog.Description>
        </Dialog.Header>

        {#if !editingDietary}
            <div class="space-y-4">
                <Input
                    type="text"
                    placeholder="Search teachers..."
                    bind:value={searchQuery}
                    autofocus
                />

                <ScrollArea class="h-[300px] -mx-6 px-6">
                    <div class="space-y-1">
                        {#each filteredTeachers as teacher}
                            {@const alreadyCheckedIn = $seatAssignments.some(
                                (a) => a.teacher_id === teacher.id && a.active,
                            )}
                            <button
                                class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left
                                       {alreadyCheckedIn ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent'}"
                                disabled={alreadyCheckedIn}
                                on:click={() => {
                                    if (alreadyCheckedIn) return;
                                    selectedTeacher = teacher;
                                    dietaryNotes = teacher.dietary_notes || "";
                                    editingDietary = true;
                                }}
                            >
                                <Avatar.Root class="h-10 w-10">
                                    <Avatar.Fallback class="bg-primary/10 text-primary font-semibold">
                                        {teacher.name[0]}
                                    </Avatar.Fallback>
                                </Avatar.Root>
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium text-foreground truncate">
                                        {teacher.name}
                                    </p>
                                    {#if alreadyCheckedIn}
                                        <Badge variant="secondary" class="text-xs">
                                            <Check class="w-3 h-3 mr-1" />
                                            Checked in
                                        </Badge>
                                    {:else if teacher.dietary_notes}
                                        <p class="text-xs text-muted-foreground truncate">
                                            {teacher.dietary_notes}
                                        </p>
                                    {/if}
                                </div>
                            </button>
                        {/each}

                        {#if filteredTeachers.length === 0}
                            <div class="py-8 text-center text-muted-foreground">
                                No teachers found
                            </div>
                        {/if}
                    </div>
                </ScrollArea>
            </div>
        {:else}
            <div class="space-y-4">
                <div class="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Avatar.Root class="h-10 w-10">
                        <Avatar.Fallback class="bg-primary text-primary-foreground font-semibold">
                            {selectedTeacher?.name?.[0]}
                        </Avatar.Fallback>
                    </Avatar.Root>
                    <div>
                        <p class="font-medium">{selectedTeacher?.name}</p>
                        <p class="text-xs text-muted-foreground">Ready to check in</p>
                    </div>
                </div>

                <div class="flex flex-wrap gap-1.5">
                    {#each ["Vegan", "Vegetarian", "Gluten-free", "Dairy-free", "Nut allergy", "Halal", "Kosher"] as option}
                        <Button
                            variant="outline"
                            size="sm"
                            class="h-7 text-xs"
                            onclick={() => {
                                dietaryNotes = dietaryNotes.trim()
                                    ? `${dietaryNotes.trim()}, ${option}`
                                    : option;
                            }}
                        >
                            {option}
                        </Button>
                    {/each}
                </div>

                <Textarea
                    bind:value={dietaryNotes}
                    placeholder="Dietary requirements or notes..."
                    rows={3}
                />

                <div class="flex gap-2">
                    <Button
                        variant="outline"
                        class="flex-1"
                        onclick={() => {
                            editingDietary = false;
                            selectedTeacher = null;
                        }}
                    >
                        Back
                    </Button>
                    <Button
                        class="flex-1"
                        onclick={() => assignTeacher(selectedTeacher.id)}
                    >
                        <Check class="w-4 h-4 mr-2" />
                        Check In
                    </Button>
                </div>
            </div>
        {/if}
    </Dialog.Content>
</Dialog.Root>

<!-- Order Interface Modal -->
{#if showOrderModal && selectedSeatId && selectedTeacher}
    <div class="fixed inset-0 z-50 bg-background">
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
            on:checkout={handleCheckout}
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
        stackIndex={readyOrderPanels
            .filter((p) => p.isMinimized)
            .findIndex((p) => p.order.id === panel.order.id)}
        on:minimize={() => {
            readyOrderPanels[index].isMinimized = true;
            readyOrderPanels = readyOrderPanels;
        }}
        on:restore={() => {
            readyOrderPanels[index].isMinimized = false;
            readyOrderPanels = readyOrderPanels;
        }}
        on:complete={async () => {
            const res = await fetch("/api/orders/status", {
                method: "POST",
                body: JSON.stringify({
                    order_id: panel.order.id,
                    status: "served",
                }),
            });

            if (res.ok) {
                toast.success("Order completed!");
                readyOrderPanels = readyOrderPanels.filter((_, i) => i !== index);
            } else {
                toast.error("Failed to update order");
            }
        }}
    />
{/each}
