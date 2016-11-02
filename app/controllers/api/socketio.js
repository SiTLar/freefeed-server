import { dbAdapter, LikeSerializer, PostSerializer, PubsubCommentSerializer } from '../../models'
import jwt from 'jsonwebtoken'
import PostsController from '../../controllers'
import { load as configLoader } from '../config/config'
const config = configLoader();
promisifyAll(jwt);

class MimicExpressRes{
	function status(code){
		this.status = code;
		return this;
	}

	function jsonp(data){
		this.data = data;
		return this;
	}

	function toString(){
		return JSON.stringify({'status':this.status, 'data':this.data});
	}
}

export default class SocketController {
	static async handle(reqName, payload) {
		var req = {};
		try{
			payload = JSON.parse(payload);
			req.body = payload.body;
			if (payload.authToken) {
				try {
					const decoded = await jwt.verifyAsync(payload.authToken, config.secret);
					const user = await dbAdapter.getUserById(decoded.userId);

					if (user) {
						req.user = user;
					}
				} catch (e) {
					app.logger.info(`invalid token. the user will be treated as anonymous: ${e.message}`);
				}
			}
		}	
		return this[reqName](req);
	}
	
	static async createPost(req) {
		var res = new MimicExpressRes();
		await PostsController.create(req, res);
		return res.toString();
	}
}
