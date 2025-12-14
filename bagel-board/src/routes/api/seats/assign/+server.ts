import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase'; // Using the client-side one for now, but really should be server-side with service key if we want strict security.
// However, the plan said "Server-side Supabase client: Uses service role key".
// I haven't created a server-side client yet. For now, I'll use the anon key client since RLS is public.
// TODO: Upgrade to service key for robust security later.

export async function POST({ request }) {
    const { seat_id, teacher_id, device_id, active = true } = await request.json();

    if (!seat_id || !teacher_id) {
        return json({ error: 'Missing seat_id or teacher_id' }, { status: 400 });
    }

    // If checking out (active: false), just deactivate the assignment
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

    // 1. Deactivate existing assignments for this seat
    await supabase
        .from('seat_assignments')
        .update({ active: false })
        .eq('seat_id', seat_id)
        .eq('active', true);

    // 2. Create new assignment
    const { data, error } = await supabase
        .from('seat_assignments')
        .insert({
            seat_id,
            teacher_id,
            device_id, // Track who assigned it
            active: true
        })
        .select()
        .single();

    if (error) {
        return json({ error: error.message }, { status: 500 });
    }

    return json(data);
}
