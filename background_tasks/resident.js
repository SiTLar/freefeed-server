import IoClient from 'socket.io-client';
import SIOStream  from 'socket.io-stream';
import uuid from 'uuid';
import process from 'process';
import { reportError } from '../app/support/exceptions';
import * as ImportControllers from '../import_controllers';
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
var socket;
class Handler{
	static socketError(e){
		console.log('Socket error:', e);
	}

	static async doImport(feeds){
		try{
			feeds.forEach(async (feed)=>{
				const records = await ImportControllers[feed.service](feed.params);
				records.forEach((record)=>{
					Handler.post(feed.token, record.body, record.attachments);
				});
			});
		}catch(e){console.log('Import failed:', e)}

	}

	static async post(token, body,  attachmnetURLs){
		let attSent = await Promise.all(attachmnetURLs.map(async (url)=>{
			const res = await Handler.attachment( token, url );
			return JSON.parse(res).data.attachments.id;
		}));
		return new Promise(function(resolve,reject){ 
			const id =  uuid.v4();
			socket.emit('createPost',{
				'id':id,
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
			transactions[id] = (res)=>{
				if(res.err)reject(res); 
				else resolve(res);
			};
		});
	}
	static attachment( token, url ){
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
			}).on('error', (e)=>{console.log('Loading attahment failed:', e);reject(e)});
		});
	}
	static response(msg){
		try{
			transactions[msg.id](msg.res);
			delete transactions[msg.id];
		}catch(e){console.log('Respose processing failed', msg)}
	}

} 
const messageHandlers = {
	'error':Handler.socketError,
	'doImport':Handler.doImport,
	'API_res': Handler.response
	
}

process.on('message', (msg) => {
	switch(msg.type){
	case 'IPC_token':
		socket = IoClient.connect('http://localhost:3000');
		Object.keys(messageHandlers).forEach((msg) => {
			socket.on(msg, messageHandlers[msg]);
		});
		socket.emit('subscribe', {'IPC':[msg.data]});
		socket.emit('resident ready');
		/*
		setTimeout(()=>{
			console.log("go");
			Handler.post(socket,'Test post with an attachment',URLs);
		}, 30000);
		*/
		break;
	}
});



