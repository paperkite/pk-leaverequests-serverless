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
    title: 'Leave Request',
    state: JSON.stringify({ response_url: payload.response_url }),
    callback_id: 'leave_request_request',
    submit_label: 'Submit',
    elements: [
      {
        label: 'Type',
        type: 'select',
        name: 'type',
        options: [
          { label: 'Annual Leave', value: 'Annual' },
          { label: 'Sick Leave', value: 'Sick' },
          { label: 'Bereavement Leave', value: 'Bereavement' },
          { label: 'Other', value: 'Other' }
        ],
      },
      {
        label: 'From',
        type: 'text',
        name: 'from',
        hint: "This is the first day you'll be out of the office as DD/MM/YYYY",
        placeholder: '30/02/2018'
      },
      {
        label: 'To',
        type: 'text',
        name: 'to',
        hint: "This is the last day you'll be out of the office as DD/MM/YYYY",
        placeholder: '31/02/2018'
      },
      {
        label: 'Hours Away',
        type: 'text',
        name: 'hours',
        hint: "Total number of hours you are requesting to take out of the office",
        placeholder: '8'
      },
      {
        label: 'Description',
        type: 'textarea',
        name: 'description',
        optional: true,
        hint: "Any useful information the producers or your manager needs to know",
      },
    ]
  });

  slack.dialog.open({ token, dialog, trigger_id });

  callback(null, {
    statusCode: 200,
    body: ''
  });

};
