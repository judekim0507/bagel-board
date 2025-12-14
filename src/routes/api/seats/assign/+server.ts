import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function POST({ request }) {
    const { seat_id, teacher_id, device_id, active = true } = await request.json();

    if (!seat_id || !teacher_id) {
        return json({ error: 'Missing seat_id or teacher_id' }, { status: 400 });
    }

    if (active === false) {
        const { error } = await supabase
            .from('seat_assignments')
            .update({ active: false })
            .eq('seat_id', seat_id)
            .eq('teacher_id', teacher_id)
            .eq('active', true);

        if (error) {
            return json({ error: error.message }, { status: 500 });
        }

        return json({ success: true });
    }

    await supabase
        .from('seat_assignments')
        .update({ active: false })
        .eq('seat_id', seat_id)
        .eq('active', true);

    const { data, error } = await supabase
        .from('seat_assignments')
        .insert({
            seat_id,
            teacher_id,
            device_id,
            active: true
        })
        .select()
        .single();

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    return json(data);
}
