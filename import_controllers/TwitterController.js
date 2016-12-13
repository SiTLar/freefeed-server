import util from 'util';
import { promisifyAll } from 'bluebird'
import Twitter from 'twitter';
import { load as configLoader } from '../config/config';
import OAuth from './OAuth1Controller';

const config = configLoader();
const secret = config.secret

export default class TwitterController{
	static async load(params){
		const comm = new DataInterface(params);
		const tweets = await comm.getTweetsSince(params.lastid);
		return tweets.map((tweet)=>{
			const media = tweet.entities.media || [];
			return {
				'body':`${tweet.text} Read on Twitter: https://twitter.com/statuses/${tweet.id}`
				,'attachments': media.map((medium)=>{
					return medium.media_url_https;
				})
			};
		});
	}
	static auth(){
		const oa = new OAuth({
			'servece': 'twitter',
			'key': config.import.twitter.key,
			'secret': config.import.twitter.secret,
			'reqURL': 'https://api.twitter.com/oauth/request_token',
			'accessURL': 'https://api.twitter.com/oauth/access_token',
			'authURL': 'https://twitter.com/oauth/authenticate?oauth_token=', 
			'verifyURL': 'https://api.twitter.com/1.1/account/verify_credentials.json',
		});
		return {
			'auth': async function (){return oa.auth.apply(oa, arguments); },
			'callback': async function () { return await oa.callback.apply(oa, arguments); }
		}
	}
}
class DataInterface{
	constructor(data){
		this.credentials = data.credentials;
		this.userid = data.userid;
		this.client = new Twitter({
			'consumer_key': config.import.twitter.key,
			'consumer_secret': config.import.twitter.secret, 
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
