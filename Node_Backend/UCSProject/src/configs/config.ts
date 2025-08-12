import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  Db_connection: string;
  api_resend:String;
  JWT_SECRET:string;
  Session_secret:string;
  JWT_ADMIN_SECRET:string;
}

const config: Config = {
  port: Number(process.env.PORT) ,
  Db_connection: String(process.env.Db_connection),
  api_resend: String(process.env.api_resend),
  JWT_SECRET: String(process.env.JWT_SECRET),
  Session_secret: String(process.env.Session_secret),
  JWT_ADMIN_SECRET: String(process.env.JWT_ADMIN_SECRET),
};

export default config; 