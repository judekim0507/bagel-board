<script lang="ts">
    import { supabase } from "$lib/supabase";
    import { logout } from "$lib/stores/auth";
    import { toast } from "svelte-sonner";
    import { onMount, onDestroy } from "svelte";
    import {
        getAssignedTables,
        setAssignedTables,
    } from "$lib/utils/tableAssignment";

    // shadcn-svelte components
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Tabs from "$lib/components/ui/tabs/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";

    // Icons
    import Settings from "lucide-svelte/icons/settings";
    import RotateCcw from "lucide-svelte/icons/rotate-ccw";
    import ExternalLink from "lucide-svelte/icons/external-link";
    import Lock from "lucide-svelte/icons/lock";
    import RefreshCw from "lucide-svelte/icons/refresh-cw";
    import ClipboardList from "lucide-svelte/icons/clipboard-list";
    import LayoutGrid from "lucide-svelte/icons/layout-grid";
    import AlertTriangle from "lucide-svelte/icons/alert-triangle";
    import Info from "lucide-svelte/icons/info";
    import CheckCircle from "lucide-svelte/icons/check-circle";
    import Bell from "lucide-svelte/icons/bell";
    import Database from "lucide-svelte/icons/database";
    import Wifi from "lucide-svelte/icons/wifi";
    import Circle from "lucide-svelte/icons/circle";

    let assignedTables: number[] = [];
    let dbConnected = false;
    let realtimeConnected = false;
    let stats = {
        todayOrders: 0,
        activeSeats: 0,
        totalTeachers: 0,
        totalMenuItems: 0,
    };

    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    onMount(async () => {
        await loadStats();
        assignedTables = getAssignedTables();
        checkRealtimeStatus();
    });

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

            // If we got here without errors, DB is connected
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
            "This will:\n• Check out all teachers\n• Mark all orders as served\n• Reset the session for a new meal\n\nAre you sure?",
        );

        if (!confirmed) return;

        await supabase
            .from("seat_assignments")
            .update({ active: false })
            .eq("active", true);

        await supabase
            .from("orders")
            .update({ status: "served" })
            .neq("status", "served");

        toast.success("Session reset successfully!");
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
</script>

