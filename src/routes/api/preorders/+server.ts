import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function GET({ url }) {
    const teacherId = url.searchParams.get("teacher_id");
    const fulfilled = url.searchParams.get("fulfilled");

    let query = supabase
        .from("pre_orders")
        .select("*, pre_order_items(*)")
        .order("created_at", { ascending: false });

    if (teacherId) {
        query = query.eq("teacher_id", teacherId);
    }

    if (fulfilled !== null) {
        query = query.eq("fulfilled", fulfilled === "true");
    }

    const { data, error } = await query;

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    return json(data);
}

export async function POST({ request }) {
    const { teacher_id, device_id, items, dietary_notes } = await request.json();

    if (!teacher_id || !items || items.length === 0) {
        return json({ error: 'Invalid order data' }, { status: 400 });
    }

    // 0. Update teacher's dietary notes if provided
    if (dietary_notes !== undefined) {
        await supabase
            .from('teachers')
            .update({ dietary_notes })
            .eq('id', teacher_id);
    }

    // 1. Create Pre-Order
    const { data: order, error: orderError } = await supabase
        .from('pre_orders')
        .insert({
            teacher_id,
            device_id,
            fulfilled: false
        })
        .select()
        .single();

    if (orderError) return json({ error: orderError.message }, { status: 500 });

    // 2. Create Pre-Order Items
    const orderItems = items.map((item: any) => ({
        pre_order_id: order.id,
        menu_item_id: item.menu_item_id,
        toppings: item.toppings || [], // JSONB
        notes: item.notes
    }));

    const { error: itemsError } = await supabase
        .from('pre_order_items')
        .insert(orderItems);

    if (itemsError) return json({ error: itemsError.message }, { status: 500 });

    return json({ success: true, orderId: order.id });
}
