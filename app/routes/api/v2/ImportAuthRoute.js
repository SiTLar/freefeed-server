import util from 'util';
import cookieParser from 'cookie-parser';
import TwitterController from '../../../../import_controllers/TwitterController';
import FacebookController from '../../../../import_controllers/FacebookController';

const twitterAuth = TwitterController.auth();
const facebookAuth = FacebookController.auth();
export default function addRoutes(app) {
  app.use(cookieParser());
  app.all('/v2/importAuth/twitter', twitterAuth.auth);
  app.get('/v2/importAuth/twitter/return', twitterAuth.callback);
  app.all('/v2/importAuth/facebook', facebookAuth.auth);
  app.get('/v2/importAuth/facebook/return', facebookAuth.callback);
}
