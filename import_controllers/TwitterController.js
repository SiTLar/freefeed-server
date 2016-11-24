import Twitter from 'twitter';
import { promisifyAll } from 'bluebird';
import util from 'util';
export default async function(params){
	const controller = new TwitterController(params);
	const tweets = await controller.getTweetsSince(params.lastid);
	return tweets.map((tweet)=>{
		const media = tweet.entities.media || [];
		return {
			'body':tweet.text
			,'attachments': media.map((medium)=>{
				return medium.media_url_https;
			})
		};
	});

}

class TwitterController{
	constructor(data){
		this.credentials = data.credentials;
		this.userid = data.userid;
		this.client = new Twitter({
			'consumer_key': "2okE6x7IX64WAB6xzwn3bgNnC",
			'consumer_secret': "suODU3lk2M14HUZsEj7SbvfNFI6Pfq9PqfBGHaexVrhFFGWAzx",
			'access_token_key': data.credentials.access_token_key,
			'access_token_secret': data.credentials.access_token_secret
		});

	}
	async getTweetsSince(id){
		const res = await new Promise((resolve,reject)=>{
			this.client.get(
				'statuses/user_timeline',
				{
					'user_id': this.userid,
					'since_id': id,
					'exclude_replies':true,
					'include_rts':false,
					'trim_user': true
				}
			,(err,res,raw)=>{
				if(err) reject(err);
				else resolve(res);
			});
		});
		return res;
	}
}
