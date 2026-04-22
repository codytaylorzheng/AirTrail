import type { PageServerLoad, Actions } from './$types';
import { trpcServer } from '$lib/server/server';
import { fail } from '@sveltejs/kit';
import { db as database } from "$lib/db";
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const load: PageServerLoad = async (event) => {
    // Standard AirTrail load logic
    await trpcServer.airline.list.ssr(event); 
};

export const actions: Actions = {
    uploadLogo: async ({ request }) => {
        const formData = await request.formData();
        const file = formData.get('logo') as File;
        const airlineIcao = formData.get('icao') as string;

        // 1. Basic Validation
        if (!file || file.size === 0) {
            return fail(400, { error: 'No file provided' });
        }

        if (!airlineIcao) {
            return fail(400, { error: 'Missing airline ICAO code' });
        }

        // 2. Initialize Supabase
        // Note: Ensure Render has PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
        const supabaseUrl = PUBLIC_SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error("CRITICAL: Supabase environment variables are missing!");
            return fail(500, { error: 'Server configuration error' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 3. Perform Upload
        // We use .png for consistency, or match file.type if preferred
        const filePath = `logos/${airlineIcao.toUpperCase()}.png`;
        
        const { data, error: uploadError } = await supabase.storage
            .from('airline-logos')
            .upload(filePath, file, { 
                upsert: true, 
                contentType: file.type 
            });

        if (uploadError) {
            console.error('Supabase Storage Error:', uploadError.message);
            return fail(500, { error: `Upload failed: ${uploadError.message}` });
        }

        // 4. Get the Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('airline-logos')
            .getPublicUrl(filePath);

        // 5. Update your local database (Kysely)
        try {
            await database
                .updateTable('airline')
                .set({ icon_path: publicUrl }) 
                .where('icao', '=', airlineIcao)
                .execute();
            
            return { success: true, url: publicUrl };
        } catch (dbError) {
            console.error('Database Update Error:', dbError);
            return fail(500, { error: 'Database update failed' });
        }
    }
};