import type { PageServerLoad, Actions } from './$types';
import { trpcServer } from '$lib/server/server';
import { fail } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase'; 
import { database } from '$lib/server/db'; 

export const load: PageServerLoad = async (event) => {
  await trpcServer.flight.list.ssr({ scope: 'mine' }, event);
};

export const actions: Actions = {
  uploadLogo: async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('logo') as File;
    const airlineIcao = formData.get('icao') as string;

    if (!file || file.size === 0) {
      return fail(400, { error: 'No file selected' });
    }

    // 1. Upload to Supabase Storage
    // We name the file using the ICAO (e.g., EMC.png)
    const filePath = `logos/${airlineIcao}.png`;
    
    const { data, error: uploadError } = await supabase.storage
      .from('airline-logos')
      .upload(filePath, file, {
        upsert: true, // Overwrites if you upload a new version
        contentType: file.type
      });

    if (uploadError) {
      console.error('Upload Error:', uploadError);
      return fail(500, { error: 'Storage upload failed' });
    }

    // 2. Get the Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('airline-logos')
      .getPublicUrl(filePath);

    // 3. Update the 'icon_path' column in your DB
    await database
      .updateTable('airline')
      .set({ icon_path: publicUrl }) 
      .where('icao', '=', airlineIcao)
      .execute();

    return { success: true, url: publicUrl };
  }
};