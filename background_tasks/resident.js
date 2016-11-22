import IoClient from 'socket.io-client';
import SIOStream  from 'socket.io-stream';
import uuid from 'uuid';
import process from 'process';
import { reportError } from '../app/support/exceptions'
var adapterFor = (function() {
  var url = require('url'),
    adapters = {
      'http:': require('http'),
      'https:': require('https'),
    };

  return function(inputUrl) {
    return adapters[url.parse(inputUrl).protocol]
  }
}());
var transactions = {};
var token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI2ZDg5MzRjZi1hZjM2LTQ5NTItOTcyNC0yMjk2NTExNjQ4NDgiLCJpYXQiOjE0NzgxMzM1NjF9.O1cM9ivUADCTVesIGdqEtHMFYHZgFHp7gjUTzCqkpKU";
var URLs = ["https://cdn.rawgit.com/thelinmichael/lunar-phases/master/images/browser-icons/24.png", "http://twinspect.net/help.png" ];
class Handler{
	static socketError(e){
		console.log(e);
	}

	static async imFriend(req){
		console.log(req);
		//this.emit('createPost', );
	}

	static async post(socket, body,  attachmnetURLs){
		let attSent = await Promise.all(attachmnetURLs.map(async (url)=>{
			const res = await Handler.attachment(url,socket);
			return JSON.parse(res).data.attachments.id;
		}));
		socket.emit('createPost',{
			'id':uuid.v4(),
			'authToken':token,
			'body':{
				//'meta':{'feeds':['squid']},
				'meta':{'feeds':['squid']},
				'post':{
					'body':body,
					'attachments':attSent
				}
			}
		});
	}
	static attachment(url, socket){
		const id =  uuid.v4();
		return new Promise(function(resolve,reject){ 
			adapterFor(url).get(url, (msg) => {
				var stream = SIOStream.createStream();
				SIOStream(socket).emit('createAttachment', stream, {
					'id':id, 
					'authToken':token,
					'filename':'file',
					'type':msg.headers['content-type']
				});
				msg.pipe(stream);
				transactions[id] = resolve;
			}).on('error', console.log);
		});
	}
	static response(msg){
		try{
			transactions[msg.id](msg.res);
			delete transactions[msg.id];
		}catch(e){console.log(msg)}
	}

} 
const messageHandlers = {
	'error':Handler.socketError,
	'imFriend':Handler.imFriend,
	'API_res': Handler.response
	
}

process.on('message', (msg) => {
	switch(msg.type){
	case 'IPC_token':
		let socket = IoClient.connect('http://localhost:3000');
		Object.keys(messageHandlers).forEach((msg) => {
			socket.on(msg, messageHandlers[msg]);
		});
		socket.emit('subscribe', {'IPC':[msg.data]});
		/*
		setTimeout(()=>{
			console.log("go");
			Handler.post(socket,'Test post with an attachment',URLs);
		}, 30000);
		*/
		break;
	}
});



