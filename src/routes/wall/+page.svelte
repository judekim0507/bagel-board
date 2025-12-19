<script lang="ts">
	import { onMount } from "svelte";
	import gsap from "gsap";
	import { supabase } from "$lib/supabase";

	const ENABLE_FLASH = false;
	const FLASH_DURATION = 0.5;
	const SPOTLIGHT_HOLD_DURATION = 2.5;
	const FLYOUT_DURATION = 1.8;
	const PHOTO_LIFETIME = 60000;

	type Photo = {
		id: string;
		url: string;
		author: string;
		addedAt: number;
		isLandscape: boolean;
		fading?: boolean;
	};

	let photos = $state<Photo[]>([]);
	let flashVisible = $state(false);
	let spotlightActive = $state(false);
	let spotlightPhoto = $state<Photo | null>(null);

	function hashString(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = (hash << 5) - hash + str.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash);
	}

	function seededRandom(seed: number): number {
		const x = Math.sin(seed * 9999) * 10000;
		return x - Math.floor(x);
	}

	function getStyle(id: string, isLandscape: boolean = false) {
		const numId = hashString(id);
		const zones = [
			{ x: [2, 20], y: [2, 25] },
			{ x: [22, 40], y: [2, 25] },
			{ x: [42, 58], y: [2, 25] },
			{ x: [60, 78], y: [2, 25] },
			{ x: [2, 20], y: [28, 50] },
			{ x: [60, 78], y: [28, 50] },
			{ x: [2, 20], y: [53, 75] },
			{ x: [22, 40], y: [53, 75] },
			{ x: [42, 58], y: [53, 75] },
			{ x: [60, 78], y: [53, 75] },
			{ x: [25, 45], y: [28, 50] },
			{ x: [45, 65], y: [28, 50] },
		];

		const zoneIndex = numId % zones.length;
		const zone = zones[zoneIndex];

		const left =
			zone.x[0] + seededRandom(numId * 3) * (zone.x[1] - zone.x[0]);
		const top =
			zone.y[0] + seededRandom(numId * 7) * (zone.y[1] - zone.y[0]);
		const rotation = (seededRandom(numId * 11) - 0.5) * 18;
		const zIndex = Math.floor(seededRandom(numId * 13) * 20);

		const baseWidth = isLandscape ? 220 : 150;
		const widthRange = isLandscape ? 80 : 60;
		const width = baseWidth + seededRandom(numId * 17) * widthRange;

		return { left, top, rotation, zIndex, width };
	}

	function preloadImage(
		url: string,
	): Promise<{ width: number; height: number }> {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () =>
				resolve({ width: img.naturalWidth, height: img.naturalHeight });
			img.onerror = () => resolve({ width: 0, height: 0 });
			img.src = url;
		});
	}

	async function animateNewPhoto(photo: Photo) {
		const style = getStyle(photo.id, photo.isLandscape);

		spotlightActive = true;
		spotlightPhoto = photo;

		await new Promise((r) => setTimeout(r, 20));

		const element = document.querySelector(
			`[data-spotlight-photo]`,
		) as HTMLElement;
		if (!element) return;

		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const centerX = 50 - (style.width / viewportWidth) * 50;
		const centerY = 50 - ((style.width * 1.2) / viewportHeight) * 50;

		gsap.set(element, {
			left: `${centerX}%`,
			top: `${centerY}%`,
			scale: 2.5,
			rotation: 0,
			opacity: 0,
		});

		const tl = gsap.timeline({
			onComplete: () => {
				photos = [...photos, photo];
				setTimeout(() => {
					spotlightActive = false;
					spotlightPhoto = null;
				}, 30);
			},
		});

		tl.to(element, {
			opacity: 1,
			scale: 2.2,
			duration: 0.6,
			ease: "power2.out",
		})
			.to(element, {
				scale: 2.3,
				duration: SPOTLIGHT_HOLD_DURATION,
				ease: "power1.inOut",
			})
			.to(element, {
				left: `${style.left}%`,
				top: `${style.top}%`,
				scale: 1,
				rotation: style.rotation,
				duration: FLYOUT_DURATION,
				ease: "power3.inOut",
			});
	}

	function triggerFlash() {
		if (!ENABLE_FLASH) return;
		flashVisible = true;
		setTimeout(() => {
			flashVisible = false;
		}, FLASH_DURATION * 1000);
	}

	const FADE_DURATION = 1500;

	function removeExpiredPhotos() {
		const now = Date.now();

		photos = photos.map((p) => {
			if (now - p.addedAt > PHOTO_LIFETIME - FADE_DURATION && !p.fading) {
				return { ...p, fading: true };
			}
			return p;
		});

		photos = photos.filter((p) => now - p.addedAt < PHOTO_LIFETIME);
	}

	async function addPhoto(id: string, imageUrl: string, author: string) {
		const { width, height } = await preloadImage(imageUrl);
		const isLandscape = width > height;

		const newPhoto: Photo = {
			id,
			url: imageUrl,
			author,
			addedAt: Date.now(),
			isLandscape,
		};

		triggerFlash();

		setTimeout(
			() => {
				animateNewPhoto(newPhoto);
			},
			ENABLE_FLASH ? 200 : 0,
		);
	}

	async function deletePhoto(id: string) {
		photos = photos.filter((p) => p.id !== id);

		await fetch("/api/wall/photos", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});
	}

	onMount(() => {
		const cleanupInterval = setInterval(removeExpiredPhotos, 5000);

		const channel = supabase
			.channel("wall-photos")
			.on("broadcast", { event: "photo" }, ({ payload }) => {
				if (payload.type === "add") {
					const photo = payload.photo;
					if (!photos.some((p) => p.id === photo.id)) {
						addPhoto(photo.id, photo.url, photo.author);
					}
				} else if (payload.type === "delete") {
					photos = photos.filter((p) => p.id !== payload.id);
				}
			})
			.subscribe();

		return () => {
			clearInterval(cleanupInterval);
			supabase.removeChannel(channel);
		};
	});
