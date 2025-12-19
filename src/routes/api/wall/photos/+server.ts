import type { RequestHandler } from "@sveltejs/kit";
import { supabase } from "$lib/supabase";

export const POST: RequestHandler = async ({ request }) => {
	const { url, author } = await request.json();

	const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

	const channel = supabase.channel("wall-photos");
	await channel.send({
		type: "broadcast",
		event: "photo",
		payload: { type: "add", photo: { id, url, author, addedAt: Date.now() } },
	});
	supabase.removeChannel(channel);

	return new Response(JSON.stringify({ success: true, id }), {
		headers: { "Content-Type": "application/json" },
	});
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { id } = await request.json();

	const channel = supabase.channel("wall-photos");
	await channel.send({
		type: "broadcast",
		event: "photo",
		payload: { type: "delete", id },
	});
	supabase.removeChannel(channel);

	return new Response(JSON.stringify({ success: true }), {
		headers: { "Content-Type": "application/json" },
	});
};
