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
  const token = cookie.value.replace(/"/g, '');
  performRequest(token);
}

function performRequest(token) {
  // invitations(token);
  const request = new Request('https://linkedin.com/voyager/api/messaging/conversations', {
    method: 'GET',
    headers: new Headers({
      accept: 'application/json',
      'Content-Type': 'application/json',
      'Csrf-Token': token
    }),
    credentials: 'include'
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

function processResponse(json) {
  const { elements, metadata, paging } = json;
  console.log(elements);
  console.log(metadata);
  console.log(paging);
  const unreadCount = metadata.unreadCount;
  const totalMessages = paging.total;

  createBadges(unreadCount);

  const messages = [];

  for (let element of elements) {
    for (let event of element.events) {
      // if (
      //   event.subtype === eventSubTypes.INMAIL ||
      //   event.subtype === eventSubTypes.INMAIL_REPLY ||
      //   event.subtype === eventSubTypes.MEMBER_TO_MEMBER
      // ) {
        // const { subject = 'No subject', body } = event.eventContent[MESSAGE_KEY];
        const { subject = '', body } = event.eventContent[MESSAGE_KEY];
        const { miniProfile: profile } = event.from[MEMBER_KEY];

        let pictureUrl = DEFAULT_PICTURE_URL;

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
        if (body.length > MESSAGE_LENGTH_LIMIT_CHARS) {
          messages.push({
            name: `${profile.firstName} ${profile.lastName}`,
            pictureUrl,
            subject,
            body: body.substr(0, MESSAGE_LENGTH_LIMIT_CHARS) + '......'
          });
        } else {
          messages.push({
            name: `${profile.firstName} ${profile.lastName}`,
            pictureUrl,
            subject,
            body: body.substr(0, MESSAGE_LENGTH_LIMIT_CHARS)
          });
        }
      // }
    }
  }

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
  // Header
  document.getElementById('header').innerHTML = `
    <tr>
      <th scope="col"></th>
      <th scope="col">Name/Subject</th>
      <th scope="col">Content</th>
    </tr>
  `;

  for (let message of messages) {
    const messageRow = document.createElement('tr');
    messageRow.innerHTML = `
      <td>
        <img src="${message.pictureUrl}" width="66">
      </td>
      <td>
        <b>${message.name}</b><br />
        ${message.subject}
      </td>
      <td>${message.body}</td>
    `;

    document.getElementById('messages').appendChild(messageRow);
  }

  // footer
  document.getElementById('footer').innerHTML = `
    <tr>
      <td colspan="3">
        <span class="text-info">Showing ${messages.length} messages of total ${totalMessages}</span>
        <br></br>
        <a class="btn btn-info btn-sm float-left" id="go-to-inbox">Goto inbox</a>
      </td>
    </tr>
  `;

  document
    .getElementById('go-to-inbox')
    .addEventListener('click', goToInbox);
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


// function invitations(token) {
//   const request = new Request('https://linkedin.com/voyager/api/relationships/invitations', {
//     method: 'GET',
//     headers: new Headers({
//       accept: 'application/json',
//       'Content-Type': 'application/json',
//       'csrf-token': token
//     }),
//     credentials: 'include'
//   });

//   fetch(request)
//     .then(response => {
//       if (
//         response.status === httpStatusCodes.UNAUTHORIZED ||
//         response.status === httpStatusCodes.REQUEST_DENIED
//       ) {
//         goToLogin();
//         return;
//       }
//       console.log(response);
//       return response.json();
//     })
//     .then(processResponse);
// }