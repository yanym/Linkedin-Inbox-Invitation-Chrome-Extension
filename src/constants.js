const MESSAGE_KEY = 'com.linkedin.voyager.messaging.event.MessageEvent';
const PICTURE_KEY = 'com.linkedin.common.VectorImage';
const MEMBER_KEY = 'com.linkedin.voyager.messaging.MessagingMember';
const PICTURE_URL_BASE = 'https://media-exp2.licdn.com/mpr/mpr/shrinknp_100_100/';
const DEFAULT_PICTURE_URL = '../assets/default.png';
const MESSAGE_LENGTH_LIMIT_CHARS = 1111;
const httpStatusCodes = Object.freeze({
  UNAUTHORIZED: 401,
  REQUEST_DENIED: 999
});
const eventSubTypes = Object.freeze({
  INVITATION_ACCEPT: 'INVITATION_ACCEPT',
  INMAIL_REPLY: 'INMAIL_REPLY',
  MEMBER_TO_MEMBER: 'MEMBER_TO_MEMBER',
  INMAIL: 'INMAIL',
});