</script>

<svelte:head>
	<title>Photo Wall</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		rel="preconnect"
		href="https://fonts.gstatic.com"
		crossorigin="anonymous"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#if flashVisible}
	<div
		class="fixed inset-0 z-[200] pointer-events-none bg-white"
		style="animation: flash {FLASH_DURATION}s ease-out forwards;"
	></div>
{/if}

<!-- Background fireplace video -->
<div class="fixed inset-0 z-0">
	<video
		autoplay
		loop
		muted
		playsinline
		class="w-full h-full object-cover opacity-100"
	>
		<source src="/fireplace.mp4" type="video/mp4" />
	</video>
	<div
		class="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/40 to-stone-900/60"
	></div>
</div>

<div class="fixed inset-0 z-10 overflow-hidden">
	{#each photos as photo (photo.id)}
		{@const style = getStyle(photo.id, photo.isLandscape)}
		<div
			data-photo-id={photo.id}
			class="absolute transition-all duration-300 hover:scale-110 hover:rotate-0 hover:z-50 cursor-pointer"
			class:photo-fading={photo.fading}
			style="
				left: {style.left}%;
				top: {style.top}%;
				width: {style.width}px;
				transform: rotate({style.rotation}deg);
				z-index: {style.zIndex};
			"
			onclick={() => deletePhoto(photo.id)}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === "Enter" && deletePhoto(photo.id)}
		>
			<div class="bg-white p-2 pb-8 shadow-lg relative">
				<img
					src={photo.url}
					alt="Photo by {photo.author}"
					class="w-full h-auto block bg-stone-200"
				/>
				<span
					class="absolute bottom-2 left-2.5 text-sm text-stone-500"
					style="font-family: 'Caveat', cursive;"
				>
					{photo.author}
				</span>
			</div>
		</div>
	{/each}
</div>

<div
	class="fixed inset-0 z-[50] pointer-events-none bg-black transition-opacity duration-500"
	style="opacity: {spotlightActive ? 0.8 : 0};"
></div>

{#if spotlightPhoto}
	{@const style = getStyle(spotlightPhoto.id, spotlightPhoto.isLandscape)}
	<div
		data-spotlight-photo
		class="fixed z-[100] pointer-events-none"
		style="left: {style.left}%; top: {style.top}%; width: {style.width}px; opacity: 0;"
	>
		<div class="bg-white p-2 pb-8 shadow-2xl relative">
			<img
				src={spotlightPhoto.url}
				alt="Photo by {spotlightPhoto.author}"
				class="w-full h-auto block bg-stone-200"
			/>
			<span
				class="absolute bottom-2 left-2.5 text-sm text-stone-500"
				style="font-family: 'Caveat', cursive;"
			>
				{spotlightPhoto.author}
			</span>
		</div>
	</div>
{/if}

<style>
	@keyframes flash {
		0% {
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}

	.photo-fading {
		animation: fadeOut 1.5s ease-out forwards;
	}

	@keyframes fadeOut {
		0% {
			opacity: 1;
			transform: rotate(var(--rotation, 0deg)) scale(1);
		}
		100% {
			opacity: 0;
			transform: rotate(var(--rotation, 0deg)) scale(0.8);
		}
	}
</style>
