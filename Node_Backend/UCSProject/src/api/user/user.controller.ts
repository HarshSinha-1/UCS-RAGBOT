import axios from 'axios';
import { Request, Response } from 'express';

export async function handleUserQuery(req: Request, res: Response) {
  try {
    const { query, doc_id } = req.body;

    if (!query || !doc_id || !Array.isArray(doc_id)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const response = await axios.post('http://localhost:8000/query', {
      query,
      doc_id : doc_id,
    });

    return res.json({ results: response.data });
  } catch (err) {
    console.error('[Query Error]', err);
    return res.status(500).json({ error : 'Failed to process query' });
  }
}
