import express from 'express';
import { handleUserQuery } from './user.controller';
import { UserAuthenticate } from '../../middlewares/auth.middleware';
import { getdocuments, getuserDetails } from './user.services';

const UserRouter = express.Router();
//@ts-ignore
UserRouter.post('/query', [UserAuthenticate], handleUserQuery);
//@ts-ignore
UserRouter.get('/documents', getdocuments);
//@ts-ignore
UserRouter.get('/profile',[UserAuthenticate], getuserDetails);

export default UserRouter;