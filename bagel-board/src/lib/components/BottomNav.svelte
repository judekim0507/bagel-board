<script lang="ts">
    import { page } from "$app/stores";

    // Icons
    import UtensilsCrossed from "lucide-svelte/icons/utensils-crossed";
    import ChefHat from "lucide-svelte/icons/chef-hat";
    import Settings from "lucide-svelte/icons/settings";
</script>

<nav class="h-full flex items-center justify-center gap-12 mx-auto">
    <a
        href="/"
        class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all
               {$page.url.pathname === '/'
            ? 'text-white'
            : 'text-stone-500 hover:text-stone-300'}"
    >
        <UtensilsCrossed class="w-5 h-5" />
        <span class="text-lg font-medium">Waiter</span>
    </a>

    <a
        href="/kds"
        class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all
               {$page.url.pathname === '/kds'
            ? 'text-white'
            : 'text-stone-500 hover:text-stone-300'}"
    >
        <ChefHat class="w-5 h-5" />
        <span class="text-lg font-medium">Kitchen</span>
    </a>

    <a
        href="/settings"
        class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all
               {$page.url.pathname === '/settings'
            ? 'text-white'
            : 'text-stone-500 hover:text-stone-300'}"
    >
        <Settings class="w-5 h-5" />
        <span class="text-lg font-medium">Settings</span>
    </a>
</nav>
