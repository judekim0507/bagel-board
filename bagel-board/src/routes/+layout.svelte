<script lang="ts">
	import "../app.css";
	import { isAuthenticated } from "$lib/stores/auth";
	import { initRealtime } from "$lib/stores/realtime";
	import { browser } from "$app/environment";
	import { page } from "$app/stores";
	import PinProtection from "$lib/components/PinProtection.svelte";
	import BottomNav from "$lib/components/BottomNav.svelte";
	import { Toaster } from "svelte-sonner";

	$: if ($isAuthenticated && browser) {
		initRealtime();
	}

	// Check if current route is preorder (public access)
	$: isPreorderRoute = $page.url.pathname.startsWith("/preorder");
</script>

<svelte:head>
	<meta name="theme-color" content="#090B0C" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=BBH+Bogle&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div
	class="h-screen w-full bg-black text-white antialiased overflow-hidden flex items-center justify-center overflow-hidden"
>
	<Toaster richColors position="top-center" />

	{#if isPreorderRoute}
		<!-- Preorder Route - No PIN, No Nav, Standalone -->
		<div class="w-full h-full bg-zinc-900">
			<slot />
		</div>
	{:else if !$isAuthenticated}
		<!-- Staff Routes - PIN Protection -->
		<PinProtection />
	{:else}
		<!-- Staff Routes - Authenticated -->
		<div
			class="w-full h-full max-w-[1400px] bg-[#090B0C] overflow-hidden flex flex-col shadow-2xl ring-1 ring-white/10 overflow-hidden"
		>
			<!-- Main Content Area (Gray Card) -->
			<main
				class="flex-1 bg-zinc-200 rounded-[18px] mt-2 mx-2 overflow-hidden flex flex-col relative"
			>
				<slot />
			</main>

			<!-- Bottom Navigation Strip -->
			<div class="h-14 bg-[#090B0C] flex-none px-6 rounded-b-[18px]">
				<BottomNav />
			</div>
		</div>
	{/if}
</div>
