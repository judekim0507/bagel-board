<script lang="ts">
	import { onMount } from "svelte";

	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let stream: MediaStream | null = null;

	let name = $state("");
	let cameraReady = $state(false);
	let capturing = $state(false);
	let captured = $state(false);
	let capturedImage = $state<string | null>(null);
	let sent = $state(false);
	let error = $state<string | null>(null);
	let facingMode = $state<"user" | "environment">("environment");
	let isLandscape = $state(false);

	function checkOrientation() {
		isLandscape = window.innerWidth > window.innerHeight;
	}

	async function startCamera() {
		try {
			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
			}

			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
				error = "Requires HTTPS";
				return;
			}

			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
				audio: false,
			});
			videoElement.srcObject = stream;
			await videoElement.play();
			cameraReady = true;
			error = null;
		} catch (err: any) {
			if (err.name === "NotAllowedError") {
				error = "Allow camera access";
			} else if (err.name === "NotFoundError") {
				error = "No camera found";
			} else {
				error = "Requires HTTPS";
			}
		}
	}

	function switchCamera() {
		facingMode = facingMode === "user" ? "environment" : "user";
		startCamera();
	}

	function capture() {
		if (!cameraReady || capturing) return;
		capturing = true;

		setTimeout(() => {
			const ctx = canvasElement.getContext("2d");
			if (!ctx) return;

			canvasElement.width = videoElement.videoWidth;
			canvasElement.height = videoElement.videoHeight;

			if (facingMode === "user") {
				ctx.translate(canvasElement.width, 0);
				ctx.scale(-1, 1);
			}

			ctx.drawImage(videoElement, 0, 0);
			capturedImage = canvasElement.toDataURL("image/jpeg", 0.9);
			captured = true;
			capturing = false;
		}, 100);
	}

	function retake() {
		captured = false;
		capturedImage = null;
		sent = false;
		error = null;
	}

	async function send() {
		if (!capturedImage || !name.trim()) return;

		try {
			const res = await fetch("/api/wall/photos", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url: capturedImage, author: name.trim() }),
			});

			if (!res.ok) throw new Error("Failed");
			sent = true;

			setTimeout(() => {
				captured = false;
				capturedImage = null;
				sent = false;
				name = "";
			}, 1500);
		} catch {
			error = "Failed to send";
		}
	}

	onMount(() => {
		checkOrientation();
		window.addEventListener("resize", checkOrientation);
		startCamera();
		return () => {
			window.removeEventListener("resize", checkOrientation);
			stream?.getTracks().forEach((t) => t.stop());
		};
	});
</script>

<svelte:head>
	<title>Camera</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
</svelte:head>

<div class="fixed inset-0 bg-black flex flex-col" class:flex-row={isLandscape}>
	<div class="relative flex-1">
		<video
			bind:this={videoElement}
			class="absolute inset-0 w-full h-full object-cover"
			class:hidden={captured}
			class:mirror={facingMode === "user"}
			autoplay
			playsinline
			muted
		></video>

		{#if capturedImage && captured}
			<img src={capturedImage} alt="" class="absolute inset-0 w-full h-full object-cover" />
		{/if}

		{#if capturing}
			<div class="absolute inset-0 bg-white/90 animate-flash"></div>
		{/if}

		{#if error && !captured}
			<div class="absolute inset-0 flex items-center justify-center">
				<p class="text-white/50 text-base">{error}</p>
			</div>
		{/if}

		{#if !captured && cameraReady}
			<button
				onclick={switchCamera}
				class="absolute top-4 p-3 active:opacity-50"
				class:right-4={!isLandscape}
				class:left-4={isLandscape}
			>
				<svg class="w-6 h-6 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>
		{/if}

		{#if captured && !sent}
			<button
				onclick={retake}
				class="absolute top-4 left-4 text-white text-[15px] font-medium active:opacity-50"
			>
				Retake
			</button>
		{/if}
	</div>

	{#if !sent}
		<div
			class="bg-black/90 flex items-center justify-center"
			class:w-28={isLandscape}
			class:h-full={isLandscape}
			class:h-40={!isLandscape}
			class:w-full={!isLandscape}
		>
			{#if !captured}
				<button
					onclick={capture}
					disabled={!cameraReady || capturing}
					class="relative w-[68px] h-[68px] disabled:opacity-30"
				>
					<div class="absolute inset-0 rounded-full border-[3px] border-white/80"></div>
					<div class="absolute inset-[5px] rounded-full bg-white active:bg-white/70 transition-colors"></div>
				</button>
			{:else}
				<div class="flex items-center gap-3 p-4" class:flex-col={isLandscape}>
					<input
						type="text"
						bind:value={name}
						placeholder="Name"
						class="bg-white/10 text-white text-center text-sm py-3 px-4 rounded-xl placeholder:text-white/30 focus:outline-none focus:bg-white/15 transition-colors"
						class:w-32={isLandscape}
						class:w-40={!isLandscape}
						autocomplete="off"
						autocapitalize="words"
					/>
					<button
						onclick={send}
						disabled={!name.trim()}
						class="py-3 px-6 bg-white text-black text-sm font-semibold rounded-xl disabled:opacity-30 active:bg-white/80 transition-colors"
						class:w-32={isLandscape}
						class:w-40={!isLandscape}
					>
						Send
					</button>
				</div>
			{/if}
		</div>
	{/if}

	{#if sent}
		<div class="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div class="flex flex-col items-center gap-2">
				<svg class="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				<p class="text-white/80 text-sm">Sent</p>
			</div>
		</div>
	{/if}

	<canvas bind:this={canvasElement} class="hidden"></canvas>
</div>

<style>
	.mirror {
		transform: scaleX(-1);
	}

	@keyframes flash {
		0% { opacity: 1; }
		100% { opacity: 0; }
	}

	.animate-flash {
		animation: flash 0.15s ease-out forwards;
	}
</style>
