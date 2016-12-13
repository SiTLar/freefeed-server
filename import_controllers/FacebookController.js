import { promisifyAll } from 'bluebird'
import FB from 'fb';
import OAuth2 from './OAuth2Controller';
import { load as configLoader } from '../config/config';

const config = configLoader();
const secret = config.secret

export default class FacebookController{
	static async load (params){
		const controller = new FacebookController(params);
		const posts = await controller.getPostsSince(params.lastid);
		return posts.data.map((post)=>{
			const attachments = (post.attachments && post.attachments.data)
				? post.attachments.data : [];
			const id = post.id.split('_');
			return {'body': `${post.message}\n Read on Facebook: https://www.facebook.com/${id[0]}/posts/${id[1]}`,
				'attachments': attachments.reduce(convert,[]).filter(Boolean)
			}
				
			function convert(acc, attachment){
				const head = (attachment.subattachments && attachment.subattachments.data)
					? attachment.subattachments.data.reduce(convert,[]):[];
				if(attachment.type != 'photo') return head;
				return acc.concat(head, attachment.media.image.src);
			};
			
		}).reverse();
	}

	static auth (){
		const oa2 = new OAuth2({
			'service': 'facebook',
			'clientId': config.import.facebook.clientId,
			'secret': config.import.facebook.secret,
			'authURL': 'https://www.facebook.com/dialog/oauth',
			'accessTokenURL': 'https://graph.facebook.com/oauth/access_token',
			'verifyURL': 'https://graph.facebook.com/v2.8/me/permissions',
			'scope': 'user_posts,user_photos',
			'chkScope': (resp, resolve, reject) => {
				try{
					const permissions = JSON.parse(resp).data.map((item) => {
						return (item.status == "granted") ? item.permission:null;
					}).filter(Boolean);
					if( (permissions.indexOf('user_posts') == -1) 
						|| (permissions.indexOf('user_photos') == -1)
					) return reject('Not enough permissions');
					resolve('OK');
				}catch(e){reject(e)};
			}
		});
		return {
			'auth': async function (){ return oa2.auth.apply(oa2, arguments); },
			'callback': function (){ return oa2.callback.apply(oa2, arguments); }
		}
	}
}
class DataInterface{
	constructor(data){
		this.credentials = data.credentials;
		this.userid = data.userid;
		this.client = FB.extend({
			appId      : '1790435654561398',
			appSecret  : '2d82bd18687e15291340b89cd8c298d9',
			status     : true,
			xfbml      : true,
			version    : 'v2.8' // or v2.6, v2.5, v2.4, v2.3
		});
	}
	async getPostsSince(id){
		const res = await new Promise((resolve,reject)=>{
			//this.client.get(this.userid + '/posts','get', { 
			this.client.api('me/posts', { 
				'fields': ['message', 'attachments', 'created_time'],
				'since': id,
				'access_token': this.credentials.access_token_key

			},(res)=>{
				if(!res || res.error) reject(res.error);
				else resolve(res);
			});
		});
		return res;
	}

}

