'use strict';

const qs = require('querystring')
const slack = require('slack');
const token = process.env.SLACK_BOT_ACCESS_TOKEN;

// The function that AWS Lambda will call
exports.handler = async (event, context, callback) => {
  var payload = qs.parse(event.body);
  console.log(payload);

  const trigger_id = payload.trigger_id;
  const dialog = JSON.stringify({
    title: 'Flight Booking Request',
    state: JSON.stringify({ response_url: payload.response_url }),
    callback_id: 'flight_request_request',
    submit_label: 'Submit',
    elements: [
      {
        label: 'Who is flying',
        type: 'text',
        name: 'who',
        hint: "The names of people needing flights",
      },
      {
        label: 'Departing Info',
        type: 'text',
        name: 'departing',
        hint: "The airport, date, time, and whether the ticket needs to be flexi.",
        placeholder: 'Wellington, 3rd March 8:30am (approx), Flexi'
      },
      {
        label: 'Returning Info',
        type: 'text',
        name: 'returning',
        hint: "The airport, date, time, and whether the ticket needs to be flexi.",
        placeholder: 'Auckland, 3rd March 5:30am, Fixed',
        optional: true
      },
      {
        label: 'Flexi Owner',
        type: 'select',
        data_source: 'users',
        name: 'flexi_owner',
        hint: "If you are booking flexi flights, who is going to be responsible for changing them if needed.",
        placeholder: 'Choose person...',
        optional: true
      },
      {
        label: 'Client Ref',
        type: 'text',
        name: 'client_ref',
        hint: "The client name, project reference, and activity if travel is onchargeable. If not, indicate reason for travel.",
        placeholder: 'Countdown, CDWN-SOW-19005, Sprint Planning'
      },
      {
        label: 'Extra details',
        type: 'textarea',
        name: 'details',
        optional: true,
        hint: "Any extra useful details, e.g. are you open to doing a midnight swap if the fares are decent?",
      },
    ]
  });

  slack.dialog.open({ token, dialog, trigger_id });

  callback(null, {
    statusCode: 200,
    body: ''
  });

};
