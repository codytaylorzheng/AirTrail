import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { db as database } from "$lib/db";

export const actions = {
    uploadLogo: async ({ request }) => {
        const formData = await request.formData();
        const file = formData.get('logo') as File;
        const icao = formData.get('icao') as string;

        if (!file || !icao) return fail(400, { error: 'Missing file or ICAO' });

        // 1. Find the Airline ID from your database first
        const airline = await database
            .selectFrom('airline')
            .select('id')
            .where('icao', '=', icao.toUpperCase().trim())
            .executeTakeFirst();

        if (!airline) {
            return fail(404, { error: `Airline ${icao} not found in database.` });
        }

        const airlineId = airline.id; // This is your "123"
        const fileExt = file.type === 'image/svg+xml' ? 'svg' : 'png';
        
        // 2. Build the path EXACTLY as Supabase AI suggested
        // Path: airline-logos/airlines/123.svg
        // Note: The bucket name is 'airline-logos', so the path starts after that.
        const filePath = `airlines/${airlineId}.${fileExt}`;

        const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        try {
            const buffer = Buffer.from(await file.arrayBuffer());

            // 3. Perform the Upload
            const { error: uploadError } = await supabase.storage
                .from('airline-logos')
                .upload(filePath, buffer, {
                    upsert: true,
                    contentType: file.type
                });

            if (uploadError) throw uploadError;

            // 4. Construct the URL manually to match the endpoint format
            const publicUrl = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/airline-logos/${filePath}`;

            // 5. Update the airline record with this new URL
            await database
                .updateTable('airline')
                .set({ icon_path: publicUrl })
                .where('id', '=', airlineId)
                .executeTakeFirst();

            return { success: true, url: publicUrl };
        } catch (e: any) {
            console.error('Upload Error:', e.message);
            return fail(500, { error: e.message });
        }
    }
};