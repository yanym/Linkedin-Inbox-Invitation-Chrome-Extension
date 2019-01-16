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


var lastTimeForEachPage = new Map();
var page = 0;
lastTimeForEachPage.set(page, 9999999999000);
var token;
var totalPage;


function requestStats() {
  chrome.cookies.get({
    url: 'https://www.linkedin.com',
    name: 'JSESSIONID'
  }, extractTokenAndPerformRequest);
}


function goToLogin() {
  chrome.tabs.create({
    url: 'https://www.linkedin.com/m/login/'
  });
}


function goToInbox() {
  chrome.tabs.create({
    url: 'https://www.linkedin.com/messaging'
  });
}


function extractTokenAndPerformRequest(cookie) {
  if (!cookie) {
    goToLogin();
    return;
  }
  token = cookie.value.replace(/"/g, '');
  performRequest(token, lastTimeForEachPage.get(page));
}


function performRequest(token, time) {
  time -= 1;
  const creatBefore = 'createdBefore=' + time;
  const request = new Request('https://linkedin.com/voyager/api/messaging/conversations?' + creatBefore, {
    method: 'GET',
    headers: new Headers({
      accept: 'application/json',
      'Content-Type': 'application/json',
      'Csrf-Token': token
    }),
    credentials: 'include',
  });

  fetch(request)
    .then(response => {
      if (
        response.status === httpStatusCodes.UNAUTHORIZED ||
        response.status === httpStatusCodes.REQUEST_DENIED
      ) {
        goToLogin();
        return;
      }
      return response.json();
    })
    .then(processResponse);
}


function nextPage() {
  if (lastTimeForEachPage.get(page + 1) != undefined && page + 1 < totalPage) {
    document.getElementById('messages').innerHTML = "";
    performRequest(token, lastTimeForEachPage.get(++page));
  }
}


function prevPage() {
  if (lastTimeForEachPage.get(page - 1) != undefined) {
    document.getElementById('messages').innerHTML = "";
    performRequest(token, lastTimeForEachPage.get(--page));
  }
}


function processResponse(json) {
  const { elements, metadata, paging } = json;
  // console.log(elements);
  // console.log(metadata);
  // console.log(paging);

  // unreadCount always has some bugs for this API, so it changed into another way.
  // const unreadCount = metadata.unreadCount;
  var unreadCount = 0;
  for (let element of elements) {
    // let { read: isRead } = element;
    if (!element.read)
      unreadCount++;
  }
  const totalMessages = paging.total; 
  if (page === 0)
    totalPage = (totalMessages - totalMessages % 20) / 20 + 1;
  // console.log(unreadCount);
  createBadges(unreadCount);
  const messages = [];
  for (let element of elements) {
    const { miniProfile: participant_profile } = element.participants[0][MEMBER_KEY];
    const { read: isRead } = element;
    for (let event of element.events) {
        const { subject = '', body } = event.eventContent[MESSAGE_KEY];
        const { miniProfile: profile } = event.from[MEMBER_KEY];
        const { subtype: _subtype } = event;
        var subtype;
        var {createdAt: _createdAt} = event;

        if (_subtype === "INVITATION_ACCEPT") {
          subtype = "AC_Invitation"
        }
        if (_subtype === "INMAIL_REPLY") {
          subtype = "Imail_Reply"
        }
        if (_subtype === "MEMBER_TO_MEMBER") {
          subtype = "M2M"
        }
        if (_subtype === "INMAIL") {
          subtype = "Inmail"
        }
        let pictureUrl = DEFAULT_PICTURE_URL;

        if (subtype === "AC_Invitation") {
          const { text } = event.eventContent[MESSAGE_KEY].attributedBody;
          if (
            profile.picture &&
            profile.picture[PICTURE_KEY] &&
            profile.picture[PICTURE_KEY].artifacts &&
            profile.picture[PICTURE_KEY].rootUrl &&
            profile.picture[PICTURE_KEY].artifacts[0]
          ) {
            const pictureUrlBase = profile.picture[PICTURE_KEY].rootUrl;
            const picturePath = profile.picture[PICTURE_KEY].artifacts[0].fileIdentifyingUrlPathSegment;
            pictureUrl = pictureUrlBase + picturePath;
          }
          if (participant_profile.firstName === profile.firstName && participant_profile.lastName === profile.lastName) {
            participant_profile.firstName = "Me";
            participant_profile.lastName = "";
          }
          messages.push({
            name: `${profile.firstName} ${profile.lastName}`,
            pictureUrl,
            toWho: `${participant_profile.firstName} ${participant_profile.lastName}`,
            subject,
            body: text,
            subtype,
            isRead
          });
        } else {
          if (
            profile.picture &&
            profile.picture[PICTURE_KEY] &&
            profile.picture[PICTURE_KEY].artifacts &&
            profile.picture[PICTURE_KEY].rootUrl &&
            profile.picture[PICTURE_KEY].artifacts[0]
          ) {
            const pictureUrlBase = profile.picture[PICTURE_KEY].rootUrl;
            const picturePath = profile.picture[PICTURE_KEY].artifacts[0].fileIdentifyingUrlPathSegment;
            pictureUrl = pictureUrlBase + picturePath;
          }
          
          if (participant_profile.firstName === profile.firstName && participant_profile.lastName === profile.lastName) {
            participant_profile.firstName = "Me";
            participant_profile.lastName = "";
          }

          if (body.length > MESSAGE_LENGTH_LIMIT_CHARS) {
            messages.push({
              name: `${profile.firstName} ${profile.lastName}`,
              pictureUrl,
              toWho: `${participant_profile.firstName} ${participant_profile.lastName}`,
              subject,
              body: body.substr(0, MESSAGE_LENGTH_LIMIT_CHARS) + '......',
              subtype,
              isRead
            });
          } else {
            messages.push({
              name: `${profile.firstName} ${profile.lastName}`,
              pictureUrl,
              toWho: `${participant_profile.firstName} ${participant_profile.lastName}`,
              subject,
              body: body.substr(0, MESSAGE_LENGTH_LIMIT_CHARS),
              subtype,
              isRead
            });
          }
        }
    }
  }
  lastTimeForEachPage.set(page + 1, _createdAt);
  if (messages.length === 0) {
    document.getElementById('header').innerHTML = `
      <tr>
        <th>No messages.</th>
      </tr>
    `;
    return;
  }
  createMessageRows(messages, totalMessages);
}


function createMessageRows(messages, totalMessages) {
  document.getElementById('header').innerHTML = `
    <tr>
      <th scope="col" style="text-align: center">Profile</th>
      <th scope="col" style="text-align: center">Subject</th>
      <th scope="col" style="text-align: center">To</th>
      <th scope="col">Content</th>
      <th scope="col" style="text-align: center">Type</th>
    </tr>
  `;
  var controlColor = 0;
  for (let message of messages) {
    const messageRow = document.createElement('tr');
    if (message.isRead === false) {
      messageRow.innerHTML = `
        <td style="background: rgb(255, 0, 0, 0.1)">
          <img src="${message.pictureUrl}" width="55">
        </td>
        <td style="background: rgb(255, 0, 0, 0.1); text-align: center">
          <b>${message.name}</b>
          <br />
          ${message.subject}
        </td>
        <td style="background: rgb(255, 0, 0, 0.1); text-align: center;">
          ${message.toWho}
        </td>
        <td style="background: rgb(255, 0, 0, 0.1); text-align: justify">
          ${message.body}
        </td>
        <td style="background: rgb(255, 0, 0, 0.1); text-align: center">
          ${message.subtype}
        </td>
      `;
    } else { 
      if (controlColor % 2 == 0) {
        messageRow.innerHTML = `
          <td style="background: rgb(194, 233, 254, 0.1)">
            <img src="${message.pictureUrl}" width="55">
          </td>
          <td style="background: rgb(194,233,254,0.1); text-align: center">
            <b>${message.name}</b>
            <br />
            ${message.subject}
          </td>
          <td style="background: rgb(194, 233, 254, 0.1); text-align: center;">
            ${message.toWho}
          </td>
          <td style="background: rgb(194, 233, 254, 0.1); text-align: justify">
            ${message.body}
          </td>
          <td style="background: rgb(194, 233, 254, 0.1); text-align: center">
            ${message.subtype}
          </td>
        `;
    } else {
      messageRow.innerHTML = `
        <td style="background: rgb(212, 255, 204, 0.1)">
          <img src="${message.pictureUrl}" width="55">
        </td>
        <td style="background: rgb(212, 255, 204, 0.1); text-align: center">
          <b>${message.name}</b>
          <br />
          ${message.subject}
        </td>
        <td style="background: rgb(212, 255, 204, 0.1); text-align: center">
          ${message.toWho}
        </td>
        <td style="background: rgb(212, 255, 204, 0.1); text-align: justify">
          ${message.body}
        </td>
        <td style="background: rgb(212, 255, 204, 0.1); text-align: center">
          ${message.subtype}
        </td>
      `;
    }
    }
    document.getElementById('messages').appendChild(messageRow);
    controlColor++;
  }
  document.getElementById('footer').innerHTML = `
    <tr>
      <td colspan="5">
        <span class="text-info" style="font-size:15px">Page ${page + 1} of ${totalPage} </span>
        <br></br>
        <button type="button" class="btn btn-outline-danger" id="prev-page">Prev</button>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<button type="button" class="btn btn-outline-success" id="next-page">Next</button> <button type="button" class="btn btn-primary float-right" id="go-to-inbox">Goto inbox</button>
      </td>
    </tr>
  `;
  document.getElementById('go-to-inbox').addEventListener('click', goToInbox);
  document.getElementById('next-page').addEventListener('click', nextPage);
  document.getElementById('prev-page').addEventListener('click', prevPage);
}


function createBadges(unreadCount) {
  if (unreadCount != 0) {
    document.getElementById('stats').innerHTML = `
    <div class="alert alert-danger" role="alert">
      Unread messages: ${unreadCount}
    </div>
    `;
  }
}