import { promisifyAll } from 'bluebird'
import uuid from 'uuid';
import { OAuth2 } from 'oauth';
import Twitter from 'twitter';
import jwt from 'jsonwebtoken'
import { load as configLoader } from '../config/config'

promisifyAll(jwt);
const config = configLoader();
const secret = config.secret
export default class OAuthInterface{
	constructor(init){
		this.oa2 = new OAuth2(
			init.clientId,
			init.secret,
			'',
			init.authURL,
			init.accessTokenURL,
			init.customHeaders || null
		);
		this.callbackURL = `${config.host}/v2/importAuth/${init.service}/return`,
		this.verifyURL = init.verifyURL; 
		this.cookieName = `import_${init.service}Auth`;
		this.scope = init.scope;
		this.chkScope = init.chkScope;
	}
	async auth(req, res){
		const that = this;
		try{
			const stateId = uuid.v4();
			res.setHeader('Access-Control-Allow-Credentials',true);
			res.set('Access-Control-Allow-Origin', req.headers.origin);
			if(req.method == 'OPTIONS') return res.end();
			const authURL = that.oa2.getAuthorizeUrl({
				'redirect_uri': that.callbackURL,
				'scope': that.scope,
				'state': stateId
			});
			const dataToken = jwt.sign({ 
				'userId': req.user.id,
				'state': stateId, 
				'referer': req.headers.referer
			}, secret);

			res.cookie(that.cookieName,dataToken);
			res.jsonp({authURL});
		}catch(e){ res.status(403).jsonp(e);}

	}
	async callback(req, res){
		const that = this;
	//	try {
			let decoded;
			const clientAuth = await new Promise( async (resolve, reject) =>{
				res.clearCookie(that.cookieName);
				try{
					decoded = await jwt.verifyAsync(
						req.cookies[that.cookieName], 
						secret
					);
				}catch(e){ return  reject({'error':e.message});};
				if (decoded.state != req.query.state) 
					return reject({'error':'Broken session'});
				that.oa2.getOAuthAccessToken(
					req.query.code, 
					{ 'redirect_uri': this.callbackURL,
						'grant_type': 'authorization_code' },
					( error, accessToken, refreshToken, params) =>{
						if(error)  return reject({error});
						resolve({ accessToken, refreshToken });
					}
				);
			});
			await new Promise( (resolve, reject) =>{
				that.oa2.get(that.verifyURL,
					clientAuth.accessToken,
					(error, resp)=>{
						if(error)  return reject({'error':error});
						if(typeof that.chkScope === 'function')
							return that.chkScope(resp, resolve, reject);
						resolve(resp);
					}
				);
			});
			res.redirect(decoded.referer);
	//	}catch(e){ res.status(403).jsonp(e);}
	}


}
