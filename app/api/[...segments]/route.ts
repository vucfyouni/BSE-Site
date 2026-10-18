import {env} from 'cloudflare:workers';
import {handleAPI} from '../../../server/portal.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleAPI(request,env);}
export async function POST(request:Request){return handleAPI(request,env);}
