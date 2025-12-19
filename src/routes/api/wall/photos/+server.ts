import type { RequestHandler } from "@sveltejs/kit";

const PHOTO_LIFETIME = 60000;

type Photo = {
	id: string;
	url: string;
	author: string;
	addedAt: number;
};

const photos: Photo[] = [];
const clients: Set<ReadableStreamDefaultController> = new Set();

function generateId() {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cleanupExpired() {
	const now = Date.now();
	for (let i = photos.length - 1; i >= 0; i--) {
		if (now - photos[i].addedAt >= PHOTO_LIFETIME) {
			photos.splice(i, 1);
		}
	}
}

setInterval(cleanupExpired, 5000);

export const POST: RequestHandler = async ({ request }) => {
	const { url, author } = await request.json();

	const photo: Photo = {
		id: generateId(),
		url,
		author,
		addedAt: Date.now(),
	};

	photos.push(photo);

	const message = `data: ${JSON.stringify({ type: "add", photo })}\n\n`;
	for (const controller of clients) {
		try {
			controller.enqueue(new TextEncoder().encode(message));
		} catch {
			clients.delete(controller);
		}
	}

	return new Response(JSON.stringify({ success: true, id: photo.id }), {
		headers: { "Content-Type": "application/json" },
	});
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { id } = await request.json();

	const index = photos.findIndex((p) => p.id === id);
	if (index !== -1) {
		photos.splice(index, 1);

		const message = `data: ${JSON.stringify({ type: "delete", id })}\n\n`;
		for (const controller of clients) {
			try {
				controller.enqueue(new TextEncoder().encode(message));
			} catch {
				clients.delete(controller);
			}
		}
	}

	return new Response(JSON.stringify({ success: true }), {
		headers: { "Content-Type": "application/json" },
	});
};

export const GET: RequestHandler = async () => {
	cleanupExpired();

	const stream = new ReadableStream({
		start(controller) {
			clients.add(controller);

			for (const photo of photos) {
				controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "add", photo })}\n\n`));
			}
		},
		cancel(controller) {
			clients.delete(controller);
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
};
