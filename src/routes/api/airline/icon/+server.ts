import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  uploadManager,
} from '$lib/server/utils/uploads';

export const POST: RequestHandler = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) return json({ error: 'Not logged in' }, { status: 401 });
  if (user.role === 'user') return json({ error: 'Unauthorized' }, { status: 403 });

  // Ensure manager is initialized
  if (!uploadManager.isReady) {
    await uploadManager.init(); 
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const airlineId = formData.get('airlineId') as string | null;

  if (!file || !airlineId) {
    return json({ error: 'Missing file or airlineId' }, { status: 400 });
  }

  const airlineIdNum = parseInt(airlineId, 10);
  const typeIndex = ALLOWED_IMAGE_TYPES.indexOf(file.type);
  
  if (typeIndex === -1) {
    return json({ error: 'Invalid file type' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return json({ error: 'File too large' }, { status: 400 });
  }

  const ext = ALLOWED_IMAGE_EXTENSIONS[typeIndex];
  const relativePath = `airlines/${airlineId}${ext}`;

  // Database check
  const existingAirline = await db
    .selectFrom('airline')
    .select(['iconPath'])
    .where('id', '=', airlineIdNum)
    .executeTakeFirst();

  if (existingAirline?.iconPath) {
    await uploadManager.deleteFile(existingAirline.iconPath);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const success = await uploadManager.saveFile(relativePath, buffer);

  if (!success) return json({ error: 'Failed to save file' }, { status: 500 });

  await db
    .updateTable('airline')
    .set({ iconPath: relativePath })
    .where('id', '=', airlineIdNum)
    .execute();

  return json({ success: true, path: relativePath });
};

// ... DELETE handler remains the same