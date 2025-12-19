<script lang="ts">
	import { onMount } from "svelte";
	import gsap from "gsap";
	import Upload from "lucide-svelte/icons/upload";
	import ChevronLeft from "lucide-svelte/icons/chevron-left";

	type SessionData = {
		exportedAt: string;
		sessionStart: string;
		summary: {
			totalOrders: number;
			totalPreorders: number;
			totalAssignments: number;
			ordersByStatus: Record<string, number>;
		};
		orders: any[];
		preorders: any[];
		seatAssignments: any[];
		teachers: any[];
		menuItems: any[];
	};

	let data: SessionData | null = $state(null);
	let currentSlide = $state(0);
	let stats = $state<any>(null);
	let slideElements: HTMLElement[] = [];
	let loading = $state(true);
	let loadError = $state(false);

	onMount(async () => {
		try {
			const res = await fetch("/recap.json");
			if (res.ok) {
				data = await res.json();
				if (data) {
					stats = computeStats(data);
					currentSlide = 0;
					setTimeout(() => animateSlideIn(0), 100);
				}
			} else {
				loadError = true;
			}
		} catch {
			loadError = true;
		}
		loading = false;
	});

	function handleFile(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				data = JSON.parse(e.target?.result as string);
				if (data) {
					stats = computeStats(data);
					currentSlide = 0;
					loadError = false;
					setTimeout(() => animateSlideIn(0), 100);
				}
			} catch {
				alert("Invalid JSON file");
			}
		};
		reader.readAsText(file);
	}

	function computeStats(d: SessionData) {
		const allItems: any[] = [];
		const allToppings: string[] = [];
		const teacherOrders: Record<string, { name: string; count: number }> = {};

		d.orders.forEach((order) => {
			order.order_items?.forEach((item: any) => {
				allItems.push(item.menu_items?.name || "Unknown");
				if (Array.isArray(item.toppings)) {
					allToppings.push(...item.toppings);
				}
			});
		});

		d.seatAssignments.forEach((sa) => {
			const teacherId = sa.teacher_id;
			const teacherName = sa.teachers?.name || "Unknown";
			const orderCount = d.orders.filter((o) => o.seat_assignment_id === sa.id).length;
			if (orderCount > 0) {
				if (!teacherOrders[teacherId]) {
					teacherOrders[teacherId] = { name: teacherName, count: 0 };
				}
				teacherOrders[teacherId].count += orderCount;
			}
		});

		const itemCounts = allItems.reduce((acc: Record<string, number>, item) => {
			acc[item] = (acc[item] || 0) + 1;
			return acc;
		}, {});

		const toppingCounts = allToppings.reduce((acc: Record<string, number>, t) => {
			acc[t] = (acc[t] || 0) + 1;
			return acc;
		}, {});

		const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
		const sortedToppings = Object.entries(toppingCounts).sort((a, b) => b[1] - a[1]);
		const sortedTeachers = Object.values(teacherOrders).sort((a, b) => b.count - a.count);

		const orderTimes = d.orders
			.map((o) => new Date(o.created_at).getTime())
			.filter((t) => !isNaN(t))
			.sort((a, b) => a - b);

		const firstOrderTime = orderTimes[0] ? new Date(orderTimes[0]) : null;
		const lastOrderTime = orderTimes[orderTimes.length - 1] ? new Date(orderTimes[orderTimes.length - 1]) : null;

		const sessionDate = new Date(d.sessionStart);

		return {
			totalItems: allItems.length,
			totalOrders: d.summary.totalOrders,
			totalTeachers: d.seatAssignments.length,
			topItem: sortedItems[0],
			topToppings: sortedToppings.slice(0, 5),
			topTeacher: sortedTeachers[0],
			firstOrderTime,
			lastOrderTime,
			sessionDate,
			uniqueToppings: Object.keys(toppingCounts).length,
			preorderCount: d.summary.totalPreorders,
		};
	}

	function animateSlideIn(index: number) {
		const slide = slideElements[index];
		if (!slide) return;

		gsap.fromTo(slide,
			{ opacity: 0, scale: 0.95, y: 30 },
			{ opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power2.out" }
		);

		const children = slide.querySelectorAll("[data-animate]");
		gsap.fromTo(children,
			{ opacity: 0, y: 20 },
			{ opacity: 1, y: 0, duration: 0.4, stagger: 0.1, delay: 0.2, ease: "power2.out" }
		);
	}

	function animateSlideOut(index: number, direction: number) {
		const slide = slideElements[index];
		if (!slide) return;

		return gsap.to(slide, {
			opacity: 0,
			x: direction * -50,
			duration: 0.25,
			ease: "power2.in",
		});
	}

	const totalSlides = 7;

	async function nextSlide() {
		if (!stats) return;
		if (currentSlide >= totalSlides - 1) return;

		await animateSlideOut(currentSlide, 1);
		currentSlide++;
		await new Promise((r) => setTimeout(r, 50));
		animateSlideIn(currentSlide);
	}

	async function prevSlide() {
		if (currentSlide <= 0) return;

		await animateSlideOut(currentSlide, -1);
		currentSlide--;
		await new Promise((r) => setTimeout(r, 50));
		animateSlideIn(currentSlide);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "ArrowRight" || e.key === " ") nextSlide();
		if (e.key === "ArrowLeft") prevSlide();
	}

	function formatTime(date: Date | null) {
		if (!date) return "--:--";
		return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
	}

	function formatFullDate(date: Date) {
		return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
	}

	const gradients = [
		"from-orange-600 via-amber-500 to-yellow-500",
		"from-violet-600 via-purple-500 to-fuchsia-500",
		"from-rose-500 via-pink-500 to-orange-400",
		"from-cyan-500 via-teal-500 to-emerald-500",
		"from-emerald-500 via-green-500 to-teal-500",
		"from-pink-500 via-rose-500 to-red-500",
		"from-amber-500 via-orange-500 to-red-500",
	];
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
	<title>Bagel Recap</title>
