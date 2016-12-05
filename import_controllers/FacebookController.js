import FB from 'fb';
export default async function(params){
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
class FacebookController{
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

