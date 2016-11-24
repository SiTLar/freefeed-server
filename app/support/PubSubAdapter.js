const CHANNEL_NAMES = {
  POST_CREATED:      'post:new',
  POST_UPDATED:      'post:update',
  POST_DESTROYED:    'post:destroy',
  POST_HIDDEN:       'post:hide',
  POST_UNHIDDEN:     'post:unhide',
  COMMENT_CREATED:   'comment:new',
  COMMENT_UPDATED:   'comment:update',
  COMMENT_DESTROYED: 'comment:destroy',
  LIKE_ADDED:        'like:new',
  LIKE_REMOVED:      'like:remove',
  INITIATE_IMPORT:   'initiateImport'
}

export class PubSubAdapter {
  constructor(redisClient) {
    this.redisClient = redisClient
  }

  ///////////////////////////////////////////////////

  postCreated(payload) {
    return this._publish(CHANNEL_NAMES.POST_CREATED, payload)
  }

  postUpdated(payload) {
    return this._publish(CHANNEL_NAMES.POST_UPDATED, payload)
  }

  postDestroyed(payload) {
    return this._publish(CHANNEL_NAMES.POST_DESTROYED, payload)
  }

  postHidden(payload) {
    return this._publish(CHANNEL_NAMES.POST_HIDDEN, payload)
  }

  postUnhidden(payload) {
    return this._publish(CHANNEL_NAMES.POST_UNHIDDEN, payload)
  }

  ///////////////////////////////////////////////////

  commentCreated(payload) {
    return this._publish(CHANNEL_NAMES.COMMENT_CREATED, payload)
  }

  commentUpdated(payload) {
    return this._publish(CHANNEL_NAMES.COMMENT_UPDATED, payload)
  }

  commentDestroyed(payload) {
    return this._publish(CHANNEL_NAMES.COMMENT_DESTROYED, payload)
  }

  ///////////////////////////////////////////////////

  likeAdded(payload) {
    return this._publish(CHANNEL_NAMES.LIKE_ADDED, payload)
  }

  likeRemoved(payload) {
    return this._publish(CHANNEL_NAMES.LIKE_REMOVED, payload)
  }

  ///////////////////////////////////////////////////

  initiateImport(payload) {
    return this._publish(CHANNEL_NAMES.INITIATE_IMPORT, payload)
  }

  ///////////////////////////////////////////////////

  _publish(channel, payload) {
    return this.redisClient.publishAsync(channel, payload)
  }
}

PubSubAdapter.CHANNEL_NAMES = CHANNEL_NAMES
