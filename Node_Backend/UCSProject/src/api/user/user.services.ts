import { Request, Response } from 'express';
import  {fetchDocumentsFromDB, getUserDetailbyID} from '../../Models/userModel'; 

export async function getdocuments(req: Request, res: Response) {
    try {
        // Assuming you have a function to fetch documents from the database
        const documents = await fetchDocumentsFromDB(); 
        return res.status(200).json({ documents })
    } catch (err) {
        console.error('[Get Documents Error]', err);
        return res.status(500).json({ error: 'Failed to fetch documents' });
    }
}

export async function getuserDetails(req: Request, res: Response) {
    try{
        const user = req.user; // Assuming user details are stored in req.user
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized access' });
        }
        //@ts-ignore
        const userDetails = await getUserDetailbyID(user.id);
        return res.status(200).json({ userDetails });
    } catch (err) {
        console.error('[Get User Details Error]', err);
        return res.status(500).json({ error: 'Failed to fetch user details' });
    }
}