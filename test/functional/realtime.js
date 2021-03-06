/* eslint-env node, mocha */
/* global $database, $pg_database */
import knexCleaner from 'knex-cleaner'

import { getSingleton } from '../../app/app';
import { dbAdapter, PubSub } from '../../app/models';
import { PubSubAdapter } from '../../app/support/PubSubAdapter'

import * as funcTestHelper from './functional_test_helper';


describe('Realtime (Socket.io)', () => {
  before(async () => {
    await getSingleton();

    const pubsubAdapter = new PubSubAdapter($database)
    PubSub.setPublisher(pubsubAdapter)
  });

  let lunaContext = {};
  let marsContext = {};

  beforeEach(async () => {
    await knexCleaner.clean($pg_database);

    [lunaContext, marsContext] = await Promise.all([
      funcTestHelper.createUserAsync('luna', 'pw'),
      funcTestHelper.createUserAsync('mars', 'pw')
    ])
  })

  describe('User timeline', () => {
    it('Luna gets notifications about public posts', async () => {
      const user = await dbAdapter.getUserByUsername('mars')
      const feedIds = await dbAdapter.getUserTimelinesIds(user.id)

      let postPromise;
      let postId;
      let timeoutId;

      const callbacks = {
        'connect': async (client) => {
          client.emit('subscribe', { 'timeline': [feedIds.Posts] });
          postPromise = funcTestHelper.createAndReturnPost(marsContext, 'test post');

          timeoutId = setTimeout(() => {
            throw new Error(`notification wasn't delivered`);
          }, 2000);
        },
        'post:new': async (data) => {
          postId = (await postPromise).id;
          data.posts.id.should.eql(postId);

          postPromise = funcTestHelper.deletePostAsync(marsContext, postId);
        },
        'post:destroy': async (data, client) => {
          clearTimeout(timeoutId);
          data.meta.postId.should.eql(postId);

          client.disconnect();
        }
      };

      await funcTestHelper.createRealtimeConnection(lunaContext, callbacks);
    });

    it('Anonymous user gets notifications about public posts', async () => {
      const user = await dbAdapter.getUserByUsername('mars')
      const feedIds = await dbAdapter.getUserTimelinesIds(user.id)

      let postPromise;
      let postId;
      let timeoutId;

      const callbacks = {
        'connect': async (client) => {
          client.emit('subscribe', { 'timeline': [feedIds.Posts] });
          postPromise = funcTestHelper.createAndReturnPost(marsContext, 'test post');

          timeoutId = setTimeout(() => {
            throw new Error(`notification wasn't delivered`);
          }, 2000);
        },
        'post:new': async (data) => {
          postId = (await postPromise).id;
          data.posts.id.should.eql(postId);

          postPromise = funcTestHelper.deletePostAsync(marsContext, postId);
        },
        'post:destroy': async (data, client) => {
          clearTimeout(timeoutId);
          data.meta.postId.should.eql(postId);

          client.disconnect();
        }
      };

      await funcTestHelper.createRealtimeConnection({ authToken: '' }, callbacks);
    });

    describe('Mars is a private user', () => {
      beforeEach(async () => {
        await funcTestHelper.goPrivate(marsContext)
      });

      it('Luna does not get notifications about his posts', async () => {
        const user = await dbAdapter.getUserByUsername('mars')
        const feedIds = await dbAdapter.getUserTimelinesIds(user.id)

        let timeoutId;

        const callbacks = {
          'connect': async (client) => {
            client.emit('subscribe', { 'timeline': [feedIds.Posts] });
            await funcTestHelper.createAndReturnPost(marsContext, 'test post');

            timeoutId = setTimeout(() => {
              client.disconnect();
            }, 600);
          },
          'post:new': async () => {
            clearTimeout(timeoutId);
            throw new Error('there should not be notification');
          }
        };

        await funcTestHelper.createRealtimeConnection(lunaContext, callbacks);
      });
    });

    describe('Mars blocked luna', () => {
      beforeEach(async () => {
        await funcTestHelper.banUser(marsContext, lunaContext)
      });

      it('Luna does not get notifications about his posts', async () => {
        const user = await dbAdapter.getUserByUsername('mars')
        const feedIds = await dbAdapter.getUserTimelinesIds(user.id)

        let timeoutId;

        const callbacks = {
          'connect': async (client) => {
            client.emit('subscribe', { 'timeline': [feedIds.Posts] });
            await funcTestHelper.createAndReturnPost(marsContext, 'test post');

            timeoutId = setTimeout(() => {
              client.disconnect();
            }, 600);
          },
          'post:new': async () => {
            clearTimeout(timeoutId);
            throw new Error('there should not be notification');
          }
        };

        await funcTestHelper.createRealtimeConnection(lunaContext, callbacks);
      });

      it('Mars does not get notifications about her posts', async () => {
        const user = await dbAdapter.getUserByUsername('luna')
        const feedIds = await dbAdapter.getUserTimelinesIds(user.id)

        let timeoutId;

        const callbacks = {
          'connect': async (client) => {
            client.emit('subscribe', { 'timeline': [feedIds.Posts] });
            await funcTestHelper.createAndReturnPost(lunaContext, 'test post');

            timeoutId = setTimeout(() => {
              client.disconnect();
            }, 600);
          },
          'post:new': async () => {
            clearTimeout(timeoutId);
            throw new Error('there should not be notification');
          }
        };

        await funcTestHelper.createRealtimeConnection(marsContext, callbacks);
      });

      describe('Reactions', () => {
        let venusContext = {};
        let postId;

        beforeEach(async () => {
          venusContext = await funcTestHelper.createUserAsync('venus', 'pw')
          const post = await funcTestHelper.createAndReturnPost(venusContext, 'test post');
          postId = post.id;
        });

        it('Mars does not get notifications about her likes', async () => {
          const user = await dbAdapter.getUserByUsername('venus')
          const feedIds = await dbAdapter.getUserTimelinesIds(user.id)

          let timeoutId;

          const callbacks = {
            'connect': async (client) => {
              client.emit('subscribe', { 'timeline': [feedIds.Posts] });
              await funcTestHelper.like(postId, lunaContext.authToken);

              timeoutId = setTimeout(() => {
                client.disconnect();
              }, 600);
            },
            'like:new': async () => {
              clearTimeout(timeoutId);
              throw new Error('there should not be notification');
            }
          };

          await funcTestHelper.createRealtimeConnection(marsContext, callbacks);
        });

        it('Mars does not get notifications about her comments', async () => {
          const user = await dbAdapter.getUserByUsername('venus')
          const feedIds = await dbAdapter.getUserTimelinesIds(user.id)

          let timeoutId;

          const callbacks = {
            'connect': async (client) => {
              client.emit('subscribe', { 'timeline': [feedIds.Posts] });
              await funcTestHelper.createCommentAsync(lunaContext, postId, 'reply');

              timeoutId = setTimeout(() => {
                client.disconnect();
              }, 600);
            },
            'comment:new': async () => {
              clearTimeout(timeoutId);
              throw new Error('there should not be notification');
            }
          };

          await funcTestHelper.createRealtimeConnection(marsContext, callbacks);
        });
      });
    });
  });
});
