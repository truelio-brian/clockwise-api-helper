let API_URL = "https://api.clockwisemd.com/v1";
let API_KEY =
  "YOUR-API-KEY";
let groupId = 528; // Your hospital group ID

let hospitals = [];

const fetchWrapper = {
  get,
  post,
  put,
  delete: _delete,
};

const HEADERS = {
  "Content-Type": "application/json",
  Authtoken: API_KEY,
};

function get(url) {
  const requestOptions = {
    method: "GET",
    headers: HEADERS,
  };
  return fetch(url, requestOptions).then(handleResponse);
}

function post(url, body) {
  const requestOptions = {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  };
  return fetch(url, requestOptions).then(handleResponse);
}

function put(url, body) {
  const requestOptions = {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify(body),
  };
  return fetch(url, requestOptions).then(handleResponse);
}

// prefixed with underscored because delete is a reserved word in javascript
function _delete(url) {
  const requestOptions = {
    method: "DELETE",
    headers: HEADERS,
  };
  return fetch(url, requestOptions).then(handleResponse);
}

// helper functions

function handleResponse(response) {
  return response.text().then((text) => {
    const data = text && JSON.parse(text);

    if (!response.ok) {
      const error = (data && data.message) || response.statusText;
      return Promise.reject(error);
    }

    return data;
  });
}

const SLOT_TYPE = {
  ONLINE: "online",
  ALL: "all",
  PRIMARY: "primary",
  WALKIN: "walkin",
};

async function getAvailableTimes(
  hospitalId,
  slotType = SLOT_TYPE.ONLINE,
  startDay = 0,
  endDay = 0
) {
  let params = new URLSearchParams({
    slot_type: slotType,
    reason_description: "Veterinary Care",
    start_day: startDay,
    end_day: endDay,
  });

  let result = get(
    `${API_URL}/hospitals/${hospitalId}/available_times?${params.toString()}`
  );

  return result;
}

async function getAllAvailableTimes(groupId, startDay = 0, endDay = 0) {
  let params = new URLSearchParams({
    reason_description: "Veterinary Care",
    day_start: startDay,
    day_end: endDay,
  });

  let result = get(
    `${API_URL}/groups/${groupId}/available_times?${params.toString()}`
  );

  return result;
}

async function getAllAvailableWaits(groupId) {
  let result = get(`${API_URL}/groups/${groupId}/waits`);

  return result;
}

async function getAllGroups() {
  let result = get(`${API_URL}/groups`);

  return result;
}

async function initialize() {
  getAllGroups().then(function (response) {
    console.log(response);
  });

  getAllAvailableWaits(groupId).then(function (response) {
    console.log(response);
  });

  // getAllAvailableTimes(groupId).then(function (response) {
  //   console.log(response);
  // });
}
