<script lang="ts">
    import { supabase } from "$lib/supabase";
    import { logout } from "$lib/stores/auth";
    import { toast } from "svelte-sonner";
    import { onMount, onDestroy } from "svelte";
    import {
        getAssignedTables,
        setAssignedTables,
    } from "$lib/utils/tableAssignment";
    import PinModal from "$lib/components/PinModal.svelte";

    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import { Switch } from "$lib/components/ui/switch/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import Settings from "lucide-svelte/icons/settings";
    import RotateCcw from "lucide-svelte/icons/rotate-ccw";
    import ExternalLink from "lucide-svelte/icons/external-link";
    import Lock from "lucide-svelte/icons/lock";
    import RefreshCw from "lucide-svelte/icons/refresh-cw";
    import ClipboardList from "lucide-svelte/icons/clipboard-list";
    import LayoutGrid from "lucide-svelte/icons/layout-grid";
    import AlertTriangle from "lucide-svelte/icons/alert-triangle";
    import Database from "lucide-svelte/icons/database";
    import Wifi from "lucide-svelte/icons/wifi";
    import Circle from "lucide-svelte/icons/circle";
    import Users from "lucide-svelte/icons/users";
    import UtensilsCrossed from "lucide-svelte/icons/utensils-crossed";
    import Plus from "lucide-svelte/icons/plus";
    import Trash2 from "lucide-svelte/icons/trash-2";
    import Pencil from "lucide-svelte/icons/pencil";
    import Save from "lucide-svelte/icons/save";
    import X from "lucide-svelte/icons/x";
    import Coffee from "lucide-svelte/icons/coffee";
    import Wrench from "lucide-svelte/icons/wrench";
    import ShieldCheck from "lucide-svelte/icons/shield-check";
    import Search from "lucide-svelte/icons/search";

    let assignedTables: number[] = [];

    // Admin access
    let adminUnlocked = false;
    let showPinModal = false;
    let pendingTab: string | null = null;
    let configSubTab = "teachers";
    let dbConnected = false;
    let realtimeConnected = false;
    let stats = {
        todayOrders: 0,
        activeSeats: 0,
        totalTeachers: 0,
        totalMenuItems: 0,
    };

    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    // Teachers management
    let teachers: any[] = [];
    let bulkTeacherInput = "";
    let editingTeacher: any = null;
    let editTeacherName = "";
    let editTeacherDietary = "";
    let teacherSearchQuery = "";

    $: filteredTeachers = teachers.filter((t) =>
        t.name.toLowerCase().includes(teacherSearchQuery.toLowerCase()),
    );

    // Menu management
    let menuItems: any[] = [];
    let showAddItemModal = false;
    let editingMenuItem: any = null;
    let newItemName = "";
    let newItemCategory = "meal";
    let newItemCustomizable = false;
    let newItemToppings = "";

    onMount(async () => {
        await loadStats();
        await loadTeachers();
        await loadMenuItems();
        assignedTables = getAssignedTables();
        checkRealtimeStatus();
    });

    async function loadTeachers() {
        const { data } = await supabase
            .from("teachers")
            .select("*")
            .order("name");
        if (data) teachers = data;
    }

    async function loadMenuItems() {
        const { data } = await supabase
            .from("menu_items")
            .select("*")
            .order("category")
            .order("name");
        if (data) menuItems = data;
    }

    async function addBulkTeachers() {
        const names = bulkTeacherInput
            .split("\n")
            .map((n) => n.trim())
            .filter((n) => n.length > 0);

        if (names.length === 0) {
            toast.error("Enter at least one teacher name");
            return;
        }

        const existingNames = new Set(
            teachers.map((t) => t.name.toLowerCase()),
        );
        const newNames = names.filter(
            (n) => !existingNames.has(n.toLowerCase()),
        );
        const duplicates = names.length - newNames.length;

        if (newNames.length === 0) {
            toast.error("All names already exist");
            return;
        }

        const { error } = await supabase
            .from("teachers")
            .insert(newNames.map((name) => ({ name })));

        if (error) {
            toast.error("Failed to add teachers");
        } else {
            toast.success(
                `Added ${newNames.length} teacher(s)${duplicates > 0 ? `, ${duplicates} skipped (duplicates)` : ""}`,
            );
            bulkTeacherInput = "";
            await loadTeachers();
            await loadStats();
        }
    }

    async function deleteTeacher(id: string) {
        const teacher = teachers.find((t) => t.id === id);
        if (!confirm(`Delete ${teacher?.name}?`)) return;

        const { error } = await supabase.from("teachers").delete().eq("id", id);
        if (error) {
            // Foreign key constraint - teacher has past orders
            if (error.code === "23503") {
                toast.error(
                    `Can't delete "${teacher?.name}" - they have past orders or assignments in the system.`,
                );
            } else {
                toast.error("Failed to delete teacher");
                console.error(error);
            }
        } else {
            toast.success("Teacher deleted");
            await loadTeachers();
            await loadStats();
        }
    }

    function startEditTeacher(teacher: any) {
        editingTeacher = teacher;
        editTeacherName = teacher.name;
        editTeacherDietary = teacher.dietary_notes || "";
    }

    async function saveTeacherEdit() {
        if (!editingTeacher || !editTeacherName.trim()) return;

        const { error } = await supabase
            .from("teachers")
            .update({
                name: editTeacherName.trim(),
                dietary_notes: editTeacherDietary.trim() || null,
            })
            .eq("id", editingTeacher.id);

        if (error) {
            toast.error("Failed to update teacher");
        } else {
            toast.success("Teacher updated");
            editingTeacher = null;
            await loadTeachers();
        }
    }

    function cancelTeacherEdit() {
        editingTeacher = null;
        editTeacherName = "";
        editTeacherDietary = "";
    }

    // Menu functions
    function openAddItemModal() {
        newItemName = "";
        newItemCategory = "meal";
        newItemCustomizable = false;
        newItemToppings = "";
        editingMenuItem = null;
        showAddItemModal = true;
    }

    function openEditItemModal(item: any) {
        editingMenuItem = item;
        newItemName = item.name;
        newItemCategory = item.category;
        newItemCustomizable = item.toppings_config?.customizable || false;
        newItemToppings = item.toppings_config?.options?.join(", ") || "";
        showAddItemModal = true;
    }

    async function saveMenuItem() {
        if (!newItemName.trim()) {
            toast.error("Enter item name");
            return;
        }

        const toppingsArray = newItemToppings
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0);

        const toppingsConfig =
            newItemCustomizable && toppingsArray.length > 0
                ? { customizable: true, options: toppingsArray }
                : null;

        if (editingMenuItem) {
            const { error } = await supabase
                .from("menu_items")
                .update({
                    name: newItemName.trim(),
                    category: newItemCategory,
                    toppings_config: toppingsConfig,
                })
                .eq("id", editingMenuItem.id);

            if (error) {
                toast.error("Failed to update item");
            } else {
                toast.success("Menu item updated");
                showAddItemModal = false;
                await loadMenuItems();
            }
        } else {
            const { error } = await supabase.from("menu_items").insert({
                name: newItemName.trim(),
                category: newItemCategory,
                toppings_config: toppingsConfig,
                available: true,
            });

            if (error) {
                toast.error("Failed to add item");
            } else {
                toast.success("Menu item added");
                showAddItemModal = false;
                await loadMenuItems();
                await loadStats();
            }
        }
    }

    async function toggleItemAvailability(item: any) {
        const { error } = await supabase
            .from("menu_items")
            .update({ available: !item.available })
            .eq("id", item.id);

        if (!error) {
            item.available = !item.available;
            menuItems = menuItems;
            toast.success(item.available ? "Item enabled" : "Item disabled");
        }
    }

    async function deleteMenuItem(id: string) {
        const item = menuItems.find((i) => i.id === id);
        if (!confirm(`Delete "${item?.name}"?`)) return;

        const { error } = await supabase
            .from("menu_items")
            .delete()
            .eq("id", id);

        if (error) {
            // Foreign key constraint - item is used in past orders
            if (error.code === "23503") {
                const disable = confirm(
                    `"${item?.name}" can't be deleted because it's used in past orders.\n\nWould you like to disable it instead? (It won't show up in the menu)`,
                );
                if (disable && item) {
                    await supabase
                        .from("menu_items")
                        .update({ available: false })
                        .eq("id", id);
                    toast.success("Item disabled");
                    await loadMenuItems();
                }
            } else {
                toast.error("Failed to delete item");
                console.error(error);
            }
        } else {
            toast.success("Item deleted");
            await loadMenuItems();
            await loadStats();
        }
    }

    onDestroy(() => {
        if (realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
        }
    });

    function checkRealtimeStatus() {
        realtimeChannel = supabase.channel("settings-status-check");
        realtimeChannel
            .on("presence", { event: "sync" }, () => {
                realtimeConnected = true;
            })
            .subscribe((status) => {
                realtimeConnected = status === "SUBSCRIBED";
            });
    }

    async function loadStats() {
        const today = new Date().toISOString().split("T")[0];

        try {
            const [orders, seats, teachers, menu] = await Promise.all([
                supabase
                    .from("orders")
                    .select("*", { count: "exact", head: true })
                    .gte("created_at", today),
                supabase
                    .from("seat_assignments")
                    .select("*", { count: "exact", head: true })
                    .eq("active", true),
                supabase
                    .from("teachers")
                    .select("*", { count: "exact", head: true }),
                supabase
                    .from("menu_items")
                    .select("*", { count: "exact", head: true }),
            ]);

            dbConnected =
                !orders.error && !seats.error && !teachers.error && !menu.error;

            stats = {
                todayOrders: orders.count || 0,
                activeSeats: seats.count || 0,
                totalTeachers: teachers.count || 0,
                totalMenuItems: menu.count || 0,
            };
        } catch {
            dbConnected = false;
        }
    }

    async function resetSession() {
        const confirmed = confirm(
            "This will:\n• Check out all teachers\n• DELETE all order history\n• DELETE all pre-orders\n• Reset everything for a new session\n\nAre you sure?",
        );

        if (!confirmed) return;

        // Delete order_items first (child table)
        await supabase.from("order_items").delete().not("id", "is", null);

        // Delete all orders
        await supabase.from("orders").delete().not("id", "is", null);

        // Delete pre_order_items first (child table)
        await supabase.from("pre_order_items").delete().not("id", "is", null);

        // Delete all pre_orders
        await supabase.from("pre_orders").delete().not("id", "is", null);

        // Delete all seat assignments
        await supabase.from("seat_assignments").delete().not("id", "is", null);

        // Store session start time in system_config
        await supabase.from("system_config").upsert({
            key: "session_start_time",
            value: new Date().toISOString(),
        });

        toast.success("Session reset - all history cleared!");
        await loadStats();
    }

    function handleLogout() {
        if (confirm("Lock the app? You'll need the PIN to access it again.")) {
            logout();
        }
    }

    function toggleTable(tableId: number) {
        if (assignedTables.includes(tableId)) {
            assignedTables = assignedTables.filter((t) => t !== tableId);
        } else {
            assignedTables = [...assignedTables, tableId];
        }
        setAssignedTables(assignedTables);
        toast.success("Table assignment updated!");
    }

    function clearAllTables() {
        assignedTables = [];
        setAssignedTables([]);
        toast.success("All tables cleared - you'll receive all notifications");
    }

    function selectAllTables() {
        assignedTables = Array.from({ length: 22 }, (_, i) => i + 1);
        setAssignedTables(assignedTables);
        toast.success("All tables selected!");
    }

    // Protected tabs
    let activeTab = "overview";

    function handleTabChange(tab: string) {
        const protectedTabs = ["config", "session"];

        if (protectedTabs.includes(tab) && !adminUnlocked) {
            pendingTab = tab;
            showPinModal = true;
        } else {
            activeTab = tab;
        }
    }

    function handlePinSuccess() {
        adminUnlocked = true;
        if (pendingTab) {
            activeTab = pendingTab;
            pendingTab = null;
        }
        toast.success("Admin access granted");
    }
