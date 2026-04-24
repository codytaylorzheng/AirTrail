import type { PageServerLoad, Actions } from './$types';
import { trpcServer } from '$lib/server/server';
import { fail } from '@sveltejs/kit';
import { db as database } from "$lib/db";
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const load: PageServerLoad = async (event) => {
    await trpcServer.airline.list.ssr(event); 
};

export const actions: Actions = {
    uploadLogo: async ({ request }) => {
        const formData = await request.formData();
        const file = formData.get('logo') as File;
        const airlineIcao = formData.get('icao') as string;

        if (!file || file.size === 0) return fail(400, { error: 'No file' });

        // IMPORTANT: Initialize INSIDE the action so it doesn't crash the build
        const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const filePath = `airline/${airlineIcao}.png`;
        
        const { error: uploadError } = await supabase.storage
            .from('airline-logos')
            .upload(filePath, await file.arrayBuffer(), { // Added await file.arrayBuffer()
                upsert: true, 
                contentType: file.type 
            });

        if (uploadError) {
            console.error('Upload Error:', uploadError.message);
            return fail(500, { error: uploadError.message });
        }

        const { data: { publicUrl } } = supabase.storage
            .from('airline-logos')
            .getPublicUrl(filePath);

        await database
            .updateTable('airline')
            .set({ icon_path: publicUrl }) 
            .where('icao', '=', airlineIcao)
            .execute();

        return { success: true };
    }
};