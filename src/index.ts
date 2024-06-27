import * as http from 'http';
import jwt from 'jsonwebtoken';


type OnRequest = (req: Request, res: Response)=> void;
type Method = ("GET");
type Response = http.ServerResponse<http.IncomingMessage> & {
    json: (this: Response, status: number, body: any)=> void;
    html: (this: Response, status: number, html: string)=> void;
    setJWT: (this: Response, data: any, expire_time?: number)=> void;
    deleteCookie: (this: Response, name: string)=> void;
}
type Request = http.IncomingMessage & {
    slugs: Record<string, any>;
    cookie: (this: Request, name: string)=> string | void;
}

export default class Server {
    port = 8080;
    server = http.createServer();
    secret = "secret"

    listeners = {
        GET: [] as { raw_url: string, url: (string | { slug: string; })[], onReqs: OnRequest[] }[],
    }

    constructor() {
        this.server.on("request", (req: Request, res: Response)=>{
            req.slugs = {};

            let listener = this.listeners[req.method as Method].find(({ raw_url })=> raw_url == req.url);

            if (!listener) {
                listener = this.listeners[req.method as Method].find(({ url })=>{
                    const req_url = req.url.split("/").filter(s => s).map(s => s.trim());

                    if (url.length != req_url.length) return false;

                    const slugs = {} as Record<string, any>;

                    for (let i = 0; i < url.length; i++) {
                        const path1 = url[i];
                        const path2 = req_url[i];
                        
                        if (typeof path1 == "string" && path1 != path2) return false;

                        if (typeof path1 != "string") {
                            slugs[path1.slug.slice(1)] = path2;
                        }
                    }

                    req.slugs = slugs;

                    return true;
                });
            }

            if (!listener) {
                res.writeHead(500);
                return res.end();
            }

            res.json = function(status: number, object: any) {
                let body = "";

                try {
                    body = JSON.stringify(object);
                } catch {
                    this.writeHead(500);
                    this.end();
                    return;
                }

                this.writeHead(status, { 'Content-Type': 'application/json' });
                res.end(body);
            }

            res.html = function(status: number, html: string) {
                this.writeHead(status, { 'Content-Type': 'text/html' });
                res.end(html);
            }

            res.setJWT = (data: any, expire_time = 60 * 60 * 24 * 7)=>{
                const token = jwt.sign(data, this.secret);
                res.setHeader('Set-Cookie', `jwt=${token}; HttpOnly; Path=/; Max-Age=${expire_time}`);
            }

            res.deleteCookie = function(name: string) {
                res.setHeader('Set-Cookie', `${name}=null; HttpOnly; Path=/; Max-Age=0; Expires=0`);
            }

            req.cookie = function(name: string) {
                if (!req.headers.cookie) return;

                const cookies = req.headers.cookie.split(";");

                for (let i = 0; i < cookies.length; i++) {
                    const [key, ...values] = cookies[i].split("=");
                    if (key == name) return values.join("=");
                }
            }

            for (let i = 0; i < listener.onReqs.length; i++) {
                const request = listener.onReqs[i];
                request(req, res);
                
                if (res.writableEnded) return;
            }

            if (!res.writableEnded) res.end();
        });
    }

    setPort(p: number) {
        this.port = p;
        return this
    }

    setSecret(secret: string) {
        this.secret = secret;
        return this;
    }

    listen(onListen = ()=>{}) {
        this.server.listen(this.port, onListen);
        return this;
    }

    GET(raw_url: string, ...onReqs: OnRequest[]) {
        const url = raw_url.split("/").filter(s => s).map(s => s.trim()).map(s => {
            if (s[0] == ":") return { slug: s }
            return s;
        });

        this.listeners.GET.push({ raw_url, url, onReqs });
    }

    static jwt(func: (decoded: any, req: Request, res: Response)=> any) {
        return function(req: Request, res: Response) {
            const web_token = jwt.decode(req.cookie("jwt") || "");
            func(web_token, req, res);
        }
    }
}