</script>

<div class="flex-1 flex flex-col overflow-hidden">
    <header class="px-6 py-6 border-b flex-none">
        <div>
            <h1
                class="text-3xl font-instrument-serif font-medium text-foreground flex items-center gap-2"
            >
                <Settings class="w-6 h-6" />
                Settings
            </h1>
            <p class="text-sm text-muted-foreground">
                Manage system •
                {#if dbConnected && realtimeConnected}
                    System Live
                {:else}
                    System Offline
                {/if}
            </p>
        </div>
    </header>

    <ScrollArea class="flex-1">
        <div class="p-6">
            <div class="w-full">
                <!-- Custom Tab List -->
                <div class="flex border-b mb-6 gap-1 overflow-x-auto">
                    <button
                        class="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                               {activeTab === 'overview'
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'}"
                        onclick={() => handleTabChange("overview")}
                    >
                        Overview
                    </button>
                    <button
                        class="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2
                               {activeTab === 'session'
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'}"
                        onclick={() => handleTabChange("session")}
                    >
                        {#if !adminUnlocked}
                            <Lock class="w-3.5 h-3.5" />
                        {/if}
                        Session
                    </button>
                    <button
                        class="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                               {activeTab === 'preorder'
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'}"
                        onclick={() => handleTabChange("preorder")}
                    >
                        Pre-order
                    </button>
                    <button
                        class="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                               {activeTab === 'tables'
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'}"
                        onclick={() => handleTabChange("tables")}
                    >
                        My Tables
                    </button>
                    <button
                        class="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2
                               {activeTab === 'config'
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'}"
                        onclick={() => handleTabChange("config")}
                    >
                        {#if !adminUnlocked}
                            <Lock class="w-3.5 h-3.5" />
                        {/if}
                        Config
                    </button>
                </div>

                {#if activeTab === "overview"}
                    <div class="space-y-6">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card.Root>
                                <Card.Content class="pt-6">
                                    <p
                                        class="text-sm text-muted-foreground mb-1"
                                    >
                                        Today's Orders
                                    </p>
                                    <p
                                        class="text-4xl font-bold text-foreground"
                                    >
                                        {stats.todayOrders}
                                    </p>
                                </Card.Content>
                            </Card.Root>
                            <Card.Root>
                                <Card.Content class="pt-6">
                                    <p
                                        class="text-sm text-muted-foreground mb-1"
                                    >
                                        Active Seats
                                    </p>
                                    <p
                                        class="text-4xl font-bold text-foreground"
                                    >
                                        {stats.activeSeats}
                                    </p>
                                </Card.Content>
                            </Card.Root>
                            <Card.Root>
                                <Card.Content class="pt-6">
                                    <p
                                        class="text-sm text-muted-foreground mb-1"
                                    >
                                        Total Teachers
                                    </p>
                                    <p
                                        class="text-4xl font-bold text-foreground"
                                    >
                                        {stats.totalTeachers}
                                    </p>
                                </Card.Content>
                            </Card.Root>
                            <Card.Root>
                                <Card.Content class="pt-6">
                                    <p
                                        class="text-sm text-muted-foreground mb-1"
                                    >
                                        Menu Items
                                    </p>
                                    <p
                                        class="text-4xl font-bold text-foreground"
                                    >
                                        {stats.totalMenuItems}
                                    </p>
                                </Card.Content>
                            </Card.Root>
                        </div>

                        <Card.Root>
                            <Card.Header>
                                <Card.Title class="flex items-center gap-2"
                                    ><Circle
                                        class="w-2 h-2 {dbConnected &&
                                        realtimeConnected
                                            ? 'fill-green-500 text-green-500'
                                            : 'fill-red-500 text-red-500'}"
                                    /> System Information</Card.Title
                                >
                                <Card.Description>
                                    Bagel Board v1.0 • Powered by SvelteKit &
                                    Supabase
                                </Card.Description>
                            </Card.Header>
                            <Card.Content>
                                <div class="grid grid-cols-2 gap-4 text-sm">
                                    <div class="flex items-center gap-2">
                                        <Database
                                            class="w-4 h-4 text-muted-foreground"
                                        />
                                        <span class="text-muted-foreground"
                                            >Database:</span
                                        >
                                        <Badge
                                            variant="outline"
                                            class="text-green-500 {dbConnected
                                                ? 'border-green-500/50'
                                                : 'border-red-500/50'}"
                                        >
                                            <span
                                                class="{dbConnected
                                                    ? 'text-green-500'
                                                    : 'text-red-500'} text-xs"
                                            >
                                                {dbConnected
                                                    ? "Connected"
                                                    : "Disconnected"}
                                            </span>
                                        </Badge>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <Wifi
                                            class="w-4 h-4 text-muted-foreground"
                                        />
                                        <span class="text-muted-foreground"
                                            >Real-time:</span
                                        >
                                        <Badge
                                            variant="outline"
                                            class="text-green-500 {realtimeConnected
                                                ? 'border-green-500/50'
                                                : 'border-red-500/50'}"
                                        >
                                            <span
                                                class="{realtimeConnected
                                                    ? 'text-green-500'
                                                    : 'text-red-500'} text-xs"
                                            >
                                                {realtimeConnected
                                                    ? "Active"
                                                    : "Connecting..."}
                                            </span>
                                        </Badge>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <LayoutGrid
                                            class="w-4 h-4 text-muted-foreground"
                                        />
                                        <span class="text-muted-foreground"
                                            >Tables:</span
                                        >
                                        <span
                                            class="text-foreground font-medium"
                                            >22</span
                                        >
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <ClipboardList
                                            class="w-4 h-4 text-muted-foreground"
                                        />
                                        <span class="text-muted-foreground"
                                            >Total Seats:</span
                                        >
                                        <span
                                            class="text-foreground font-medium"
                                            >176</span
                                        >
                                    </div>
                                </div>
                            </Card.Content>
                        </Card.Root>

                        <Card.Root>
                            <Card.Header>
                                <Card.Title>Quick Actions</Card.Title>
                            </Card.Header>
                            <Card.Content>
                                <div class="flex flex-wrap gap-3">
                                    <Button variant="default" href="/preorder">
                                        <ExternalLink class="w-4 h-4 mr-2" />
                                        Open Pre-order Mode
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onclick={() => loadStats()}
                                    >
                                        <RefreshCw class="w-4 h-4 mr-2" />
                                        Refresh Stats
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onclick={handleLogout}
                                    >
                                        <Lock class="w-4 h-4 mr-2" />
                                        Lock App
                                    </Button>
                                </div>
                            </Card.Content>
                        </Card.Root>
                    </div>
                {:else if activeTab === "session"}
                    <div class="max-w-2xl space-y-6">
                        <Card.Root class="border-destructive/50">
                            <Card.Header>
                                <Card.Title
                                    class="flex items-center gap-2 text-destructive"
                                >
                                    <RotateCcw class="w-5 h-5" />
                                    Reset Daily Session
                                </Card.Title>
                                <Card.Description>
                                    This will check out all teachers, mark all
                                    orders as served, and prepare the system for
                                    a new meal service.
                                </Card.Description>
                            </Card.Header>
                            <Card.Content>
                                <div
                                    class="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-4"
                                >
                                    <AlertTriangle
                                        class="w-4 h-4 text-destructive mt-0.5"
                                    />
                                    <p class="text-sm text-muted-foreground">
                                        <strong class="text-destructive"
                                            >Warning:</strong
                                        > This action cannot be undone. Use this
                                        at the end of each meal service.
                                    </p>
                                </div>
                                <Button
                                    variant="destructive"
                                    onclick={resetSession}
                                >
                                    <RotateCcw class="w-4 h-4 mr-2" />
                                    Reset Session
                                </Button>
                            </Card.Content>
                        </Card.Root>

                        <Card.Root>
                            <Card.Header>
                                <Card.Title>Current Session Stats</Card.Title>
                            </Card.Header>
                            <Card.Content>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="bg-muted/50 p-4 rounded-lg">
                                        <p
                                            class="text-sm text-muted-foreground mb-1"
                                        >
                                            Active Assignments
                                        </p>
                                        <p
                                            class="text-2xl font-bold text-foreground"
                                        >
                                            {stats.activeSeats}
                                        </p>
                                    </div>
                                    <div class="bg-muted/50 p-4 rounded-lg">
                                        <p
                                            class="text-sm text-muted-foreground mb-1"
                                        >
                                            Orders Today
                                        </p>
                                        <p
                                            class="text-2xl font-bold text-foreground"
                                        >
                                            {stats.todayOrders}
                                        </p>
                                    </div>
                                </div>
                            </Card.Content>
                        </Card.Root>
                    </div>
                {:else if activeTab === "preorder"}
                    <div class="max-w-2xl space-y-6">
                        <Card.Root>
                            <Card.Header>
                                <Card.Title>Public Pre-order Access</Card.Title>
                                <Card.Description>
                                    Share this link with teachers to place
                                    pre-orders before arriving
                                </Card.Description>
                            </Card.Header>
                            <Card.Content>
                                <div
                                    class="bg-muted/50 p-4 rounded-lg border mb-4"
                                >
                                    <code class="text-orange-500 text-sm"
                                        >{typeof window !== "undefined"
                                            ? window.location.origin
                                            : ""}/preorder</code
                                    >
                                </div>
                                <Button href="/preorder" target="_blank">
                                    <ExternalLink class="w-4 h-4 mr-2" />
                                    Open Pre-order Page
                                </Button>
                            </Card.Content>
                        </Card.Root>

                        <Card.Root>
                            <Card.Header>
                                <Card.Title>How Pre-orders Work</Card.Title>
                            </Card.Header>
                            <Card.Content>
                                <ol
                                    class="space-y-3 text-sm text-muted-foreground list-decimal list-inside"
                                >
                                    <li>
                                        Teachers visit the pre-order page and
                                        select their name
                                    </li>
                                    <li>
                                        They browse the menu and customize their
                                        breakfast order
                                    </li>
                                    <li>
                                        Pre-orders are saved and linked to their
                                        teacher account
                                    </li>
                                    <li>
                                        When they check in at a table, their
                                        pre-order is automatically loaded
                                    </li>
                                    <li>
                                        The order is sent directly to the
                                        kitchen
                                    </li>
                                    <li>
                                        If no pre-order exists, the waiter can
                                        take their order manually
                                    </li>
                                </ol>
                            </Card.Content>
                        </Card.Root>
                    </div>
                {:else if activeTab === "tables"}
                    <div class="max-w-4xl space-y-6">
                        <Card.Root>
                            <Card.Header>
                                <div class="flex items-center justify-between">
                                    <div>
                                        <Card.Title
                                            >My Table Assignments</Card.Title
                                        >
                                        <Card.Description>
                                            Select the tables you're responsible
                                            for.
                                            {#if assignedTables.length === 0}
                                                <Badge
                                                    variant="outline"
                                                    class="ml-2 text-orange-500 border-orange-500/50"
                                                    >Showing all tables</Badge
                                                >
                                            {:else}
                                                <Badge
                                                    variant="outline"
                                                    class="ml-2"
                                                    >{assignedTables.length} table(s)
                                                    assigned</Badge
                                                >
                                            {/if}
                                        </Card.Description>
                                    </div>
                                </div>
                            </Card.Header>
                            <Card.Content>
                                <div class="flex gap-2 mb-6">
                                    <Button
                                        variant="default"
                                        onclick={selectAllTables}
                                    >
                                        Select All
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onclick={clearAllTables}
                                    >
                                        Clear All
                                    </Button>
                                </div>

                                <div
                                    class="grid grid-cols-6 md:grid-cols-11 gap-3"
                                >
                                    {#each Array.from({ length: 22 }, (_, i) => i + 1) as tableId}
                                        <button
                                            class="aspect-square rounded-xl flex items-center justify-center text-xl font-bold transition-all active:scale-95 {assignedTables.includes(
                                                tableId,
                                            )
                                                ? 'bg-primary text-primary-foreground border-2 border-primary'
                                                : 'bg-muted text-muted-foreground border-2 border-border hover:border-muted-foreground/50'}"
                                            onclick={() => toggleTable(tableId)}
                                        >
                                            {tableId}
                                        </button>
                                    {/each}
                                </div>
                            </Card.Content>
                        </Card.Root>
                    </div>
                {:else if activeTab === "config"}
                    <div class="space-y-6">
                        <!-- Config Sub-tabs -->
                        <div class="flex gap-2">
                            <Button
                                variant={configSubTab === "teachers"
                                    ? "default"
                                    : "outline"}
                                onclick={() => (configSubTab = "teachers")}
                                class={configSubTab === "teachers"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"}
                            >
                                <Users class="w-4 h-4 mr-2" />
                                Teachers
                            </Button>
                            <Button
                                variant={configSubTab === "menu"
                                    ? "default"
                                    : "outline"}
                                onclick={() => (configSubTab = "menu")}
                                class={configSubTab === "menu"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"}
                            >
                                <UtensilsCrossed class="w-4 h-4 mr-2" />
                                Menu
                            </Button>
                        </div>

                        {#if configSubTab === "teachers"}
                            <div class="grid md:grid-cols-2 gap-6">
                                <!-- Bulk Add Teachers -->
                                <Card.Root>
                                    <Card.Header>
                                        <Card.Title
                                            class="flex items-center gap-2"
                                        >
                                            <Plus class="w-5 h-5" />
                                            Add Teachers
                                        </Card.Title>
                                        <Card.Description>
                                            One name per line. Duplicates are
                                            automatically skipped.
                                        </Card.Description>
                                    </Card.Header>
                                    <Card.Content>
                                        <Textarea
                                            bind:value={bulkTeacherInput}
                                            placeholder="John Smith
Jane Doe
Michael Johnson"
                                            rows={8}
                                            class="font-mono text-sm mb-4"
                                        />
                                        <Button
                                            onclick={addBulkTeachers}
                                            class="w-full"
                                        >
                                            <Plus class="w-4 h-4 mr-2" />
                                            Add Teachers
                                        </Button>
                                    </Card.Content>
                                </Card.Root>

                                <!-- Existing Teachers -->
                                <Card.Root>
                                    <Card.Header class="pb-3">
                                        <Card.Title
                                            class="flex items-center justify-between"
                                        >
                                            <span
                                                class="flex items-center gap-2"
                                            >
                                                <Users class="w-5 h-5" />
                                                Current Teachers
                                            </span>
                                            <Badge variant="secondary"
                                                >{teachers.length}</Badge
                                            >
                                        </Card.Title>
                                        <div class="relative mt-2">
                                            <Search
                                                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                                            />
                                            <Input
                                                type="text"
                                                placeholder="Search teachers..."
                                                bind:value={teacherSearchQuery}
                                                class="pl-9 h-9"
                                            />
                                        </div>
                                    </Card.Header>
                                    <Card.Content class="p-0">
                                        <div
                                            class="max-h-[350px] overflow-y-auto px-3"
                                        >
                                            {#each filteredTeachers as teacher (teacher.id)}
                                                {#if editingTeacher?.id === teacher.id}
                                                    <div
                                                        class="p-3 border-b bg-muted/50"
                                                    >
                                                        <Input
                                                            bind:value={
                                                                editTeacherName
                                                            }
                                                            placeholder="Name"
                                                            class="mb-2"
                                                        />
                                                        <Input
                                                            bind:value={
                                                                editTeacherDietary
                                                            }
                                                            placeholder="Dietary notes (optional)"
                                                            class="mb-2 text-sm"
                                                        />
                                                        <div class="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                onclick={saveTeacherEdit}
                                                            >
                                                                <Save
                                                                    class="w-3 h-3 mr-1"
                                                                />
                                                                Save
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onclick={cancelTeacherEdit}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                {:else}
                                                    <div
                                                        class="flex items-center justify-between p-3 border-b hover:bg-muted/30 group"
                                                    >
                                                        <div
                                                            class="min-w-0 flex-1"
                                                        >
                                                            <p
                                                                class="font-medium text-foreground truncate"
                                                            >
                                                                {teacher.name}
                                                            </p>
                                                            {#if teacher.dietary_notes}
                                                                <p
                                                                    class="text-xs text-orange-400 truncate"
                                                                >
                                                                    {teacher.dietary_notes}
                                                                </p>
                                                            {/if}
                                                        </div>
                                                        <div
                                                            class="flex gap-1 transition-opacity"
                                                        >
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                class="h-8 w-8"
                                                                onclick={() =>
                                                                    startEditTeacher(
                                                                        teacher,
                                                                    )}
                                                            >
                                                                <Pencil
                                                                    class="w-3.5 h-3.5"
                                                                />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                class="h-8 w-8 text-destructive hover:text-destructive"
                                                                onclick={() =>
                                                                    deleteTeacher(
                                                                        teacher.id,
                                                                    )}
                                                            >
                                                                <Trash2
                                                                    class="w-3.5 h-3.5"
                                                                />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                {/if}
                                            {/each}
                                            {#if filteredTeachers.length === 0}
                                                <div
                                                    class="p-8 text-center text-muted-foreground"
                                                >
                                                    {#if teachers.length === 0}
                                                        <Users
                                                            class="w-10 h-10 mx-auto mb-2 opacity-30"
                                                        />
                                                        <p class="text-sm">
                                                            No teachers yet
                                                        </p>
                                                    {:else}
                                                        <Search
                                                            class="w-10 h-10 mx-auto mb-2 opacity-30"
                                                        />
                                                        <p class="text-sm">
                                                            No results for "{teacherSearchQuery}"
                                                        </p>
                                                    {/if}
                                                </div>
                                            {/if}
                                        </div>
                                    </Card.Content>
                                </Card.Root>
                            </div>
                        {:else if configSubTab === "menu"}
                            <div class="space-y-6">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h3
                                            class="text-lg font-semibold text-foreground"
                                        >
                                            Menu Items
                                        </h3>
                                        <p
                                            class="text-sm text-muted-foreground"
                                        >
                                            {menuItems.length} items • {menuItems.filter(
                                                (i) => i.available,
                                            ).length} available
                                        </p>
                                    </div>
                                    <Button onclick={openAddItemModal}>
                                        <Plus class="w-4 h-4 mr-2" />
                                        Add Item
                                    </Button>
                                </div>

                                <div class="grid md:grid-cols-2 gap-4">
                                    <!-- Meals -->
                                    <Card.Root>
                                        <Card.Header class="pb-3">
                                            <Card.Title
                                                class="flex items-center gap-2 text-base"
                                            >
                                                <UtensilsCrossed
                                                    class="w-4 h-4"
                                                />
                                                Meals
                                            </Card.Title>
                                        </Card.Header>
                                        <Card.Content class="p-0">
                                            <div class="divide-y">
                                                {#each menuItems.filter((i) => i.category === "meal") as item (item.id)}
                                                    <div
                                                        class="flex items-center justify-between p-3 hover:bg-muted/30 group {!item.available
                                                            ? 'opacity-50'
                                                            : ''}"
                                                    >
                                                        <div
                                                            class="min-w-0 flex-1"
                                                        >
                                                            <p
                                                                class="font-medium text-foreground"
                                                            >
                                                                {item.name}
                                                            </p>
                                                            {#if item.toppings_config?.customizable}
                                                                <p
                                                                    class="text-xs text-muted-foreground"
                                                                >
                                                                    Options: {item.toppings_config.options?.join(
                                                                        ", ",
                                                                    )}
                                                                </p>
                                                            {/if}
                                                        </div>
                                                        <div
                                                            class="flex items-center gap-2"
                                                        >
                                                            <Switch
                                                                checked={item.available}
                                                                onCheckedChange={() =>
                                                                    toggleItemAvailability(
                                                                        item,
                                                                    )}
                                                            />
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                class="h-8 w-8 group"
                                                                onclick={() =>
                                                                    openEditItemModal(
                                                                        item,
                                                                    )}
                                                            >
                                                                <Pencil
                                                                    class="w-3.5 h-3.5"
                                                                />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                class="h-8 w-8 text-destructive"
                                                                onclick={() =>
                                                                    deleteMenuItem(
                                                                        item.id,
                                                                    )}
                                                            >
                                                                <Trash2
                                                                    class="w-3.5 h-3.5"
                                                                />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                {:else}
                                                    <div
                                                        class="p-6 text-center text-muted-foreground text-sm"
                                                    >
                                                        No meals added yet
                                                    </div>
                                                {/each}
                                            </div>
                                        </Card.Content>
                                    </Card.Root>

                                    <!-- Drinks -->
                                    <Card.Root>
                                        <Card.Header class="pb-3">
                                            <Card.Title
                                                class="flex items-center gap-2 text-base"
                                            >
                                                <Coffee class="w-4 h-4" />
                                                Drinks
                                            </Card.Title>
                                        </Card.Header>
                                        <Card.Content class="p-0">
                                            <div class="divide-y">
                                                {#each menuItems.filter((i) => i.category === "drink") as item (item.id)}
                                                    <div
                                                        class="flex items-center justify-between p-3 hover:bg-muted/30 group {!item.available
                                                            ? 'opacity-50'
                                                            : ''}"
                                                    >
                                                        <div
                                                            class="min-w-0 flex-1"
                                                        >
                                                            <p
                                                                class="font-medium text-foreground"
                                                            >
                                                                {item.name}
                                                            </p>
                                                            {#if item.toppings_config?.customizable}
                                                                <p
                                                                    class="text-xs text-muted-foreground"
                                                                >
                                                                    Options: {item.toppings_config.options?.join(
                                                                        ", ",
                                                                    )}
                                                                </p>
                                                            {/if}
                                                        </div>
                                                        <div
                                                            class="flex items-center gap-2"
                                                        >
                                                            <Switch
                                                                checked={item.available}
                                                                onCheckedChange={() =>
                                                                    toggleItemAvailability(
                                                                        item,
                                                                    )}
                                                            />
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                class="h-8 w-8 "
                                                                onclick={() =>
                                                                    openEditItemModal(
                                                                        item,
                                                                    )}
                                                            >
                                                                <Pencil
                                                                    class="w-3.5 h-3.5"
                                                                />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                class="h-8 w-8 text-destructive "
                                                                onclick={() =>
                                                                    deleteMenuItem(
                                                                        item.id,
                                                                    )}
                                                            >
                                                                <Trash2
                                                                    class="w-3.5 h-3.5"
                                                                />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                {:else}
                                                    <div
                                                        class="p-6 text-center text-muted-foreground text-sm"
                                                    >
                                                        No drinks added yet
                                                    </div>
                                                {/each}
                                            </div>
                                        </Card.Content>
                                    </Card.Root>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>

            <p class="text-center text-xs text-muted-foreground/50 pt-8 pb-4">
                Built by <a
                    href="https://judekim.ca"
                    target="_blank"
                    class="hover:text-foreground transition-colors">Jude Kim</a
                >
                • Gov 25/26 •
                <a
                    href="https://github.com/judekim0507/bagel-board"
                    target="_blank"
                    class="hover:text-foreground transition-colors">GitHub</a
                >
            </p>
        </div>
    </ScrollArea>
</div>

<!-- Add/Edit Menu Item Modal -->
<Dialog.Root bind:open={showAddItemModal}>
    <Dialog.Content class="sm:max-w-md dark bg-card border-border">
        <Dialog.Header>
            <Dialog.Title class="text-foreground">
                {editingMenuItem ? "Edit Menu Item" : "Add Menu Item"}
            </Dialog.Title>
            <Dialog.Description class="text-muted-foreground">
                {editingMenuItem
                    ? "Update the menu item details"
                    : "Add a new item to the menu"}
            </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4 py-4">
            <div>
                <Label class="text-foreground mb-2 block">Name</Label>
                <Input
                    bind:value={newItemName}
                    placeholder="e.g., Bagel with Cream Cheese"
                    class="text-foreground"
                />
            </div>

            <div>
                <Label class="text-foreground mb-2 block">Category</Label>
                <div class="flex gap-2">
                    <Button
                        variant={newItemCategory === "meal"
                            ? "default"
                            : "outline"}
                        onclick={() => (newItemCategory = "meal")}
                        class={newItemCategory === "meal"
                            ? "bg-primary text-primary-foreground flex-1"
                            : "bg-muted text-muted-foreground flex-1"}
                    >
                        <UtensilsCrossed class="w-4 h-4 mr-2" />
                        Meal
                    </Button>
                    <Button
                        variant={newItemCategory === "drink"
                            ? "default"
                            : "outline"}
                        onclick={() => (newItemCategory = "drink")}
                        class={newItemCategory === "drink"
                            ? "bg-primary text-primary-foreground flex-1"
                            : "bg-muted text-muted-foreground flex-1"}
                    >
                        <Coffee class="w-4 h-4 mr-2" />
                        Drink
                    </Button>
                </div>
            </div>

            <div
                class="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
            >
                <div>
                    <p class="font-medium text-foreground text-sm">
                        Customizable Options
                    </p>
                    <p class="text-xs text-muted-foreground">
                        Allow toppings/customizations
                    </p>
                </div>
                <Switch bind:checked={newItemCustomizable} />
            </div>

            {#if newItemCustomizable}
                <div>
                    <Label class="text-foreground mb-2 block"
                        >Options (comma separated)</Label
                    >
                    <Input
                        bind:value={newItemToppings}
                        placeholder="e.g., Butter, Cream Cheese, Jam"
                        class="text-foreground"
                    />
                    <p class="text-xs text-muted-foreground mt-1">
                        These options will be selectable when ordering
                    </p>
                </div>
            {/if}
        </div>

        <Dialog.Footer class="gap-2">
            <Button
                variant="outline"
                onclick={() => (showAddItemModal = false)}
                class="text-foreground"
            >
                Cancel
            </Button>
            <Button onclick={saveMenuItem}>
                {editingMenuItem ? "Update" : "Add Item"}
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<!-- Admin PIN Modal -->
<PinModal
    bind:open={showPinModal}
    title="Escalate your access"
    description="Enter the admin PIN to access this section"
    on:success={handlePinSuccess}
/>
