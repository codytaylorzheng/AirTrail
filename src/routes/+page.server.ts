import type { PageServerLoad, Actions } from './$types';
import { trpcServer } from '$lib/server/server';
import { fail } from '@sveltejs/kit';
import { db as database } from "$lib/db";
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const load: PageServerLoad = async (event) => {
    // Keep your existing load logic
    await trpcServer.airline.list.ssr(event); 
    return {
        user: event.locals.user // Ensure user data is passed if needed
    };
};

export const actions: Actions = {
    // This is the new action you are adding
    uploadLogo: async ({ request }) => {
        console.log('--- Action: uploadLogo triggered ---');
        const formData = await request.formData();
        const file = formData.get('logo') as File;
        const airlineIcao = formData.get('icao') as string;

        if (!file || file.size === 0 || !airlineIcao) {
            return fail(400, { error: 'Missing file or ICAO' });
        }

        const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const fileExt = file.name.split('.').pop() || 'png';
        const filePath = `airline/${airlineIcao.toUpperCase()}.${fileExt}`;
        
        try {
            const buffer = Buffer.from(await file.arrayBuffer());
            const { error: uploadError } = await supabase.storage
                .from('airline-logos')
                .upload(filePath, buffer, {
                    upsert: true,
                    contentType: file.type || 'image/png'
                });

            if (uploadError) return fail(500, { error: uploadError.message });

            const { data: { publicUrl } } = supabase.storage
                .from('airline-logos')
                .getPublicUrl(filePath);

            await database
                .updateTable('airline')
                .set({ icon_path: publicUrl }) 
                .where('icao', '=', airlineIcao.toUpperCase())
                .executeTakeFirst();

            return { success: true, url: publicUrl };
        } catch (err) {
            console.error(err);
            return fail(500, { error: 'Server error' });
        }
    }
};