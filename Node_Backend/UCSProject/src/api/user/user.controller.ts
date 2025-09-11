import axios from 'axios';
import { Request, Response } from 'express';
import { saveChatRecord, saveUnansweredQuery } from '../../Models/userModel';

export async function handleUserQuery(req: Request, res: Response) {
  try {
    const { query, doc_id } = req.body;
    const user = req.user;

    if (!query || !doc_id || !Array.isArray(doc_id)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const response = await axios.post('http://localhost:8000/query', {
      query,
      doc_id,
    });

    // console.log('Full response:', response);
    // console.log('Response data:', response.data);

    const data = response.data as {
      status?: string;
      message?: string;
      answer?: string;
      language?: string;
    };
    let answer = '';
    let language = 'unknown';

    // Check if this is an error response with a fallback message
    if (data.status === 'error' && typeof data.message === 'string') {
      const fallbackMatch = data.message.match(/\[\s*"(.+?)"\s*\]/);
      if (fallbackMatch && fallbackMatch[1]) {
        answer = fallbackMatch[1].trim();
      } else {
        answer = "Sorry, something went wrong.";
      }
    } else {
      // Normal structured response
      answer = data.answer ?? '';
      language = data.language ?? 'unknown';
    }

    //console.log('Normalized Answer:', answer);

    // Check if the answer matches the fallback message
    if (answer === "No context found for your query, please rephrase or upload more documents.") {
      console.log("Fallback detected – saving unanswered query");
      const unanswered_queries = {
        query: query,
        //@ts-ignore
        user_id: user.id,
        language: language
      };

      // Store unanswered query for admin intervention
      await saveUnansweredQuery(unanswered_queries);
      console.log("Sending fallback response to user");


      return res.json({
         results: "Your query has been received but I couldn't find a suitable answer. Our team will get back to you soon."
          });
    }

    // Save normal chat record
    const chatRecord = {
      //@ts-ignore
      user_id: user.id,
      doc_id: doc_id,
      query: query,
      response: JSON.stringify(answer),
      language: language,
    };

    await saveChatRecord(chatRecord.user_id, chatRecord.doc_id, chatRecord.query, chatRecord.response, chatRecord.language);

    return res.json({ results: answer });

  } catch (err) {
    console.error('[Query Error]', err);
    return res.status(500).json({ error: 'Failed to process query' });
  }
}