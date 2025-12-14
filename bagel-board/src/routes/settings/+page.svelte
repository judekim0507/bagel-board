<script lang="ts">
    import { supabase } from "$lib/supabase";
    import { logout } from "$lib/stores/auth";
    import { toast } from "svelte-sonner";
    import { fade } from "svelte/transition";
    import { onMount } from "svelte";
    import { getAssignedTables, setAssignedTables } from "$lib/utils/tableAssignment";

    let activeTab = "overview";
    let assignedTables: number[] = [];
    let stats = {
        todayOrders: 0,
        activeSeats: 0,
        totalTeachers: 0,
        totalMenuItems: 0,
    };

    onMount(async () => {
        await loadStats();
        assignedTables = getAssignedTables();
    });

    async function loadStats() {
        const today = new Date().toISOString().split("T")[0];

        const [orders, seats, teachers, menu] = await Promise.all([
            supabase
                .from("orders")
                .select("*", { count: "exact", head: true })
                .gte("created_at", today),
            supabase
                .from("seat_assignments")
                .select("*", { count: "exact", head: true })
                .eq("active", true),
            supabase.from("teachers").select("*", { count: "exact", head: true }),
            supabase
                .from("menu_items")
                .select("*", { count: "exact", head: true }),
        ]);

        stats = {
            todayOrders: orders.count || 0,
            activeSeats: seats.count || 0,
            totalTeachers: teachers.count || 0,
            totalMenuItems: menu.count || 0,
        };
    }

    async function resetSession() {
        const confirmed = confirm(
            "This will:\n• Check out all teachers\n• Mark all orders as served\n• Reset the session for a new meal\n\nAre you sure?",
        );

        if (!confirmed) return;

        // Deactivate all seat assignments
        await supabase
            .from("seat_assignments")
            .update({ active: false })
            .eq("active", true);

        // Mark all orders as served
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
            assignedTables = assignedTables.filter(t => t !== tableId);
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

<div class="flex-1 p-6 overflow-auto bg-zinc-900 text-white">
    <header class="mb-6">
        <h1 class="text-3xl font-bold">Settings & Admin</h1>
        <p class="text-zinc-500 text-sm">Manage system settings and data</p>
    </header>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6 border-b border-zinc-800">
        <button
            class="px-6 py-3 font-medium transition-colors {activeTab ===
            'overview'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-zinc-500 hover:text-zinc-300'}"
            on:click={() => (activeTab = "overview")}
        >
            Overview
        </button>
        <button
            class="px-6 py-3 font-medium transition-colors {activeTab ===
            'session'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-zinc-500 hover:text-zinc-300'}"
            on:click={() => (activeTab = "session")}
        >
            Session Management
        </button>
        <button
            class="px-6 py-3 font-medium transition-colors {activeTab ===
            'preorder'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-zinc-500 hover:text-zinc-300'}"
            on:click={() => (activeTab = "preorder")}
        >
            Pre-order Mode
        </button>
        <button
            class="px-6 py-3 font-medium transition-colors {activeTab ===
            'tables'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-zinc-500 hover:text-zinc-300'}"
            on:click={() => (activeTab = "tables")}
        >
            My Tables
        </button>
    </div>

    <!-- Tab Content -->
    {#if activeTab === "overview"}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" in:fade>
            <div class="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                <div class="text-zinc-400 text-sm mb-2">Today's Orders</div>
                <div class="text-4xl font-bold text-orange-400">
                    {stats.todayOrders}
                </div>
            </div>
            <div class="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                <div class="text-zinc-400 text-sm mb-2">Active Seats</div>
                <div class="text-4xl font-bold text-green-400">
                    {stats.activeSeats}
                </div>
            </div>
            <div class="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                <div class="text-zinc-400 text-sm mb-2">Total Teachers</div>
                <div class="text-4xl font-bold text-blue-400">
                    {stats.totalTeachers}
                </div>
            </div>
            <div class="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                <div class="text-zinc-400 text-sm mb-2">Menu Items</div>
                <div class="text-4xl font-bold text-purple-400">
                    {stats.totalMenuItems}
                </div>
            </div>
        </div>

        <div class="space-y-4" in:fade>
            <div class="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                <h3 class="text-xl font-bold mb-2">System Information</h3>
                <p class="text-zinc-400 text-sm mb-4">
                    Bagel Board v1.0 • Built with SvelteKit & Supabase
                </p>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span class="text-zinc-500">Database:</span>
                        <span class="text-white ml-2">Connected</span>
                    </div>
                    <div>
                        <span class="text-zinc-500">Real-time:</span>
                        <span class="text-green-400 ml-2">Active</span>
                    </div>
                    <div>
                        <span class="text-zinc-500">Tables:</span>
                        <span class="text-white ml-2">22</span>
                    </div>
                    <div>
                        <span class="text-zinc-500">Total Seats:</span>
                        <span class="text-white ml-2">176</span>
                    </div>
                </div>
            </div>

            <div class="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                <h3 class="text-xl font-bold mb-2">Quick Actions</h3>
                <div class="flex flex-wrap gap-3">
                    <a
                        href="/preorder"
                        class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors font-medium"
                    >
                        Open Pre-order Mode
                    </a>
                    <button
                        on:click={loadStats}
                        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors font-medium"
                    >
                        Refresh Stats
                    </button>
                    <button
                        on:click={handleLogout}
                        class="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl transition-colors font-medium"
                    >
                        Lock App
                    </button>
                </div>
            </div>
        </div>
    {:else if activeTab === "session"}
        <div class="max-w-2xl space-y-4" in:fade>
            <div
                class="bg-red-900/20 border-2 border-red-500/50 rounded-2xl p-6"
            >
                <h3 class="text-xl font-bold mb-2 text-red-400">
                    🔄 Reset Daily Session
                </h3>
                <p class="text-zinc-300 mb-4">
                    This will check out all teachers, mark all orders as served,
                    and prepare the system for a new meal service.
                </p>
                <p class="text-sm text-zinc-500 mb-6">
                    <strong>Warning:</strong> This action cannot be undone. Use this
                    at the end of each meal service.
                </p>
                <button
                    on:click={resetSession}
                    class="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors font-bold"
                >
                    Reset Session
                </button>
            </div>

            <div class="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                <h3 class="text-xl font-bold mb-2">Session Guidelines</h3>
                <ul class="space-y-2 text-zinc-400 text-sm">
                    <li>✅ Reset the session at the end of each meal service</li>
                    <li>✅ Ensure all orders are completed before resetting</li>
                    <li>
                        ✅ Pre-orders are preserved and will be available for the
                        next check-in
                    </li>
                    <li>
                        ⚠️ All active seat assignments will be deactivated
                    </li>
                    <li>⚠️ All pending/ready orders will be marked as served</li>
                </ul>
            </div>

            <div class="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                <h3 class="text-xl font-bold mb-2">Current Session Stats</h3>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div class="bg-zinc-900 p-4 rounded-lg">
                        <div class="text-zinc-500 mb-1">Active Assignments</div>
                        <div class="text-2xl font-bold text-green-400">
                            {stats.activeSeats}
                        </div>
                    </div>
                    <div class="bg-zinc-900 p-4 rounded-lg">
                        <div class="text-zinc-500 mb-1">Orders Today</div>
                        <div class="text-2xl font-bold text-orange-400">
                            {stats.todayOrders}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {:else if activeTab === "preorder"}
        <div class="max-w-2xl space-y-4" in:fade>
            <div class="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                <h3 class="text-xl font-bold mb-2">Public Pre-order Access</h3>
                <p class="text-zinc-400 mb-4">
                    Share this link with teachers to place pre-orders before
                    arriving:
                </p>
                <div
                    class="bg-zinc-900 p-4 rounded-xl border border-zinc-700 mb-4"
                >
                    <code class="text-orange-400 text-sm"
                        >{window.location.origin}/preorder</code
                    >
                </div>
                <a
                    href="/preorder"
                    target="_blank"
                    class="inline-block px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors font-medium"
                >
                    Open Pre-order Page →
                </a>
            </div>

            <div class="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                <h3 class="text-xl font-bold mb-2">How Pre-orders Work</h3>
                <ol class="space-y-3 text-zinc-400 text-sm list-decimal list-inside">
                    <li>
                        Teachers visit the pre-order page and select their name
                    </li>
                    <li>
                        They browse the menu and customize their breakfast order
                    </li>
                    <li>
                        Pre-orders are saved and linked to their teacher account
                    </li>
                    <li>
                        When they check in at a table, their pre-order is
                        automatically loaded
                    </li>
                    <li>The order is sent directly to the kitchen</li>
                    <li>
                        If no pre-order exists, the waiter can take their order
                        manually
                    </li>
                </ol>
            </div>

            <div class="bg-blue-900/20 border border-blue-500/50 rounded-2xl p-6">
                <h3 class="text-xl font-bold mb-2 text-blue-400">
                    💡 Pro Tips
                </h3>
                <ul class="space-y-2 text-zinc-400 text-sm">
                    <li>
                        📱 Pre-order page works great on mobile devices
                    </li>
                    <li>
                        🔄 Pre-orders are automatically fulfilled when loaded
                    </li>
                    <li>
                        ⏰ Encourage teachers to pre-order the night before
                    </li>
                    <li>
                        ✨ Pre-orders include all customizations and dietary notes
                    </li>
                </ul>
            </div>
        </div>
    {:else if activeTab === "tables"}
        <div class="max-w-4xl space-y-6" in:fade>
            <div class="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
                <h2 class="text-2xl font-bold mb-2">My Table Assignments</h2>
                <p class="text-zinc-400 mb-6">
                    Select the tables you're responsible for. You'll only receive notifications for orders from these tables.
                    {#if assignedTables.length === 0}
                        <span class="text-orange-400 font-medium">Currently showing all tables.</span>
                    {:else}
                        <span class="text-orange-400 font-medium">Assigned to {assignedTables.length} table(s).</span>
                    {/if}
                </p>

                <div class="flex gap-2 mb-6">
                    <button
                        class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
                        on:click={selectAllTables}
                    >
                        Select All
                    </button>
                    <button
                        class="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-medium transition-colors"
                        on:click={clearAllTables}
                    >
                        Clear All
                    </button>
                </div>

                <div class="grid grid-cols-6 md:grid-cols-11 gap-3">
                    {#each Array.from({ length: 22 }, (_, i) => i + 1) as tableId}
                        <button
                            class="aspect-square rounded-xl flex items-center justify-center text-xl font-bold transition-all active:scale-95 {assignedTables.includes(tableId)
                                ? 'bg-orange-500 text-white border-2 border-orange-400'
                                : 'bg-zinc-700 text-zinc-400 border-2 border-zinc-600 hover:border-zinc-500'}"
                            on:click={() => toggleTable(tableId)}
                        >
                            {tableId}
                        </button>
                    {/each}
                </div>
            </div>

            <div class="bg-blue-900/20 border border-blue-500/50 rounded-2xl p-6">
                <h3 class="text-xl font-bold mb-2 text-blue-400">
                    📋 How It Works
                </h3>
                <ul class="space-y-2 text-zinc-400 text-sm">
                    <li>
                        🔔 You'll only get "Order Ready" notifications for your assigned tables
                    </li>
                    <li>
                        👀 You can still see all tables in Waiter Mode
                    </li>
                    <li>
                        ⚡ If no tables are selected, you'll receive all notifications
                    </li>
                    <li>
                        💾 Your table assignments are saved locally on this device
                    </li>
                </ul>
            </div>
        </div>
    {/if}
</div>
