const API_URL = "https://api.clockwisemd.com/v1";
const API_KEY =
  "YOUR-API-KEY";
const GROUP_ID = 528; // Your hospital group ID
const REASON_DESCRIPTION = "Veterinary Care";

let CW_HOSPITALS = new Array();
let HOSPITAL_FIELDS = new Array();

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
    reason_description: REASON_DESCRIPTION,
    start_day: startDay,
    end_day: endDay,
  });

  let result = get(
    `${API_URL}/hospitals/${hospitalId}/available_times?${params.toString()}`
  );

  return result;
}

async function getWait(hospitalId) {
  let result = get(`${API_URL}/hospitals/${hospitalId}/waits`);

  return result;
}

async function getAllAvailableTimes(groupId, startDay = 0, endDay = 0) {
  let params = new URLSearchParams({
    reason_description: REASON_DESCRIPTION,
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

async function getDemographics(hospitalId) {
  let result = get(`${API_URL}/hospitals/${hospitalId}/demographics/online`);

  return result;
}

async function getProviders(hospitalId) {
  let result = get(`${API_URL}/providers?hospital_id=${hospitalId}`);

  return result;
}

async function createAppointment(data) {
  let result = post(`${API_URL}/appointments/create`, data);

  return result;
}

function getVeterinaryCareProviderId(response) {
  for (var i = 0; i < response.providers.length; i++) {
    if (response.providers[i].name === "Veterinary Care")
      return response.providers[i].id;
  }
}

function getTopWaitTimes(hospitalId, callback) {
  getAvailableTimes(hospitalId).then(function (timesResponse) {
    let displayTimes = new Array();
    let times = timesResponse.days[0].times;

    if (times.length > 0) {
      for (var i = 0; i < times.length; i++) {
        let time = times[i];

        let timeObj = {
          displayTime: time.display_time.replace(/^0(?:0:0?)?/, ''),
          link: `/schedule/?time=${time.time}`,
        };

        displayTimes.push(timeObj);

        if (displayTimes.length === 6) break;
      }
    }

    callback(displayTimes);
  });
}

function collectLocationsInfo(callback) {
  getAllGroups().then(function (response) {
    let hospitalsResp = response[0].hospitals;

    for (var j = 0; j < hospitalsResp.length; j++) {
      let hospital = hospitalsResp[j];

      getWait(hospital.id).then(function (waitsResponse) {
        getAvailableTimes(hospital.id).then(function (timesResponse) {
          let displayTimes = new Array();
          let times = timesResponse.days[0].times;

          if (times.length > 0) {
            for (var i = 0; i < times.length; i++) {
              let time = times[i];

              let timeObj = {
                displayTime: time.display_time.replace(/^0(?:0:0?)?/, ''),
                link: `https://www.clockwisemd.com/hospitals/${
                  hospital.id
                }/appointments/new?appointment[time]=${time.display_time.replace(
                  " ",
                  ""
                )}`,
              };

              displayTimes.push(timeObj);

              if (displayTimes.length === 5) break;
            }
          }

          let hospObj = {
            hId: hospital.id,
            hName: hospital.name,
            hShortName: hospital.name.replace("UrgentVet - ", ""),
            hAddress: hospital.full_address,
            hPhone: hospital.phone_number,
            hHours: hospital.todays_business_hours,
            currentWait: waitsResponse.hospital_waits.current_wait,
            availableTimes: displayTimes,
          };

          CW_HOSPITALS.push(hospObj);

          if (hospitalsResp.length === CW_HOSPITALS.length) {
            CW_HOSPITALS.sort(function (a, b) {
              if (a.hShortName < b.hShortName) return -1;
              else if (a.hShortName > b.hShortName) return 1;
              else return 0;
            });
            callback();
          }
        });
      });
    }
  });
}

function appointmentForm(hospitalId, callback) {
  HOSPITAL_FIELDS = new Array();

  getDemographics(hospitalId).then(function (response) {
    getProviders(hospitalId).then(function (providerResponse) {
      let providerId = getVeterinaryCareProviderId(providerResponse);

      getAvailableTimes(hospitalId).then(function (timesResponse) {
        let displayTimes = new Array();
        let times = timesResponse.days[0].times;

        if (times.length > 0) {
          for (var i = 0; i < times.length; i++) {
            let time = times[i];

            let timeObj = {
              displayValue: time.display_time.replace(/^0(?:0:0?)?/, ''),
              value: time.time,
            };

            displayTimes.push(timeObj);
          }
        }

        HOSPITAL_FIELDS.push({
          name: response.first_name.name,
          placeholder: response.first_name.placeholder,
          type: response.first_name.type,
          requiredMessage: response.first_name.required_message,
          required: response.first_name.required,
          value: null,
          values: null,
        });

        HOSPITAL_FIELDS.push({
          name: response.last_name.name,
          placeholder: response.last_name.placeholder,
          type: response.last_name.type,
          requiredMessage: response.last_name.required_message,
          required: response.last_name.required,
          value: null,
          values: null,
        });

        HOSPITAL_FIELDS.push({
          name: "appointment[apt_time]",
          placeholder: null,
          type: "select",
          requiredMessage: null,
          required: null,
          value: null,
          values: displayTimes,
        });

        HOSPITAL_FIELDS.push({
          name: response.phone_number.name,
          placeholder: response.phone_number.placeholder,
          type: response.phone_number.type,
          requiredMessage: response.phone_number.required_message,
          required: response.phone_number.required,
          value: null,
          values: null,
        });

        HOSPITAL_FIELDS.push({
          name: response.hospital_id.name,
          placeholder: response.hospital_id.placeholder,
          type: response.hospital_id.type,
          requiredMessage: response.hospital_id.required_message,
          required: response.hospital_id.required,
          value: response.hospital_id.value,
          values: null,
        });

        HOSPITAL_FIELDS.push({
          name: response.provider_id.name,
          placeholder: response.provider_id.placeholder,
          type: response.provider_id.type,
          requiredMessage: response.provider_id.required_message,
          required: response.provider_id.required,
          value: providerId,
          values: null,
        });

        HOSPITAL_FIELDS.push({
          name: response.is_urgentcare.name,
          placeholder: response.is_urgentcare.placeholder,
          type: response.is_urgentcare.type,
          requiredMessage: null,
          required: response.is_urgentcare.required,
          value: true,
          values: null,
        });

        HOSPITAL_FIELDS.push({
          name: response.is_online.name,
          placeholder: response.is_online.placeholder,
          type: response.is_online.type,
          requiredMessage: null,
          required: response.is_online.required,
          value: response.is_online.value,
          values: null,
        });

        HOSPITAL_FIELDS.push({
          name: response.is_walkin.name,
          placeholder: response.is_walkin.placeholder,
          type: response.is_walkin.type,
          requiredMessage: null,
          required: null,
          value: response.is_walkin.value,
          values: null,
        });

        for (var i = 0; i < response.custom_fields.length; i++) {
          let customField = response.custom_fields[i];

          HOSPITAL_FIELDS.push({
            name: customField.name,
            placeholder: customField.placeholder,
            type: customField.type,
            requiredMessage: customField.required_message,
            required: customField.required,
            value: null,
            values: customField.values,
          });
        }

        HOSPITAL_FIELDS.push({
          name: response.email.name,
          placeholder: response.email.placeholder,
          type: response.email.type,
          requiredMessage: response.email.required_message,
          required: response.email.required,
          value: null,
          values: null,
        });

        // HOSPITAL_FIELDS.push({
        //   name: response.can_send_alert_sms.name,
        //   placeholder: response.can_send_alert_sms.placeholder,
        //   type: "hidden",
        //   requiredMessage: null,
        //   required: false,
        //   value: true,
        //   values: null,
        // });

        HOSPITAL_FIELDS.push({
          name: response.reminder_minutes.name,
          placeholder: response.reminder_minutes.placeholder,
          type: "hidden",
          requiredMessage: null,
          required: false,
          value: null,
          values: null,
        });

        // HOSPITAL_FIELDS.push({
        //   name: response.is_quickadd.name,
        //   placeholder: response.is_quickadd.placeholder,
        //   type: response.is_quickadd.type,
        //   requiredMessage: null,
        //   required: null,
        //   value: response.is_quickadd.value,
        //   values: null,
        // });

        // HOSPITAL_FIELDS.push({
        //   name: response.is_staff_added.name,
        //   placeholder: response.is_staff_added.placeholder,
        //   type: response.is_staff_added.type,
        //   requiredMessage: null,
        //   required: null,
        //   value: response.is_staff_added.value,
        //   values: null,
        // });

        callback();
      });
    });
  });
}

function appointmentFormCondensed(hospitalId, callback) {
  HOSPITAL_FIELDS = new Array();

  getProviders(hospitalId).then(function (providerResponse) {
    let providerId = getVeterinaryCareProviderId(providerResponse);

    getAvailableTimes(hospitalId).then(function (timesResponse) {
      let displayTimes = new Array();
      let times = timesResponse.days[0].times;

      if (times.length > 0) {
        for (var i = 0; i < times.length; i++) {
          let time = times[i];

          let timeObj = {
            displayValue: time.display_time.replace(/^0(?:0:0?)?/, ''),
            value: time.time,
          };

          displayTimes.push(timeObj);
        }
      }

      HOSPITAL_FIELDS.push({
        name: "apt_time",
        value: null,
        values: displayTimes,
      });

      HOSPITAL_FIELDS.push({
        name: "provider_id",
        value: providerId,
        values: null,
      });

      HOSPITAL_FIELDS.push({
        name: "hospital_id",
        value: hospitalId,
        values: null,
      });

      callback();
    });
  });
}

function submitAppointmentData(data, callback) {
  let apptRequest = {};

  apptRequest["type"] = "online";
  apptRequest["reason_description"] = REASON_DESCRIPTION;
  apptRequest["can_send_sms_survey"] = true;
  apptRequest["can_send_alert_sms"] = true;
  apptRequest["is_walkin"] = false;
  apptRequest["is_online"] = true;
  apptRequest["is_urgentcare"] = true;

  for (var i = 0; i < HOSPITAL_FIELDS.length; i++) {
    let field = HOSPITAL_FIELDS[i];

    if (field.name === "hospital_id") {
      apptRequest["hospital_id"] = field.value;
      break;
    }
  }

  let fullRequest = {
    ...apptRequest,
    ...data,
  };

  console.log(fullRequest);

  createAppointment(fullRequest).then(function (response) {
    callback(response);
  });
}

function getFieldName(fullName) {
  let firstBracket = fullName.indexOf("[") + 1;
  let secondBracket = fullName.indexOf("]");

  return fullName.substring(firstBracket, secondBracket);
}

function getCustomFields() {
  let retVal = {};

  for (var i = 0; i < HOSPITAL_FIELDS.length; i++) {
    var field = HOSPITAL_FIELDS[i];

    if (field.name.startsWith("extra_fields")) {
      let fieldName = getFieldName(field.name);

      retVal[fieldName] = field.value;
    }
  }

  return retVal;
}
