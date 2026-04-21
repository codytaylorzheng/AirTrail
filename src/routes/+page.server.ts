import type { PageServerLoad, Actions } from './$types';
import { trpcServer } from '$lib/server/server';
import { fail } from '@sveltejs/kit';
import { db as database } from "$lib/db";
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const load: PageServerLoad = async (event) => {
  // Your existing load logic
  await trpcServer.airline.list.ssr(event); 
};

export const actions: Actions = {
  uploadLogo: async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('logo') as File;
    const airlineIcao = formData.get('icao') as string;

    if (!file || file.size === 0) return fail(400, { error: 'No file' });

    // Initialize Supabase on the fly
    const supabase = createClient(
      PUBLIC_SUPABASE_URL, 
      env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const filePath = `logos/${airlineIcao}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('airline-logos')
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) return fail(500, { error: 'Upload failed' });

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