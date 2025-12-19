<script lang="ts">
    import { run } from "svelte/legacy";

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
    import { audioManager } from "$lib/utils/audio";

    import { Button } from "$lib/components/ui/button/index.js";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import CameraModal from "$lib/components/CameraModal.svelte";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
    import Star from "lucide-svelte/icons/star";
    import ArrowLeft from "lucide-svelte/icons/arrow-left";
    import Check from "lucide-svelte/icons/check";
    import X from "lucide-svelte/icons/x";
    import LogOut from "lucide-svelte/icons/log-out";
    import Users from "lucide-svelte/icons/users";
    import Search from "lucide-svelte/icons/search";
    import ShoppingBag from "lucide-svelte/icons/shopping-bag";
    import ArrowRightLeft from "lucide-svelte/icons/arrow-right-left";
    import UserPlus from "lucide-svelte/icons/user-plus";
    import CameraIcon from "lucide-svelte/icons/camera";

    let selectedTableId: number | null = $state(null);
    let selectedSeatId: string | null = $state(null);
    let showTeacherModal = $state(false);
    let showOrderModal = $state(false);
    let selectedTeacher: any = $state(null);
    let searchQuery = $state("");
    let loading = $state(true);
    let editingDietary = $state(false);
    let dietaryNotes = $state("");
    let notifiedOrderIds = new Set<string>();
    let readyOrderPanels: Array<{
        order: any;
        seat: any;
        teacher: any;
        isMinimized: boolean;
    }> = $state([]);
    let tableIds: number[] = $state([]);
    let seatTeacherMap = $state(new Map());
    let preorderTeacherIds = $state(new Set<string>());
    let showMoveModal = $state(false);
    let moveTargetTableId: number | null = $state(null);
    let movingTeacher: any = $state(null);
    let movingFromSeatId: string | null = $state(null);
    let confirmDialog: ConfirmDialog = $state();
    let pendingPreorder: any = $state(null);
    let pendingPreorderCart: any[] = $state([]);
    let showCameraModal = $state(false);

    async function fetchPreorders() {
        const res = await fetch("/api/preorders?fulfilled=false");
        if (res.ok) {
            const data = await res.json();
            preorderTeacherIds = new Set(data.map((p: any) => p.teacher_id));
        }
    }

    onMount(async () => {
        await initRealtime();
        await fetchTeachers();
        await fetchPreorders();
        loading = false;

        const currentReady = $orders.filter((o) => o.status === "ready");
        currentReady.forEach((o) => notifiedOrderIds.add(o.id));
    });

    run(() => {
        const currentReadyOrders = $orders.filter((o) => o.status === "ready");
        const readyOrderIds = new Set(currentReadyOrders.map((o) => o.id));

        for (const panel of readyOrderPanels) {
            if (!readyOrderIds.has(panel.order.id)) {
                notifiedOrderIds.delete(panel.order.id);
            }
        }
        readyOrderPanels = readyOrderPanels.filter((panel) =>
            readyOrderIds.has(panel.order.id),
        );

        for (const order of currentReadyOrders) {
            if (!notifiedOrderIds.has(order.id)) {
                notifiedOrderIds.add(order.id);

                const seat = $seats.find((s) => s.id === order.seat_id);
                const teacher = $teachers.find(
                    (t) => t.id === order.teacher_id,
                );

                if (
                    seat &&
                    seat.table_id !== null &&
                    isTableAssigned(seat.table_id)
                ) {
                    audioManager.play("ready");

                    readyOrderPanels = [
                        ...readyOrderPanels,
                        { order, seat, teacher, isMinimized: false },
                    ];
                }
            }
        }
    });

    let totalTables = $derived(
        $seats.length > 0
            ? Math.max(...$seats.map((s) => s.table_id ?? 0))
            : 22,
    );

    run(() => {
        const assignedTables = getAssignedTables();
        const allTables = Array.from({ length: totalTables }, (_, i) => i + 1);

        if (assignedTables.length === 0) {
            tableIds = allTables;
        } else {
            tableIds = [
                ...allTables
                    .filter((id) => assignedTables.includes(id))
                    .sort((a, b) => a - b),
                ...allTables
                    .filter((id) => !assignedTables.includes(id))
                    .sort((a, b) => a - b),
            ];
        }
    });

    run(() => {
        seatTeacherMap = new Map(
            $seatAssignments
                .filter((a) => a.active)
                .map((a) => [a.seat_id, a.teachers]),
        );
    });

    function getTableOccupancy(tableId: number) {
        const tableSeats = $seats.filter((s) => s.table_id === tableId);
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
        return seatTeacherMap.get(seatId) || null;
    }

    function hasReadyOrder(seatId: string) {
        return $orders.some(
            (o) => o.seat_id === seatId && o.status === "ready",
        );
    }

    function getOrderProgress(seatId: string) {
        const seatOrders = $orders.filter((o) => o.seat_id === seatId);
        const total = seatOrders.length;
        const ready = seatOrders.filter(
            (o) => o.status === "ready" || o.status === "served",
        ).length;
        return { ready, total };
    }

    function handleTableClick(id: number) {
        const assignedTables = getAssignedTables();
        if (assignedTables.length > 0 && !assignedTables.includes(id)) {
            toast.error(`Table ${id} is not assigned to you`, {
                description: "Go to Settings to assign yourself to this table.",
            });
            return;
        }
        selectedTableId = id;
    }

    function handleSeatClick(seatId: string) {
        selectedSeatId = seatId;
        const assignment = $seatAssignments.find(
            (a) => a.seat_id === seatId && a.active,
        );

        if (assignment) {
            selectedTeacher = $teachers.find(
                (t) => t.id === assignment.teacher_id,
            );
            showOrderModal = true;
        } else {
            showTeacherModal = true;
        }
    }

    async function quickAddTeacher(name: string) {
        if (!name.trim()) return;

        const { data, error } = await supabase
            .from("teachers")
            .insert({ name: name.trim() })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                toast.error("Teacher already exists");
            } else {
                toast.error("Failed to add teacher");
            }
            return null;
        }

        await fetchTeachers();
        toast.success(`Added ${data.name}`);
        return data;
    }

    async function handleCheckout() {
        if (!selectedSeatId || !selectedTeacher) return;

        const confirmed = await confirmDialog.confirm({
            title: "Check Out",
            description: `Check out ${selectedTeacher.name}? This will remove them from this seat.`,
            confirmText: "Check Out",
        });

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
                pendingPreorder = preOrder;
                pendingPreorderCart = preOrder.pre_order_items.map(
                    (item: any) => ({
                        menu_item_id: item.menu_item_id,
                        name: item.menu_items?.name || "Unknown",
                        toppings: item.toppings || [],
                        notes: item.notes || "",
                    }),
                );
                toast.info(`Pre-order loaded - review and submit`, {
                    duration: 3000,
                });
            }
        }

        selectedTeacher = teacher;
        showOrderModal = true;
    }

    let filteredTeachers = $derived(
        $teachers.filter((t) =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    );

    let occupiedCount = $derived(
        $seatAssignments.filter((a) => a.active).length,
    );

    function openMoveModal(teacher: any, fromSeatId: string) {
        movingTeacher = teacher;
        movingFromSeatId = fromSeatId;
        moveTargetTableId = null;
        showMoveModal = true;
        showOrderModal = false;
    }

    function getAvailableSeatsForTable(tableId: number) {
        const tableSeats = $seats.filter((s) => s.table_id === tableId);
        return tableSeats.filter((seat) => {
            const isOccupied = $seatAssignments.some(
                (a) => a.seat_id === seat.id && a.active,
            );
            return !isOccupied;
        });
    }

    async function moveTeacherToSeat(newSeatId: string) {
        if (!movingTeacher || !movingFromSeatId) return;

        await supabase
            .from("seat_assignments")
            .update({ active: false })
            .eq("seat_id", movingFromSeatId)
            .eq("active", true);

        const res = await fetch("/api/seats/assign", {
            method: "POST",
            body: JSON.stringify({
                seat_id: newSeatId,
                teacher_id: movingTeacher.id,
                device_id: getDeviceId(),
            }),
        });

        if (res.ok) {
            await supabase
                .from("orders")
                .update({ seat_id: newSeatId })
                .eq("seat_id", movingFromSeatId)
                .eq("teacher_id", movingTeacher.id)
                .neq("status", "served");

            toast.success(`${movingTeacher.name} moved successfully!`);
            await fetchSeatAssignments();
        } else {
            toast.error("Failed to move teacher");
        }

        showMoveModal = false;
        movingTeacher = null;
        movingFromSeatId = null;
        moveTargetTableId = null;
    }
</script>

{#if loading}
    <div class="flex-1 flex items-center justify-center">
        <div class="text-center">
            <div
                class="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-3"
            ></div>
            <p class="text-muted-foreground text-sm">Loading tables...</p>
        </div>
    </div>
{:else}
    <div class="flex-1 flex flex-col px-6 pt-6 overflow-hidden">
        <!-- Header -->
        <header class="flex justify-between items-center mb-6 flex-none">
            <div>
                <h1
                    class="text-foreground text-3xl font-instrument-serif font-medium"
                >
                    {selectedTableId ? `Table ${selectedTableId}` : "Tables"}
                </h1>
                <!-- <p class="text-muted-foreground text-sm">
                    {#if selectedTableId}
                        Select a seat to check in or take order
                    {:else}
                        {occupiedCount} of {$seats.length || 176} seats occupied
                    {/if}
                </p> -->
            </div>

            {#if selectedTableId}
                <Button
                    variant="outline"
                    onclick={() => (selectedTableId = null)}
                    class="text-muted-foreground"
                >
                    <ArrowLeft class="w-4 h-4" />
                    All Tables
                </Button>
            {:else}
                <div
                    class="flex items-center gap-2 bg-card border rounded-lg px-3 py-2"
                >
                    <Users class="w-4 h-4 text-muted-foreground" />
                    <span class="text-foreground text-sm font-medium"
                        >{occupiedCount}</span
                    >
                    <span class="text-muted-foreground text-sm"
                        >/ {$seats.length || 176}</span
                    >
                </div>
            {/if}
        </header>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto no-scrollbar">
            {#if !selectedTableId}
                <!-- All Tables Grid -->
                <div
                    class="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3"
                    in:fade={{ duration: 150 }}
                >
                    {#each tableIds as id}
                        {@const status = getTableOccupancy(id)}
                        {@const assignedTables = getAssignedTables()}
                        {@const isAssigned =
                            assignedTables.length === 0 ||
                            assignedTables.includes(id)}
                        <button
                            class="group relative aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1
                                   {isAssigned
                                ? 'bg-card hover:bg-accent active:scale-[0.98]'
                                : 'bg-muted/30 opacity-50 cursor-not-allowed'}
                                   {status.hasAnyone && isAssigned
                                ? 'border-primary bg-primary/5'
                                : 'border-border'}"
                            onclick={() => handleTableClick(id)}
                        >
                            {#if assignedTables.includes(id)}
                                <Star
                                    class="absolute top-2 left-2 w-4 h-4 text-primary fill-primary"
                                />
                            {/if}

                            <span class="text-2xl font-bold text-foreground"
                                >{id}</span
                            >
                            <span class="text-xs text-muted-foreground">
                                {status.total > 0
                                    ? `${status.occupied}/${status.total}`
                                    : "..."}
                            </span>

                            {#if status.hasAnyone}
                                <div
                                    class="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"
                                ></div>
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
                                {@const progress = getOrderProgress(seat.id)}
                                {@const angle = (i * 360) / 8 - 90}

                                <button
                                    class="absolute w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 z-10 select-none
                                           {teacher
                                        ? 'bg-card text-card-foreground shadow-md active:scale-95 border-2'
                                        : 'bg-muted/10 border-2 border-dashed border-border text-muted-foreground/40 hover:bg-muted/20 hover:border-muted-foreground/50 hover:text-muted-foreground'}"
                                    class:border-border={teacher && !ready}
                                    class:border-green-500={teacher && ready}
                                    class:shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)]={teacher &&
                                        ready}
                                    style="transform: rotate({angle}deg) translate(var(--seat-radius, 210px)) rotate({-angle}deg);"
                                    onclick={() => handleSeatClick(seat.id)}
                                >
                                    {#if ready}
                                        <div
                                            class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center shadow-sm ring-2 ring-background z-20"
                                            in:scale={{
                                                duration: 200,
                                                start: 0.5,
                                            }}
                                        >
                                            <Check class="w-3 h-3" />
                                        </div>
                                    {/if}

                                    {#if teacher}
                                        <div
                                            class="text-center leading-none flex flex-col items-center justify-center gap-1 w-full px-1"
                                        >
                                            <span
                                                class="text-xs font-bold truncate max-w-full block"
                                            >
                                                {teacher.name.split(" ")[0][0]}. {teacher.name
                                                    .split(" ")
                                                    .slice(1)
                                                    .join(" ")}
                                            </span>

                                            {#if progress.total > 0}
                                                <span
                                                    class="text-[10px] font-medium bg-muted/50 px-1.5 py-0.5 rounded-full border border-border/50"
                                                >
                                                    {progress.ready}/{progress.total}
                                                </span>
                                            {/if}
                                        </div>
                                    {:else}
                                        <span class="text-lg font-medium"
                                            >{seat.position}</span
                                        >
                                    {/if}
                                </button>
                            {/each}
                        {/key}
                    </div>
                </div>
            {/if}
        </div>
        <div class="h-8"></div>
    </div>
{/if}

<!-- Teacher Selection Modal -->
<Dialog.Root
    bind:open={showTeacherModal}
    onOpenChange={(open) => {
        if (!open) {
            editingDietary = false;
            searchQuery = "";
        }
    }}
>
    <Dialog.Content
        class="sm:max-w-md dark bg-card border-border overflow-visible"
    >
        <Dialog.Header>
            <Dialog.Title class="text-foreground">
                {editingDietary ? "Dietary Requirements" : "Check In"}
            </Dialog.Title>
            <Dialog.Description class="text-muted-foreground">
                {editingDietary
                    ? `Add any dietary notes for ${selectedTeacher?.name}`
                    : "Select a teacher to check in"}
            </Dialog.Description>
        </Dialog.Header>

        {#if !editingDietary}
            <div class="space-y-4">
                <div class="relative">
                    <Search
                        class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                    />
                    <Input
                        type="text"
                        placeholder="Search..."
                        bind:value={searchQuery}
                        class="pl-9 bg-background border-border text-foreground"
                        autofocus
                    />
                </div>

                <div style="max-height: 300px; overflow-y: scroll;">
                    <div class="space-y-1">
                        {#each filteredTeachers as teacher}
                            {@const alreadyCheckedIn = $seatAssignments.some(
                                (a) => a.teacher_id === teacher.id && a.active,
                            )}
                            {@const hasPreorder = preorderTeacherIds.has(
                                teacher.id,
                            )}
                            <button
                                class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left
                                       {alreadyCheckedIn
                                    ? 'opacity-40 cursor-not-allowed'
                                    : 'hover:bg-muted'}"
                                disabled={alreadyCheckedIn}
                                onclick={() => {
                                    if (alreadyCheckedIn) return;
                                    selectedTeacher = teacher;
                                    dietaryNotes = teacher.dietary_notes || "";
                                    editingDietary = true;
                                }}
                            >
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2">
                                        <p
                                            class="font-medium text-foreground text-sm truncate"
                                        >
                                            {teacher.name}
                                        </p>
                                        {#if hasPreorder}
                                            <Badge
                                                class="text-xs bg-green-500/20 text-green-400 border-green-500/30"
                                            >
                                                <ShoppingBag
                                                    class="w-3 h-3 mr-1"
                                                />
                                                Pre-order
                                            </Badge>
                                        {/if}
                                    </div>
                                    {#if alreadyCheckedIn}
                                        <p
                                            class="text-xs text-muted-foreground"
                                        >
                                            Already checked in
                                        </p>
                                    {:else if teacher.dietary_notes}
                                        <p
                                            class="text-xs text-orange-400 truncate"
                                        >
                                            {teacher.dietary_notes}
                                        </p>
                                    {/if}
                                </div>
                            </button>
                        {/each}

                        {#if filteredTeachers.length === 0 && searchQuery.trim()}
                            <div class="py-6 text-center">
                                <p class="text-muted-foreground text-sm mb-3">
                                    No teachers found for "{searchQuery}"
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onclick={async () => {
                                        const newTeacher =
                                            await quickAddTeacher(searchQuery);
                                        if (newTeacher) {
                                            selectedTeacher = newTeacher;
                                            dietaryNotes = "";
                                            editingDietary = true;
                                            searchQuery = "";
                                        }
                                    }}
                                >
                                    <UserPlus class="w-4 h-4 mr-2" />
                                    Add "{searchQuery.trim()}"
                                </Button>
                            </div>
                        {:else if filteredTeachers.length === 0}
                            <div
                                class="py-8 text-center text-muted-foreground text-sm"
                            >
                                No teachers found
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        {:else}
            <div class="space-y-4">
                <div
                    class="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                >
                    <div>
                        <p class="font-medium text-foreground">
                            {selectedTeacher?.name}
                        </p>
                        <p class="text-xs text-muted-foreground">
                            Ready to check in
                        </p>
                    </div>
                    {#if preorderTeacherIds.has(selectedTeacher?.id)}
                        <Badge
                            class="text-xs bg-green-500/20 text-green-400 border-green-500/30"
                        >
                            <ShoppingBag class="w-3 h-3 mr-1" />
                            Pre-order
                        </Badge>
                    {/if}
                </div>

                <div>
                    <p class="text-xs font-medium text-muted-foreground mb-2">
                        Quick add
                    </p>
                    <div class="flex flex-wrap gap-1.5">
                        {#each ["Vegan", "Vegetarian", "Gluten-free", "Dairy-free", "Nut allergy", "Halal", "Kosher", "Lactose Intolerance"] as option}
                            <Button
                                variant="outline"
                                size="sm"
                                class="h-7 text-xs text-muted-foreground"
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
                </div>

                <Textarea
                    bind:value={dietaryNotes}
                    placeholder="Other dietary requirements or notes..."
                    rows={2}
                    class="bg-background border-border text-foreground"
                />

                <div class="flex gap-3 pt-2">
                    <Button
                        variant="outline"
                        class="flex-1 text-muted-foreground"
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

{#if showOrderModal && selectedSeatId && selectedTeacher}
    <div class="fixed inset-0 z-50 bg-background">
        <OrderInterface
            teacher={selectedTeacher}
            seatId={selectedSeatId}
            deviceId={getDeviceId()}
            initialCart={pendingPreorderCart}
            on:close={async () => {
                showOrderModal = false;
                pendingPreorder = null;
                pendingPreorderCart = [];
                await fetchSeatAssignments();
            }}
            on:complete={async () => {
                if (pendingPreorder) {
                    await fetch(
                        `/api/preorders/${pendingPreorder.id}/fulfill`,
                        { method: "POST" },
                    );
                    await fetchPreorders();
                }
                showOrderModal = false;
                selectedSeatId = null;
                selectedTableId = null;
                pendingPreorder = null;
                pendingPreorderCart = [];
            }}
            on:checkout={handleCheckout}
            on:move={() => openMoveModal(selectedTeacher, selectedSeatId)}
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
                readyOrderPanels = readyOrderPanels.filter(
                    (_, i) => i !== index,
                );
            } else {
                toast.error("Failed to update order");
            }
        }}
    />
{/each}

<!-- Move Teacher Modal -->
<Dialog.Root
    bind:open={showMoveModal}
    onOpenChange={(open) => {
        if (!open) {
            moveTargetTableId = null;
            movingTeacher = null;
            movingFromSeatId = null;
        }
    }}
>
    <Dialog.Content class="sm:max-w-md dark bg-card border-border">
        <Dialog.Header>
            <Dialog.Title class="text-foreground">
                {moveTargetTableId
                    ? `Select Seat at Table ${moveTargetTableId}`
                    : "Move to Table"}
            </Dialog.Title>
            <Dialog.Description class="text-muted-foreground">
                {#if moveTargetTableId}
                    Choose a seat for {movingTeacher?.name}
                {:else}
                    Select a table to move {movingTeacher?.name} to
                {/if}
            </Dialog.Description>
        </Dialog.Header>

        {#if !moveTargetTableId}
            <!-- Table Selection -->
            <div class="grid grid-cols-4 gap-2 py-4">
                {#each Array.from({ length: totalTables }, (_, i) => i + 1) as tableId}
                    {@const availableSeats = getAvailableSeatsForTable(tableId)}
                    {@const currentTableId = $seats.find(
                        (s) => s.id === movingFromSeatId,
                    )?.table_id}
                    {@const isCurrentTable = tableId === currentTableId}
                    <button
                        class="aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all
                               {availableSeats.length > 0 && !isCurrentTable
                            ? 'bg-card hover:bg-accent hover:border-primary cursor-pointer'
                            : 'bg-muted/30 opacity-40 cursor-not-allowed'}
                               {isCurrentTable
                            ? 'border-primary/50'
                            : 'border-border'}"
                        disabled={availableSeats.length === 0 || isCurrentTable}
                        onclick={() => {
                            if (availableSeats.length > 0 && !isCurrentTable) {
                                moveTargetTableId = tableId;
                            }
                        }}
                    >
                        <span class="text-lg font-bold text-foreground"
                            >{tableId}</span
                        >
                        <span class="text-[10px] text-muted-foreground">
                            {#if isCurrentTable}
                                Current
                            {:else}
                                {availableSeats.length} free
                            {/if}
                        </span>
                    </button>
                {/each}
            </div>
        {:else}
            <!-- Seat Selection -->
            <div class="py-4">
                <Button
                    variant="ghost"
                    size="sm"
                    class="mb-4 text-muted-foreground"
                    onclick={() => (moveTargetTableId = null)}
                >
                    <ArrowLeft class="w-4 h-4 mr-2" />
                    Back to tables
                </Button>

                <div
                    class="relative w-[200px] h-[200px] mx-auto bg-stone-800 rounded-full flex items-center justify-center"
                >
                    <span class="text-2xl font-bold text-stone-500"
                        >{moveTargetTableId}</span
                    >

                    {#each $seats
                        .filter((s) => s.table_id === moveTargetTableId)
                        .sort((a, b) => a.position - b.position) as seat, i}
                        {@const isOccupied = $seatAssignments.some(
                            (a) => a.seat_id === seat.id && a.active,
                        )}
                        {@const angle = (i * 360) / 8 - 90}

                        <button
                            class="absolute w-10 h-10 rounded-full flex items-center justify-center transition-all
                                   {isOccupied
                                ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                                : 'bg-primary text-primary-foreground hover:scale-110 cursor-pointer shadow-lg'}"
                            style="transform: rotate({angle}deg) translate(100px) rotate({-angle}deg);"
                            disabled={isOccupied}
                            onclick={() => {
                                if (!isOccupied) {
                                    moveTeacherToSeat(seat.id);
                                }
                            }}
                        >
                            {#if isOccupied}
                                <X class="w-4 h-4" />
                            {:else}
                                <span class="text-sm font-bold"
                                    >{seat.position}</span
                                >
                            {/if}
                        </button>
                    {/each}
                </div>

                <p class="text-center text-xs text-muted-foreground mt-4">
                    Tap an available seat to move {movingTeacher?.name}
                </p>
            </div>
        {/if}
    </Dialog.Content>
</Dialog.Root>

<!-- Camera FAB -->
<button
    onclick={() => (showCameraModal = true)}
    class="fixed bottom-20 right-6 z-[100] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center"
    aria-label="Take photo"
>
    <CameraIcon class="w-6 h-6" />
</button>

<!-- Camera Modal -->
<CameraModal
    bind:open={showCameraModal}
    onClose={() => (showCameraModal = false)}
/>

<!-- Confirm Dialog -->
<ConfirmDialog bind:this={confirmDialog} />
