import axios from 'axios';
import { Request, Response } from 'express';
import { saveChatRecord } from '../../Models/userModel';

export async function handleUserQuery(req: Request, res: Response) {
  try {
    const { query, doc_id } = req.body;
    const  user  = req.user ;

    if (!query || !doc_id || !Array.isArray(doc_id)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const response = await axios.post('http://localhost:8000/query', {
      query,
      doc_id : doc_id,
    });
    const  chatRecord = {
      //@ts-ignore
      user_id: user.id,
      doc_id: doc_id,
      query: query,
      response: (response.data as { answer: string }).answer,
      language: (response.data as { language: string }).language,
    };

    await saveChatRecord(chatRecord.user_id, chatRecord.doc_id, chatRecord.query, JSON.stringify(chatRecord.response), chatRecord.language);

    return res.json({ results: response.data });
  } catch (err) {
    console.error('[Query Error]', err);
    return res.status(500).json({ error : 'Failed to process query' });
  }
}
