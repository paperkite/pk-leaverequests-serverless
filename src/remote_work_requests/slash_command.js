'use strict';

const qs = require('querystring')
const dedent = require('dedent');

// The function that AWS Lambda will call
exports.handler = async (event, context, callback) => {
  var payload = qs.parse(event.body);
  console.log(payload);

  const message = {
    "text": "",
    "blocks": [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": dedent`:wave: Before we start, have you read the \
                               <https://playbook.paperkite.io/ways-of-working/remote-work.html|Remote Working guidelines> \
                               in the playbook?

                               Now it's time to choose your own adventure. 
                                :sunglasses: Are you after a one-off remote day (Casual), or 
                                :calendar: Something a bit more structured and repeating (Customary)?
                        `
            }
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "emoji": true,
                        "text": ":sunglasses: Casual"
                    },
                    "action_id": "remote_request_casual",
                    "value": "casual"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "emoji": true,
                        "text": ":calendar: Customary"
                    },
                    "action_id": "remote_request_customary",
                    "value": "customary"
                }
            ]
        }
    ]
}


  callback(null, {
    statusCode: 200,
    body: JSON.stringify(message)
  });

  // const trigger_id = payload.trigger_id;
  // const dialog = JSON.stringify({
  //   title: 'Remote Work Request',
  //   state: JSON.stringify({ response_url: payload.response_url }),
  //   callback_id: 'remote_work_request_request',
  //   submit_label: 'Submit',
  //   elements: [
  //     {
  //       label: 'Type',
  //       type: 'select',
  //       name: 'type',
  //       options: [
  //         { label: 'Casual', value: 'Casual' },
  //         { label: 'Customary', value: 'Customary' }
  //       ],
  //       hint: "Customary is for when you will work remotely on a recurring basis (like fortnightly)",
  //     },
  //     {
  //       label: 'Period',
  //       type: 'text',
  //       name: 'period',
  //       hint: "Enter the day, or the frequency for remote work",
  //       placeholder: '31/02/2018, or Wednesday\'s every fortnight'
  //     },
  //     {
  //       label: 'Description',
  //       type: 'textarea',
  //       name: 'description',
  //       optional: true,
  //       hint: "Any useful information the producers or your manager needs to know",
  //     },
  //   ]
  // });

  // slack.dialog.open({ token, dialog, trigger_id });



};
