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
        console.log('--- Action: uploadLogo triggered ---');
        
        const formData = await request.formData();
        const file = formData.get('logo') as File;
        const airlineIcao = formData.get('icao') as string;

        console.log(`Received: ICAO=${airlineIcao}, File=${file?.name}, Size=${file?.size}`);

        // 1. Validation
        if (!file || file.size === 0) {
            console.error('Validation failed: No file');
            return fail(400, { error: 'No file provided' });
        }

        if (!airlineIcao) {
            console.error('Validation failed: No ICAO');
            return fail(400, { error: 'Airline ICAO is required' });
        }

        // 2. Initialize Supabase
        const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const fileExt = file.name.split('.').pop() || 'png';
        const filePath = `airline/${airlineIcao}.${fileExt}`;
        
        try {
            // Convert to Buffer for reliable Node.js upload
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            console.log(`Uploading to bucket "airline-logos" at path: ${filePath}`);

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('airline-logos')
                .upload(filePath, buffer, {
                    upsert: true,
                    contentType: file.type || 'image/png'
                });

            if (uploadError) {
                console.error('Supabase Storage Error:', uploadError.message);
                return fail(500, { error: uploadError.message });
            }

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('airline-logos')
                .getPublicUrl(filePath);

            console.log('Upload success. Public URL:', publicUrl);

            // 4. Update Database
            const result = await database
                .updateTable('airline')
                .set({ icon_path: publicUrl }) 
                .where('icao', '=', airlineIcao)
                .executeTakeFirst();

            console.log('Database update result:', result);

            return { success: true, url: publicUrl };

        } catch (err) {
            console.error('Unexpected crash in uploadLogo:', err);
            return fail(500, { error: 'Internal Server Error' });
        }
    }
};