</svelte:head>

<div class="fixed inset-0 bg-neutral-950 flex items-center justify-center">
	<div class="w-full max-w-[430px] h-full max-h-[932px] relative bg-black md:rounded-[3rem] md:border-[8px] md:border-neutral-800 overflow-hidden md:shadow-2xl">
		{#if loading}
			<div class="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-500">
				<div class="text-6xl animate-pulse">🥯</div>
			</div>
		{:else if !data || loadError}
			<div class="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-500">
				<div class="text-center space-y-10">
					<div class="space-y-3">
						<div class="text-6xl mb-4">🥯</div>
						<h1 class="text-4xl font-black text-white tracking-tight">Bagel Recap</h1>
						<p class="text-white/70 text-base">Your breakfast, wrapped.</p>
					</div>

					<label class="group cursor-pointer block">
						<div class="bg-white/20 backdrop-blur-sm rounded-2xl p-8 transition-all hover:bg-white/30 active:scale-95">
							<div class="flex flex-col items-center gap-3">
								<div class="w-14 h-14 rounded-full bg-white/30 flex items-center justify-center">
									<Upload class="w-7 h-7 text-white" />
								</div>
								<div>
									<p class="text-white font-bold text-base">Upload Session</p>
									<p class="text-white/60 text-sm">JSON export file</p>
								</div>
							</div>
						</div>
						<input type="file" accept=".json" class="hidden" onchange={handleFile} />
					</label>
				</div>
			</div>
		{:else if stats}
			<div
				class="h-full relative"
				onclick={nextSlide}
				role="button"
				tabindex="0"
			>
				<!-- Progress bar -->
				<div class="absolute top-4 left-4 right-4 z-50 flex gap-1">
					{#each Array(totalSlides) as _, i}
						<div class="flex-1 h-[3px] rounded-full overflow-hidden bg-white/20">
							<div
								class="h-full bg-white transition-all duration-300 ease-out"
								style="width: {i < currentSlide ? '100%' : i === currentSlide ? '100%' : '0%'}"
							></div>
						</div>
					{/each}
				</div>

				<!-- Back button -->
				{#if currentSlide > 0}
					<button
						onclick={(e) => { e.stopPropagation(); prevSlide(); }}
						class="absolute top-12 left-4 z-50 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/30 transition-colors"
						aria-label="Previous"
					>
						<ChevronLeft class="w-5 h-5" />
					</button>
				{/if}

				<!-- Slides Container -->
				<div class="h-full">
					<!-- Slide 0: Intro -->
					<div
						bind:this={slideElements[0]}
						class="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br {gradients[0]}"
						class:hidden={currentSlide !== 0}
					>
						<div class="text-center space-y-6">
							<p class="text-white/70 text-sm font-medium uppercase tracking-widest" data-animate>Your Recap</p>
							<div data-animate>
								<div class="text-7xl mb-6">🥯</div>
								<h1 class="text-4xl font-black text-white leading-tight">
									{formatFullDate(stats.sessionDate)}
								</h1>
							</div>
							<p class="text-white/50 text-sm pt-8" data-animate>Tap to continue</p>
						</div>
					</div>

					<!-- Slide 1: Total Orders -->
					<div
						bind:this={slideElements[1]}
						class="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br {gradients[1]}"
						class:hidden={currentSlide !== 1}
					>
						<div class="text-center">
							<p class="text-white/70 text-sm font-medium uppercase tracking-widest mb-6" data-animate>Today you served</p>
							<div data-animate>
								<span class="text-[10rem] font-black text-white leading-none block">{stats.totalItems}</span>
								<p class="text-white text-2xl font-bold mt-2">menu items</p>
							</div>
							<p class="text-white/50 text-sm mt-8" data-animate>
								across {stats.totalOrders} orders
							</p>
						</div>
					</div>

					<!-- Slide 2: Top Item -->
					<div
						bind:this={slideElements[2]}
						class="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br {gradients[2]}"
						class:hidden={currentSlide !== 2}
					>
						<div class="text-center">
							<p class="text-white/70 text-sm font-medium uppercase tracking-widest mb-8" data-animate>Fan favorite</p>
							{#if stats.topItem}
								<h1 class="text-4xl font-black text-white leading-tight mb-4" data-animate>
									{stats.topItem[0]}
								</h1>
								<div data-animate>
									<span class="text-8xl font-black text-white/20 block">{stats.topItem[1]}×</span>
								</div>
							{:else}
								<p class="text-white/50 text-xl" data-animate>No items ordered</p>
							{/if}
						</div>
					</div>

					<!-- Slide 3: Toppings -->
					<div
						bind:this={slideElements[3]}
						class="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br {gradients[3]}"
						class:hidden={currentSlide !== 3}
					>
						<div class="text-center w-full">
							<p class="text-white/70 text-sm font-medium uppercase tracking-widest mb-8" data-animate>Top toppings</p>
							{#if stats.topToppings.length > 0}
								<div class="space-y-3 max-w-xs mx-auto">
									{#each stats.topToppings as [topping, count], i}
										<div
											class="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3"
											data-animate
										>
											<span class="text-white/40 text-lg font-bold w-6">{i + 1}</span>
											<span class="text-white text-lg font-semibold flex-1 text-left">{topping}</span>
											<span class="text-white/50 text-base">{count}</span>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-white/50" data-animate>No toppings used</p>
							{/if}
						</div>
					</div>

					<!-- Slide 4: Timeline -->
					<div
						bind:this={slideElements[4]}
						class="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br {gradients[4]}"
						class:hidden={currentSlide !== 4}
					>
						<div class="text-center space-y-8">
							<p class="text-white/70 text-sm font-medium uppercase tracking-widest" data-animate>Service window</p>
							<div class="space-y-6">
								<div data-animate>
									<p class="text-white/50 text-sm mb-1">First order</p>
									<p class="text-5xl font-black text-white">{formatTime(stats.firstOrderTime)}</p>
								</div>
								<div class="flex items-center justify-center gap-3" data-animate>
									<div class="h-px w-12 bg-white/30"></div>
									<span class="text-white/30 text-xs">TO</span>
									<div class="h-px w-12 bg-white/30"></div>
								</div>
								<div data-animate>
									<p class="text-white/50 text-sm mb-1">Last order</p>
									<p class="text-5xl font-black text-white">{formatTime(stats.lastOrderTime)}</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Slide 5: Teachers -->
					<div
						bind:this={slideElements[5]}
						class="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br {gradients[5]}"
						class:hidden={currentSlide !== 5}
					>
						<div class="text-center space-y-8">
							<p class="text-white/70 text-sm font-medium uppercase tracking-widest" data-animate>Teachers served</p>
							<div data-animate>
								<span class="text-[8rem] font-black text-white leading-none block">{stats.totalTeachers}</span>
							</div>
							{#if stats.preorderCount > 0}
								<div class="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 inline-block" data-animate>
									<span class="text-white font-bold text-2xl">{stats.preorderCount}</span>
									<span class="text-white/70 text-base ml-2">pre-ordered</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Slide 6: Thanks -->
					<div
						bind:this={slideElements[6]}
						class="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br {gradients[6]}"
						class:hidden={currentSlide !== 6}
					>
						<div class="text-center space-y-8">
							<div class="text-7xl" data-animate>🥯</div>
							<div data-animate>
								<h1 class="text-4xl font-black text-white mb-2">That's a wrap!</h1>
								<p class="text-white/60 text-base">See you next breakfast.</p>
							</div>
							<label class="cursor-pointer inline-block" data-animate>
								<div class="mt-4 px-6 py-3 bg-white/20 text-white rounded-full font-bold text-sm hover:bg-white/30 active:scale-95 transition-all">
									Upload different session
								</div>
								<input type="file" accept=".json" class="hidden" onchange={handleFile} />
							</label>
						</div>
					</div>
				</div>

				<!-- Tap hint -->
				<div class="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
					<p class="text-white/30 text-xs">Tap anywhere to continue</p>
				</div>
			</div>
		{/if}
	</div>
</div>
