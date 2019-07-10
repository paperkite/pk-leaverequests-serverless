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
        title: 'Conference/Event request',
        state: JSON.stringify({ response_url: payload.response_url }),
        callback_id: 'event_request_request',
        submit_label: 'Submit',
        elements: [
            {
                label: 'Event name',
                type: 'text',
                name: 'event_name',
                hint: "Google IO",
                placeholder: '30/02/2018'
            },
            {
                label: 'Event location',
                type: 'text',
                name: 'event_name',
                hint: "San Jose, California",
                placeholder: '30/02/2018'
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
                label: 'Name(s) of people requesting to attend event',
                type: 'text',
                name: 'event_date',
                hint: "TODO",
                placeholder: '31/02/2018'
            },
            {
                label: 'Brief description of event',
                type: 'text',
                name: 'event_date',
                hint: "Annual developer conference held by Google",
                placeholder: '31/02/2018'
            },
            {
                label: 'How will PK benefit from supporting your attendance?',
                type: 'textarea',
                name: 'description',
                hint: "TODO",
            },
            {
                label: 'What’s the personal development benefit?',
                type: 'textarea',
                name: 'description',
                hint: "TODO",
            },
            {
                label: 'What is the total cost that you would like PaperKite to cover?',
                type: 'textarea',
                name: 'description',
                optional: true,
                hint: "Enter $ value here",
            },
            {
                label: 'Vital dates',
                type: 'textarea',
                name: 'description',
                optional: true,
                hint: "When does registration close, etc",
            }
        ]
    });

    slack.dialog.open({ token, dialog, trigger_id });

    callback(null, {
        statusCode: 200,
        body: ''
    });

};
