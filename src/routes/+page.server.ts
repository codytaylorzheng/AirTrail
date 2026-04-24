import type { PageServerLoad, Actions } from './$types';
import { trpcServer } from '$lib/server/server';
import { fail } from '@sveltejs/kit';
import { db as database } from "$lib/db";
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const load: PageServerLoad = async (event) => {
    // Keep your TRPC logic for loading the list
    await trpcServer.airline.list.ssr(event); 
};

export const actions: Actions = {
    uploadLogo: async ({ request }) => {
        const formData = await request.formData();
        const file = formData.get('logo') as File;
        const airlineIcao = formData.get('icao') as string;

        // 1. Validation
        if (!file || file.size === 0) {
            return fail(400, { error: 'No file provided' });
        }

        if (!airlineIcao) {
            return fail(400, { error: 'Airline ICAO is required' });
        }

        // 2. Initialize Supabase Client
        // Note: Using the SERVICE_ROLE_KEY bypasses RLS policies. 
        // If this still fails, the bucket name is likely incorrect.
        const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const fileExt = file.name.split('.').pop();
        const filePath = `airline/${airlineIcao}.${fileExt || 'png'}`;
        
        console.log(`Attempting upload to Supabase: ${filePath} (${file.type})`);

        try {
            // 3. Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('airline-logos') // Ensure this bucket ID is exactly 'airline-logos'
                .upload(filePath, await file.arrayBuffer(), {
                    upsert: true, 
                    contentType: file.type || 'image/png' 
                });

            if (uploadError) {
                console.error('Supabase Storage Error:', uploadError.message);
                return fail(500, { error: `Storage Error: ${uploadError.message}` });
            }

            // 4. Get the Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('airline-logos')
                .getPublicUrl(filePath);

            console.log('Upload successful. Public URL:', publicUrl);

            // 5. Update the Database
            const result = await database
                .updateTable('airline')
                .set({ icon_path: publicUrl }) 
                .where('icao', '=', airlineIcao)
                .executeTakeFirst();

            if (!result) {
                console.warn(`Database update failed for ICAO: ${airlineIcao}`);
            }

            return { success: true, url: publicUrl };

        } catch (err) {
            console.error('Unexpected server error during upload:', err);
            return fail(500, { error: 'An unexpected error occurred.' });
        }
    }
};
