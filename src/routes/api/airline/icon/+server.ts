import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from '$lib/server/utils/uploads';

export const POST: RequestHandler = async ({ locals, request }) => {
  const user = locals.user;
  if (!user || user.role === 'user') return json({ error: 'Unauthorized' }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const airlineIdStr = formData.get('airlineId') as string | null;

  if (!file || !airlineIdStr) return json({ error: 'Missing data' }, { status: 400 });

  const airlineId = parseInt(airlineIdStr, 10);
  const typeIndex = ALLOWED_IMAGE_TYPES.indexOf(file.type);
  if (typeIndex === -1 || file.size > MAX_FILE_SIZE) {
    return json({ error: 'Invalid file or size' }, { status: 400 });
  }

  const supabase = createClient(
    publicEnv.PUBLIC_SUPABASE_URL, 
    privateEnv.SUPABASE_SERVICE_ROLE_KEY
  );

  const ext = ALLOWED_IMAGE_EXTENSIONS[typeIndex];
  const filePath = `airlines/${airlineId}${ext}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('airline-logos')
      .upload(filePath, buffer, {
        upsert: true,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    const publicUrl = `${publicEnv.PUBLIC_SUPABASE_URL}/storage/v1/object/public/airline-logos/${filePath}`;

    await db
      .updateTable('airline')
      .set({ iconPath: publicUrl })
      .where('id', '=', airlineId)
      .execute();

    return json({ success: true, path: publicUrl });
  } catch (err: any) {
    console.error('Supabase Upload Error:', err.message);
    return json({ error: err.message }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
  const user = locals.user;
  if (!user || user.role === 'user') return json({ error: 'Unauthorized' }, { status: 403 });

  const { airlineId } = await request.json();
  const airline = await db.selectFrom('airline').select(['iconPath']).where('id', '=', airlineId).executeTakeFirst();

  if (airline?.iconPath) {
    const supabase = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);
    const pathParts = airline.iconPath.split('/airline-logos/');
    if (pathParts[1]) {
      await supabase.storage.from('airline-logos').remove([pathParts[1]]);
    }
  }

  await db.updateTable('airline').set({ iconPath: null }).where('id', '=', airlineId).execute();
  return json({ success: true });
};