import Twitter from 'twitter';

export default class TwitterController{
	constructor(data){
		this.credentials = data.credentials;
		this.userid = data.userid;
		this.client = new Twitter({
			'consumer_key': data.credentials.consumer_key,
			'consumer_secret':data.credentials.consumer_secret,
			'access_token_key': data.credentials.access_token_key,
			'access_token_secret': data.credentials.access_token_secret
		});

	}
	async getTweetsSince(id){
	
	}
}
