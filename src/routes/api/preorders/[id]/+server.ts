import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function DELETE({ params }) {
    const { id } = params;
    await supabase
        .from('pre_order_items')
        .delete()
        .eq('pre_order_id', id);
    const { error } = await supabase
        .from('pre_orders')
        .delete()
        .eq('id', id);

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    return json({ success: true });
}
