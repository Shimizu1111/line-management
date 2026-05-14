import { Hono } from 'hono';
import {
  getEntryRoutes,
  createEntryRoute,
  updateEntryRoute,
  deleteEntryRoute,
} from '@line-crm/db';
import type { EntryRoute } from '@line-crm/db';
import type { Env } from '../index.js';

const entryRoutes = new Hono<Env>();

function serializeEntryRoute(row: EntryRoute) {
  return {
    id: row.id,
    refCode: row.ref_code,
    name: row.name,
    tagId: row.tag_id,
    scenarioId: row.scenario_id,
    redirectUrl: row.redirect_url,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/entry-routes — list all
entryRoutes.get('/api/entry-routes', async (c) => {
  try {
    const items = await getEntryRoutes(c.env.DB);
    return c.json({ success: true, data: items.map(serializeEntryRoute) });
  } catch (err) {
    console.error('GET /api/entry-routes error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/entry-routes — create
entryRoutes.post('/api/entry-routes', async (c) => {
  try {
    const body = await c.req.json<{
      name: string;
      refCode?: string;
      tagId?: string | null;
      scenarioId?: string | null;
      redirectUrl?: string | null;
    }>();

    if (!body.name) {
      return c.json({ success: false, error: 'name is required' }, 400);
    }

    const refCode = body.refCode || crypto.randomUUID().slice(0, 8);

    const route = await createEntryRoute(c.env.DB, {
      name: body.name,
      refCode,
      tagId: body.tagId ?? null,
      scenarioId: body.scenarioId ?? null,
      redirectUrl: body.redirectUrl ?? null,
    });

    return c.json({ success: true, data: serializeEntryRoute(route) }, 201);
  } catch (err) {
    console.error('POST /api/entry-routes error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// PUT /api/entry-routes/:id — update
entryRoutes.put('/api/entry-routes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<{
      name?: string;
      refCode?: string;
      tagId?: string | null;
      scenarioId?: string | null;
      redirectUrl?: string | null;
      isActive?: boolean;
    }>();

    const route = await updateEntryRoute(c.env.DB, id, body);
    if (!route) {
      return c.json({ success: false, error: 'Entry route not found' }, 404);
    }
    return c.json({ success: true, data: serializeEntryRoute(route) });
  } catch (err) {
    console.error('PUT /api/entry-routes/:id error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// DELETE /api/entry-routes/:id
entryRoutes.delete('/api/entry-routes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await deleteEntryRoute(c.env.DB, id);
    return c.json({ success: true, data: null });
  } catch (err) {
    console.error('DELETE /api/entry-routes/:id error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export { entryRoutes };
