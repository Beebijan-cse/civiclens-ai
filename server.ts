import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  createComplaint,
  getComplaintByTicketId,
  getDashboardStats,
  getRecentTicketsForDuplicateCheck,
  listComplaints,
  updateComplaint,
} from './server/db.ts';
import { analyzeComplaintWithGemini } from './server/gemini.ts';
import {
  MUNICIPAL_DEPARTMENTS,
  TICKET_STATUSES,
  type MunicipalDepartment,
  type TicketStatus,
} from './src/types.ts';

const PORT = 3000;
const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_IMAGE_MIMES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

function parseAndSaveUploadedImage(
  imageBase64: string,
  mimeType: string
): { cleanBase64: string; mimeType: string; imageUrl: string; filePath: string } {
  const normalizedMime = mimeType.toLowerCase().trim();
  const ext = ALLOWED_IMAGE_MIMES[normalizedMime];
  if (!ext) {
    throw new Error('Unsupported image format. Please upload a JPEG, PNG, or WebP photograph.');
  }

  const stripped = imageBase64.includes(',')
    ? imageBase64.slice(imageBase64.indexOf(',') + 1).trim()
    : imageBase64.trim();

  if (!/^[A-Za-z0-9+/=\s]+$/.test(stripped)) {
    throw new Error('Invalid image encoding.');
  }

  const buffer = Buffer.from(stripped, 'base64');
  if (buffer.length === 0) {
    throw new Error('Uploaded image file is empty.');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Uploaded image exceeds the 5 MB size limit.');
  }
  if (!hasValidImageSignature(buffer, normalizedMime)) {
    throw new Error('Uploaded file bytes do not match a valid JPEG, PNG, or WebP image.');
  }

  const fileName = `${crypto.randomUUID()}.${ext}`;
  const targetPath = path.resolve(UPLOADS_DIR, fileName);

  if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
    throw new Error('Invalid upload destination path.');
  }

  fs.writeFileSync(targetPath, buffer);

  return {
    cleanBase64: buffer.toString('base64'),
    mimeType: normalizedMime,
    imageUrl: `/api/uploads/${fileName}`,
    filePath: targetPath,
  };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'civiclens-api', timestamp: new Date().toISOString() });
  });

  app.get('/api/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(filename)) {
      res.status(400).json({ error: 'Invalid filename.' });
      return;
    }

    const resolved = path.resolve(UPLOADS_DIR, filename);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Image not found.' });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(resolved);
  });

  app.get('/api/stats', (_req, res) => {
    try {
      const stats = getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to load dashboard statistics.' });
    }
  });

  app.get('/api/complaints', (req, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 200) : undefined;
      const severity = typeof req.query.severity === 'string' ? req.query.severity : undefined;
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const department =
        typeof req.query.department === 'string' ? req.query.department : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;

      const complaints = listComplaints({ search, severity, category, department, status });
      res.json({ complaints });
    } catch (error) {
      console.error('Error listing complaints:', error);
      res.status(500).json({ error: 'Failed to load complaints.' });
    }
  });

  app.get('/api/complaints/:ticketId', (req, res) => {
    try {
      const ticketId = req.params.ticketId.trim();
      if (!/^CL-\d{4}-\d{4,}$/i.test(ticketId)) {
        res.status(400).json({ error: 'Invalid ticket ID format.' });
        return;
      }

      const ticket = getComplaintByTicketId(ticketId.toUpperCase());
      if (!ticket) {
        res.status(404).json({ error: `Ticket ${ticketId} was not found.` });
        return;
      }

      res.json({ complaint: ticket });
    } catch (error) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({ error: 'Failed to load ticket details.' });
    }
  });

  app.post('/api/complaints', async (req, res) => {
    let savedImage: {
      cleanBase64: string;
      mimeType: string;
      imageUrl: string;
      filePath: string;
    } | null = null;

    try {
      const body = req.body as Record<string, unknown>;
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      const location = typeof body.location === 'string' ? body.location.trim().slice(0, 300) : '';
      const languageHint =
        typeof body.languageHint === 'string' ? body.languageHint.trim().slice(0, 60) : undefined;
      const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : null;
      const imageMimeType = typeof body.imageMimeType === 'string' ? body.imageMimeType : null;

      if (!description && !imageBase64) {
        res.status(400).json({
          error: 'Please provide a complaint description, a photograph of the issue, or both.',
        });
        return;
      }

      if (description.length > 4000) {
        res.status(400).json({
          error: 'Complaint description must be 4,000 characters or fewer.',
        });
        return;
      }

      if (imageBase64) {
        if (!imageMimeType) {
          res.status(400).json({ error: 'Image MIME type is required when uploading a photo.' });
          return;
        }
        try {
          savedImage = parseAndSaveUploadedImage(imageBase64, imageMimeType);
        } catch (imgErr) {
          res.status(400).json({
            error: imgErr instanceof Error ? imgErr.message : 'Invalid uploaded image.',
          });
          return;
        }
      }

      const existingTickets = getRecentTicketsForDuplicateCheck(30);

      const analysis = await analyzeComplaintWithGemini({
        description,
        location,
        languageHint,
        imageBase64: savedImage?.cleanBase64 ?? null,
        imageMimeType: savedImage?.mimeType ?? null,
        existingTickets,
      });

      const created = createComplaint({
        original_description:
          description || '(Image-only citizen submission — see attached photograph)',
        location,
        image_url: savedImage?.imageUrl ?? null,
        complaint_summary: analysis.complaint_summary,
        detected_language: analysis.detected_language,
        category: analysis.category,
        severity: analysis.severity,
        severity_reason: analysis.severity_reason,
        risk_factors: analysis.risk_factors,
        visual_observations: analysis.visual_observations,
        department: analysis.department,
        recommended_action: analysis.recommended_action,
        duplicate_candidates: analysis.duplicate_candidates,
        confidence: analysis.confidence,
        uncertainty_note: analysis.uncertainty_note,
      });

      res.status(201).json({ complaint: created });
    } catch (error) {
      if (savedImage && fs.existsSync(savedImage.filePath)) {
        try {
          fs.unlinkSync(savedImage.filePath);
        } catch {
          // Ignore cleanup failure
        }
      }

      console.error('Error creating complaint:', error);
      const message =
        error instanceof Error ? error.message : 'Unable to complete AI complaint analysis.';

      if (
        message.includes('API_KEY_INVALID') ||
        message.includes('PERMISSION_DENIED') ||
        message.includes('GEMINI_API_KEY')
      ) {
        res.status(503).json({
          error:
            'Gemini AI analysis is unavailable because the server API key is missing or invalid. Check Settings > Secrets.',
        });
        return;
      }

      if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
        res.status(429).json({
          error: 'AI analysis quota was temporarily exceeded. Please wait a moment and try again.',
        });
        return;
      }

      if (message.includes('503') || message.includes('UNAVAILABLE')) {
        res.status(503).json({
          error:
            'The Gemini AI service is experiencing temporary high demand. Please retry your submission in a few seconds.',
        });
        return;
      }

      res.status(502).json({
        error: `AI analysis could not be completed: ${message}`,
      });
    }
  });

  app.patch('/api/complaints/:ticketId', (req, res) => {
    try {
      const ticketId = req.params.ticketId.trim().toUpperCase();
      if (!/^CL-\d{4}-\d{4,}$/.test(ticketId)) {
        res.status(400).json({ error: 'Invalid ticket ID format.' });
        return;
      }

      const body = req.body as Record<string, unknown>;
      const status = typeof body.status === 'string' ? body.status.trim() : undefined;
      const department = typeof body.department === 'string' ? body.department.trim() : undefined;
      const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : undefined;
      const actor = typeof body.actor === 'string' ? body.actor.trim().slice(0, 100) : undefined;

      if (status && !TICKET_STATUSES.includes(status as TicketStatus)) {
        res.status(400).json({ error: `Invalid ticket status: ${status}` });
        return;
      }

      if (department && !MUNICIPAL_DEPARTMENTS.includes(department as MunicipalDepartment)) {
        res.status(400).json({ error: `Invalid municipal department: ${department}` });
        return;
      }

      if (!status && !department && !note) {
        res.status(400).json({
          error: 'Provide a status update, department reassignment, or officer note.',
        });
        return;
      }

      const updated = updateComplaint(ticketId, {
        status: status as TicketStatus | undefined,
        department: department as MunicipalDepartment | undefined,
        note,
        actor,
      });

      if (!updated) {
        res.status(404).json({ error: `Ticket ${ticketId} was not found.` });
        return;
      }

      res.json({ complaint: updated });
    } catch (error) {
      console.error('Error updating complaint:', error);
      res.status(500).json({ error: 'Failed to update complaint record.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CivicLens server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting CivicLens server:', err);
  process.exit(1);
});
