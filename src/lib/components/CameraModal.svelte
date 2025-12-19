<script lang="ts">
	import { fade, fly } from "svelte/transition";
	import X from "lucide-svelte/icons/x";
	import Camera from "lucide-svelte/icons/camera";
	import RotateCcw from "lucide-svelte/icons/rotate-ccw";
	import Send from "lucide-svelte/icons/send";
	import SwitchCamera from "lucide-svelte/icons/switch-camera";
	import RectangleVertical from "lucide-svelte/icons/rectangle-vertical";
	import RectangleHorizontal from "lucide-svelte/icons/rectangle-horizontal";

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	let { open = $bindable(), onClose }: Props = $props();

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
	let aspectMode = $state<"portrait" | "landscape">("landscape");

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
				video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
				audio: false,
			});

			if (videoElement) {
				videoElement.srcObject = stream;
				await videoElement.play();
				cameraReady = true;
				error = null;
			}
		} catch (err: any) {
			if (err.name === "NotAllowedError") {
				error = "Allow camera access";
			} else if (err.name === "NotFoundError") {
				error = "No camera found";
			} else {
				error = "Camera error";
			}
		}
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}
		cameraReady = false;
	}

	function switchCamera() {
		facingMode = facingMode === "user" ? "environment" : "user";
		startCamera();
	}

	function toggleAspect() {
		aspectMode = aspectMode === "portrait" ? "landscape" : "portrait";
	}

	function capture() {
		if (!cameraReady || capturing) return;
		capturing = true;

		setTimeout(() => {
			const ctx = canvasElement.getContext("2d");
			if (!ctx) return;

			const videoWidth = videoElement.videoWidth;
			const videoHeight = videoElement.videoHeight;

			const targetRatio = aspectMode === "portrait" ? 3 / 4 : 4 / 3;
			const videoRatio = videoWidth / videoHeight;

			let srcX = 0, srcY = 0, srcW = videoWidth, srcH = videoHeight;

			if (videoRatio > targetRatio) {
				srcW = videoHeight * targetRatio;
				srcX = (videoWidth - srcW) / 2;
			} else {
				srcH = videoWidth / targetRatio;
				srcY = (videoHeight - srcH) / 2;
			}

			if (aspectMode === "portrait") {
				canvasElement.width = 900;
				canvasElement.height = 1200;
			} else {
				canvasElement.width = 1200;
				canvasElement.height = 900;
			}

			if (facingMode === "user") {
				ctx.translate(canvasElement.width, 0);
				ctx.scale(-1, 1);
			}

			ctx.drawImage(videoElement, srcX, srcY, srcW, srcH, 0, 0, canvasElement.width, canvasElement.height);
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
				reset();
				onClose();
			}, 1000);
		} catch {
			error = "Failed to send";
		}
	}

	function reset() {
		captured = false;
		capturedImage = null;
		sent = false;
		error = null;
		name = "";
	}

	function handleClose() {
		stopCamera();
		reset();
		onClose();
	}

	$effect(() => {
		if (open) {
			setTimeout(() => startCamera(), 100);
		} else {
			stopCamera();
		}
	});
</script>

{#if open}
	<div
		class="fixed inset-0 z-[200] flex items-center justify-center p-4"
		transition:fade={{ duration: 150 }}
	>
		<button
			class="absolute inset-0 bg-black/60"
			onclick={handleClose}
			aria-label="Close camera"
		></button>

		<div
			class="relative bg-black rounded-2xl overflow-hidden shadow-2xl w-full {aspectMode === 'portrait' ? 'max-w-sm' : 'max-w-lg'}"
			transition:fly={{ y: 50, duration: 200 }}
		>
			<button
				onclick={handleClose}
				class="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
				aria-label="Close"
			>
				<X class="w-5 h-5" />
			</button>

			<div
				class="relative bg-stone-900 overflow-hidden"
				style="aspect-ratio: {aspectMode === 'portrait' ? '3/4' : '4/3'};"
			>
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
						<p class="text-white/50 text-sm">{error}</p>
					</div>
				{/if}

				{#if !captured && cameraReady}
					<div class="absolute top-3 left-3 flex gap-2">
						<button
							onclick={switchCamera}
							class="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
							aria-label="Switch camera"
						>
							<SwitchCamera class="w-5 h-5" />
						</button>
						<button
							onclick={toggleAspect}
							class="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
							aria-label="Toggle aspect ratio"
						>
							{#if aspectMode === "portrait"}
								<RectangleVertical class="w-5 h-5" />
							{:else}
								<RectangleHorizontal class="w-5 h-5" />
							{/if}
						</button>
					</div>
				{/if}

				{#if sent}
					<div class="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
						<div class="flex flex-col items-center gap-2">
							<svg class="w-12 h-12 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
							<p class="text-white font-medium">Sent!</p>
						</div>
					</div>
				{/if}
			</div>

			{#if !sent}
				<div class="p-4 bg-stone-900">
					{#if !captured}
						<div class="flex justify-center">
							<button
								onclick={capture}
								disabled={!cameraReady || capturing}
								class="relative w-16 h-16 disabled:opacity-30"
								aria-label="Take photo"
							>
								<div class="absolute inset-0 rounded-full border-[3px] border-white/80"></div>
								<div class="absolute inset-[4px] rounded-full bg-white active:bg-white/70 transition-colors flex items-center justify-center">
									<Camera class="w-6 h-6 text-stone-900" />
								</div>
							</button>
						</div>
					{:else}
						<div class="space-y-3">
							<input
								type="text"
								bind:value={name}
								placeholder="Teacher name"
								class="w-full bg-stone-800 text-white text-center text-sm py-3 px-4 rounded-xl placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-white/20"
								autocomplete="off"
								autocapitalize="words"
							/>
							<div class="flex gap-2">
								<button
									onclick={retake}
									class="flex-1 py-3 px-4 bg-stone-800 text-white text-sm font-medium rounded-xl hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
								>
									<RotateCcw class="w-4 h-4" />
									Retake
								</button>
								<button
									onclick={send}
									disabled={!name.trim()}
									class="flex-1 py-3 px-4 bg-white text-black text-sm font-semibold rounded-xl disabled:opacity-30 hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
								>
									<Send class="w-4 h-4" />
									Send
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<canvas bind:this={canvasElement} class="hidden"></canvas>
		</div>
	</div>
{/if}

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