<div class="flex-1 flex flex-col overflow-hidden">
    <!-- Header -->
    <header class="px-6 py-4 border-b flex-none">
        <div class="flex items-center gap-3">
            <Settings class="w-6 h-6 text-muted-foreground" />
            <div>
                <h1 class="text-2xl font-semibold text-foreground">Settings</h1>
                <p class="text-sm text-muted-foreground">
                    Manage system settings and data
                </p>
            </div>
        </div>
    </header>

    <ScrollArea class="flex-1">
        <div class="p-6">
            <Tabs.Root value="overview" class="w-full">
                <Tabs.List
                    class="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6"
                >
                    <Tabs.Trigger
                        value="overview"
                        class="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                    >
                        Overview
                    </Tabs.Trigger>
                    <Tabs.Trigger
                        value="session"
                        class="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                    >
                        Session
                    </Tabs.Trigger>
                    <Tabs.Trigger
                        value="preorder"
                        class="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                    >
                        Pre-order
                    </Tabs.Trigger>
                    <Tabs.Trigger
                        value="tables"
                        class="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                    >
                        My Tables
                    </Tabs.Trigger>
                </Tabs.List>

                <!-- Overview Tab -->
                <Tabs.Content value="overview" class="mt-0">
                    <div class="space-y-6">
                        <!-- Stats Grid -->
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

                        <!-- System Info -->
                        <Card.Root>
                            <Card.Header>
                                <Card.Title class="flex items-center gap-2"
                                    ><Circle
                                        class="w-2 h-2 {dbConnected
                                            ? 'fill-green-500 text-green-500'
                                            : 'fill-red-500 text-red-500'}"
                                    /> System Information</Card.Title
                                >
                                <Card.Description>
                                    Bagel Board v1.0 • SvelteKit & Supabase
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

                        <!-- Quick Actions -->
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
                </Tabs.Content>

                <!-- Session Tab -->
                <Tabs.Content value="session" class="mt-0">
                    <div class="max-w-2xl space-y-6">
                        <!-- Danger Zone -->
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

                        <!-- Guidelines -->
                        <Card.Root>
                            <Card.Header>
                                <Card.Title>Session Guidelines</Card.Title>
                            </Card.Header>
                            <Card.Content>
                                <ul class="space-y-2 text-sm">
                                    <li class="flex items-center gap-2">
                                        <CheckCircle
                                            class="w-4 h-4 text-green-500"
                                        />
                                        <span class="text-muted-foreground"
                                            >Reset the session at the end of
                                            each meal service</span
                                        >
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <CheckCircle
                                            class="w-4 h-4 text-green-500"
                                        />
                                        <span class="text-muted-foreground"
                                            >Ensure all orders are completed
                                            before resetting</span
                                        >
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <CheckCircle
                                            class="w-4 h-4 text-green-500"
                                        />
                                        <span class="text-muted-foreground"
                                            >Pre-orders are preserved for the
                                            next check-in</span
                                        >
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <AlertTriangle
                                            class="w-4 h-4 text-orange-500"
                                        />
                                        <span class="text-muted-foreground"
                                            >All active seat assignments will be
                                            deactivated</span
                                        >
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <AlertTriangle
                                            class="w-4 h-4 text-orange-500"
                                        />
                                        <span class="text-muted-foreground"
                                            >All pending/ready orders will be
                                            marked as served</span
                                        >
                                    </li>
                                </ul>
                            </Card.Content>
                        </Card.Root>

                        <!-- Current Session Stats -->
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
                                            class="text-2xl font-bold text-green-500"
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
                                            class="text-2xl font-bold text-orange-500"
                                        >
                                            {stats.todayOrders}
                                        </p>
                                    </div>
                                </div>
                            </Card.Content>
                        </Card.Root>
                    </div>
                </Tabs.Content>

                <!-- Pre-order Tab -->
                <Tabs.Content value="preorder" class="mt-0">
                    <div class="max-w-2xl space-y-6">
                        <!-- Public Access -->
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

                        <!-- How It Works -->
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

                        <!-- Pro Tips -->
                        <Card.Root class="border-blue-500/30 bg-blue-500/5">
                            <Card.Header>
                                <Card.Title
                                    class="flex items-center gap-2 text-blue-400"
                                >
                                    <Info class="w-5 h-5" />
                                    Pro Tips
                                </Card.Title>
                            </Card.Header>
                            <Card.Content>
                                <ul
                                    class="space-y-2 text-sm text-muted-foreground"
                                >
                                    <li class="flex items-center gap-2">
                                        <span>📱</span>
                                        <span
                                            >Pre-order page works great on
                                            mobile devices</span
                                        >
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <span>🔄</span>
                                        <span
                                            >Pre-orders are automatically
                                            fulfilled when loaded</span
                                        >
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <span>⏰</span>
                                        <span
                                            >Encourage teachers to pre-order the
                                            night before</span
                                        >
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <span>✨</span>
                                        <span
                                            >Pre-orders include all
                                            customizations and dietary notes</span
                                        >
                                    </li>
                                </ul>
                            </Card.Content>
                        </Card.Root>
                    </div>
                </Tabs.Content>

                <!-- Tables Tab -->
                <Tabs.Content value="tables" class="mt-0">
                    <div class="max-w-4xl space-y-6">
                        <!-- Table Selection -->
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

                        <!-- Info Box -->
                        <Card.Root class="border-blue-500/30 bg-blue-500/5">
                            <Card.Header>
                                <Card.Title
                                    class="flex items-center gap-2 text-blue-400"
                                >
                                    <Bell class="w-5 h-5" />
                                    How It Works
                                </Card.Title>
                            </Card.Header>
                            <Card.Content>
                                <ul
                                    class="space-y-2 text-sm text-muted-foreground"
                                >
                                    <li class="flex items-center gap-2">
                                        <span>🔔</span>
                                        <span
                                            >You'll only get "Order Ready"
                                            notifications for your assigned
                                            tables</span
                                        >
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <span>👀</span>
                                        <span
                                            >You can still see all tables in
                                            Waiter Mode</span
                                        >
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <span>⚡</span>
                                        <span
                                            >If no tables are selected, you'll
                                            receive all notifications</span
                                        >
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <span>💾</span>
                                        <span
                                            >Your table assignments are saved
                                            locally on this device</span
                                        >
                                    </li>
                                </ul>
                            </Card.Content>
                        </Card.Root>
                    </div>
                </Tabs.Content>
            </Tabs.Root>

            <!-- Credit -->
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
