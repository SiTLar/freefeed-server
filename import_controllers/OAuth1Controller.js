import util from 'util';
import { promisifyAll } from 'bluebird';
import { OAuth } from 'oauth';
import jwt from 'jsonwebtoken'
import { load as configLoader } from '../config/config'

promisifyAll(jwt);
const config = configLoader();
const secret = config.secret
export default class OAuthInterface{
	constructor(init){
		this.oa = new OAuth(
			init.reqURL,
			init.accessURL,
			init.key,
			init.secret,
			'1.0',
			`${config.host}/v2/importAuth/${init.service}/return`,
			'HMAC-SHA1'
		);
		this.authURL = init.authURL; 
		this.verifyURL = init.verifyURL; 
		this.cookieName = `import_${init.service}Auth`;
	}
	async auth(req, res){
		const that = this;
		try{
			res.setHeader('Access-Control-Allow-Credentials',true);
			res.set('Access-Control-Allow-Origin', req.headers.origin);
			if(req.method == 'OPTIONS') return res.end();
			const authRes = await new Promise((resolve, reject) =>{
				that.oa.getOAuthRequestToken(
					(error, oAuthToken, oAuthTokenSecret, results)=>{
						if(error) return reject(error);
						if(!req.user) return reject({'error':'not logged in'});
						const dataToken = jwt.sign({ 
							'userId': req.user.id,
							'oauth': oAuthTokenSecret, 
							'referer': req.headers.referer
						}, secret);
						resolve( {
							dataToken, 
							'url':that.authURL + oAuthToken
						});
					}
				);

			});
			res.cookie(that.cookieName,authRes.dataToken);
			res.jsonp({'authURL':authRes.url});
		}catch(e){ res.status(403).jsonp(e); }

	}
	async callback(req, res){
		const that = this;
		let decoded;
		try {
			const clientAuth = await new Promise( async (resolve, reject) =>{
				res.clearCookie(that.cookieName);
				try{
					decoded = await jwt.verifyAsync(
						req.cookies[that.cookieName], 
						secret
					);
				}catch(e){ return  reject({'error':e.message});};
				that.oa.getOAuthAccessToken(
					req.query.oauth_token, 
					decoded.oauth,
					req.query.oauth_verifier,
					( error, token, secret, results) =>{
						if(error)  return reject({'error':error});
						resolve({ token, secret });

					}
				);
			});
			await new Promise( (resolve, reject) =>{
				that.oa.get(that.verifyURL,
					clientAuth.token,
					client.secret,
					(error, resp)=>{
						if(error)  return reject({'error':error});
						resolve(resp);
					}
				);
			});
			res.redirect(decoded.referer);
		}catch(e){ res.status(403).jsonp(e);}
	}


}
