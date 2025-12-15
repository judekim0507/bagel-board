import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function POST({ request }) {
    const { teacher_id, seat_id, device_id, items, dietary_notes } = await request.json();

    if (!teacher_id || !items || items.length === 0) {
        return json({ error: 'Invalid order data' }, { status: 400 });
    }

    // Update teacher's dietary notes if provided
    if (dietary_notes !== undefined) {
        await supabase
            .from('teachers')
            .update({ dietary_notes: dietary_notes || null })
            .eq('id', teacher_id);
    }

    // 1. Create Order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            teacher_id,
            seat_id, // Optional if we just link teacher, but good for tracking
            device_id,
            status: 'pending'
        })
        .select()
        .single();

    if (orderError) return json({ error: orderError.message }, { status: 500 });

    // 2. Create Order Items
    const orderItems = items.map((item: any) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        toppings: item.toppings || [], // JSONB
        notes: item.notes
    }));

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

    if (itemsError) return json({ error: itemsError.message }, { status: 500 });

    return json({ success: true, orderId: order.id });
}
