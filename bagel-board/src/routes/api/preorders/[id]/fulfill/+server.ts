import { json } from "@sveltejs/kit";
import { supabase } from "$lib/supabase";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ params }) => {
    const { id } = params;

    const { error } = await supabase
        .from("pre_orders")
        .update({ fulfilled: true })
        .eq("id", id);

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    return json({ success: true });
};
