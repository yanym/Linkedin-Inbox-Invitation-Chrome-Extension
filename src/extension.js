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
  // console.log(elements);
  // console.log(metadata);
  // console.log(paging);
  const unreadCount = metadata.unreadCount;
  const totalMessages = paging.total;
  // console.log(unreadCount);
  createBadges(unreadCount);

  const messages = [];

  for (let element of elements) {
    var { miniProfile: participant_profile } = element.participants[0][MEMBER_KEY];
      
    for (let event of element.events) {
        const { subject = '', body } = event.eventContent[MESSAGE_KEY];
        const { miniProfile: profile } = event.from[MEMBER_KEY];
        const { subtype } = event;
        // console.log(subtype);
        let pictureUrl = DEFAULT_PICTURE_URL;

        if (subtype === "INVITATION_ACCEPT") {
          const { text } = event.eventContent[MESSAGE_KEY].attributedBody;
          // console.log(text);
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
            subtype
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
            // console.log(participant_profile.firstName + "|" + profile.firstName);
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
              subtype
            });
          } else {
            messages.push({
              name: `${profile.firstName} ${profile.lastName}`,
              pictureUrl,
              toWho: `${participant_profile.firstName} ${participant_profile.lastName}`,
              subject,
              body: body.substr(0, MESSAGE_LENGTH_LIMIT_CHARS),
              subtype
            });
          }
        }
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
      <th scope="col">Img</th>
      <th scope="col">Subject</th>
      <th scope="col">To</th>
      <th scope="col">Content</th>
      <th scope="col">Type</th>
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
      <td>
        ${message.toWho}
      </td>
      <td>${message.body}</td>
      <td>${message.subtype}</td>
    `;

    document.getElementById('messages').appendChild(messageRow);
  }

  // footer
  document.getElementById('footer').innerHTML = `
    <tr>
      <td colspan="5">
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