import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { normalizeExtractedInvoice } from './src/utils/invoiceLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
});

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('MISSING_GEMINI_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function extractWithRetry(
  ai: GoogleGenAI,
  base64Data: string,
  mimeType: string,
  attempts = 2
) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text:
                'Analizza questa fattura o ricevuta ed estrai esattamente i campi richiesti in JSON: ' +
                'data, fornitore, numero_documento, imponibile, iva, totale. ' +
                'Se un campo non è presente o non è leggibile nel documento, restituisci null per quel campo.',
            },
          ],
        },
        config: {
          systemInstruction:
            'Sei un sistema di estrazione dati contabili ad alta precisione. ' +
            'Estrai esclusivamente i campi presenti nel documento caricato. ' +
            'Regole: ' +
            '1) "data": formatta come YYYY-MM-DD se deducibile con certezza, altrimenti null. ' +
            '2) "fornitore": ragione sociale o nome completo del fornitore/emittente, altrimenti null. ' +
            '3) "numero_documento": numero fattura o ricevuta, altrimenti null. ' +
            '4) "imponibile": importo imponibile totale (numero), altrimenti null. ' +
            '5) "iva": importo totale dell IVA (numero), altrimenti null. ' +
            '6) "totale": importo totale documento (numero), altrimenti null. ' +
            'Non inventare mai dati mancanti: se un campo manca, restituisci null.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              data: {
                type: Type.STRING,
                nullable: true,
                description: 'Data di emissione della fattura (YYYY-MM-DD) oppure null se mancante.',
              },
              fornitore: {
                type: Type.STRING,
                nullable: true,
                description: 'Nome o ragione sociale del fornitore oppure null se mancante.',
              },
              numero_documento: {
                type: Type.STRING,
                nullable: true,
                description: 'Numero del documento o fattura oppure null se mancante.',
              },
              imponibile: {
                type: Type.NUMBER,
                nullable: true,
                description: 'Totale imponibile netto oppure null se mancante.',
              },
              iva: {
                type: Type.NUMBER,
                nullable: true,
                description: 'Totale imposta IVA oppure null se mancante.',
              },
              totale: {
                type: Type.NUMBER,
                nullable: true,
                description: 'Totale complessivo da pagare oppure null se mancante.',
              },
            },
            required: ['data', 'fornitore', 'numero_documento', 'imponibile', 'iva', 'totale'],
          },
        },
      });
      return response;
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/extract-invoice', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Nessun file ricevuto.' });
        return;
      }

      const rawMime = file.mimetype.toLowerCase();
      if (!ALLOWED_MIMES.has(rawMime)) {
        res.status(400).json({
          error: 'Formato non supportato. Carica un file JPG, PNG o PDF.',
        });
        return;
      }

      const normalizedMime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
      const base64Data = file.buffer.toString('base64');

      const ai = getGeminiClient();
      const response = await extractWithRetry(ai, base64Data, normalizedMime);

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          error: 'Risposta vuota dal servizio di estrazione.',
        });
        return;
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        res.status(502).json({
          error: 'Formato JSON non valido restituito dal modello.',
        });
        return;
      }

      const fields = normalizeExtractedInvoice(parsedJson);
      res.json({
        fileName: file.originalname,
        mimeType: normalizedMime,
        fields,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'MISSING_GEMINI_API_KEY') {
        res.status(500).json({
          error:
            'Chiave API Gemini non configurata sul server. Verifica le impostazioni Secrets.',
        });
        return;
      }
      if (message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')) {
        res.status(403).json({
          error:
            'Chiave API Gemini non valida o priva di permessi. Controlla Settings > Secrets.',
        });
        return;
      }
      if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
        res.status(429).json({
          error: 'Quota API temporaneamente esaurita. Riprova tra qualche istante.',
        });
        return;
      }

      console.error('Errore estrazione fattura:', err);
      res.status(500).json({
        error: 'Errore durante l’analisi della fattura. Riprova.',
      });
    }
  });

  // Handle multer file size or upload errors cleanly as JSON
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            error: 'Il file supera la dimensione massima consentita di 15 MB.',
          });
          return;
        }
        res.status(400).json({ error: `Errore caricamento file: ${err.message}` });
        return;
      }
      next(err);
    }
  );

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output non trovato.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`InvoiceLens server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
