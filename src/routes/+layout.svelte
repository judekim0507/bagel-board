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

	$: isPreorderRoute = $page.url.pathname.startsWith("/preorder");
</script>

<svelte:head>
	<meta name="theme-color" content="#0c0a09" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		rel="preconnect"
		href="https://fonts.gstatic.com"
		crossorigin="anonymous"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
		rel="stylesheet"
	/>
	<link rel="icon" type="image/png" href="/favicon.png" />
	<title>Bagel Board</title>
</svelte:head>

<div
	class="dark h-screen w-full antialiased overflow-hidden flex items-center justify-center bg-stone-950"
>
	<Toaster richColors position="top-center" />

	{#if isPreorderRoute}
		<!-- Preorder Route - Dark theme, standalone, no nav -->
		<div class="w-full h-full bg-background">
			<slot />
		</div>
	{:else if !$isAuthenticated}
		<!-- PIN Protection -->
		<PinProtection />
	{:else}
		<!-- All Staff Routes - Same layout with dark shell and rounded content -->
		<div
			class="w-full h-full max-w-[1600px] bg-stone-950 overflow-hidden flex flex-col"
		>
			<main
				class="flex-1 bg-card rounded-2xl mt-2 mx-2 overflow-hidden flex flex-col border border-border/50 shadow-xl"
			>
				<slot />
			</main>
			<div class="h-14 bg-stone-950 flex-none px-6">
				<BottomNav />
			</div>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		font-family: "Inter", system-ui, sans-serif;
	}
</style>
