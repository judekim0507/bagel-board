import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function POST({ request }) {
    const { order_id, status } = await request.json();

    if (!order_id || !status) {
        return json({ error: 'Missing order_id or status' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', order_id)
        .select()
        .single();

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    return json(data);
}
