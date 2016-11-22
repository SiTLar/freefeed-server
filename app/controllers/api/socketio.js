import { promisifyAll } from 'bluebird';
import process from 'process';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import tempfile from 'tempfile';
import streamToPromise from 'stream-to-promise';
import util from 'util';
import { dbAdapter } from '../../models';
import { PostsController, UsersController, CommentsController } from '../../controllers';
import { load as configLoader } from '../../../config/config';
import { AttachmentSerializer } from '../../models'
const config = configLoader();
promisifyAll(jwt);
promisifyAll(fs);

class MimicExpressRes{
  status(code){
    this.status = code;
    return this;
  }

  jsonp(data){
    this.data = data;
    return this;
  }

  toString(){
    return JSON.stringify({'status':this.status, 'data':this.data});
  }
}

export default class SocketController {
  static async handle(app, reqName, payload) {
    var req = {};
    try{
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
      let res = new MimicExpressRes();
      return await this[reqName](req,res);
    } catch (e) {
      app.logger.info(`failed to handle rt request: ${e.message}`);
    }
  }
  
  static async createPost(req, res) {
    await PostsController.create(req, res);
    return res.toString();
  }
  static async updateProfile(req, res) {
    await UsersController.update(req, res);
    return res.toString();
  }
  static async createComment(req, res) {
    await CommentsController.create(req, res);
    return res.toString();
  }
  static async createAttachment(req,res) {
    try {
      var file = {
        'name':req.body.name,
        'type':req.body.type,
        'path':tempfile()
      }

      req.body.stream.pipe(fs.createWriteStream(file.path));
      await streamToPromise(req.body.stream);
      const stat = await fs.statAsync(file.path);
      file.size = stat.size;
      file.userId = stat.uid;

      const newAttachment = await req.user.newAttachment({ file })
      await newAttachment.create();

      const json = await new AttachmentSerializer(newAttachment).promiseToJSON();
      res.jsonp(json);
    } catch (e) {
      if (e.message && e.message.indexOf('Corrupt image') > -1) {
        this.app.logger.warn(e.message)

        const errorDetails = { message: 'Corrupt image' }
        reportError(res)(errorDetails)
        return;
      }

      if (e.message && e.message.indexOf('LCMS encoding') > -1) {
        this.app.logger.warn(`GraphicsMagick should be configured with --with-lcms2 option`)

        const errorDetails = { status: 500, message: 'Internal server error' }
        reportError(res)(errorDetails)
        return;
      }

      reportError(res)(e)
    }
    return res.toString();
  }
}