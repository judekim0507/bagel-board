import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function DELETE({ params }) {
    const { id } = params;

    const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', id);

    if (itemsError) {
        return json({ error: itemsError.message }, { status: 500 });
    }

    const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

    if (orderError) {
        return json({ error: orderError.message }, { status: 500 });
    }

    return json({ success: true });
}
