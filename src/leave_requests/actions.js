'use strict';

const token = process.env.SLACK_BOT_ACCESS_TOKEN;
const profile_token = process.env.SLACK_OAUTH_ACCESS_TOKEN
const channel = process.env.LEAVE_SLACK_CHANNEL;
const approver_custom_field = 'XfGQ6Q53J6'

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const axios = require('axios');
const dedent = require('dedent');
const moment = require('moment-timezone');
const slack = require('slack');

async function handleSubmission(payload) {

    const submission = payload.submission;
    const person = payload.user

    console.log(`Handling request from ${person.name}`, submission);

    var fromDate = moment(submission.from, 'DD/MM/YYYY');
    var toDate = moment(submission.to, 'DD/MM/YYYY');

    if (fromDate.isValid() && toDate.isValid()) {
        submission.person = await fetchUser(person.id);
        submission.approver = fetchApprover(submission.person);
        submission.fromMoment = fromDate;
        submission.toMoment = toDate;

        // First post a message to the approving channel

        const channelMessage = formatChannelMessage(submission);
        const channelResponse = await postToSlack(channelMessage);

        // The channel response is needed to tie the approval action back to the original request
        payload.channelResponse = channelResponse

        // Then follow-up and create a thread with instructions and tag the right people
        const threadMessage = formatThreadMessage(channelResponse.ts, submission);

        await Promise.all([
            postToSlack(threadMessage),
            saveRequest(payload),
            postAcknowledgement(payload.response_url, submission.approver)
        ]);

        return true;
    }
    else {
        var response = { errors: [] };
        if (!fromDate.isValid()) { response.errors.push({ name: 'from', error: 'Sorry, that date doesn\'t look right' }) }
        if (!toDate.isValid()) { response.errors.push({ name: 'to', error: 'Sorry, that date doesn\'t look right' }) }
        return response;
    }
}

async function handleApproval(payload, action) {
    console.log(payload, action);
    const is_approved = action.value == 'approve'
    const request = await loadRequest(payload.message.ts);
    const dm = await openSlackDM(request.person);
    const requesterMessage = formatRequesterNotification(request, dm, is_approved, payload.user);
    const updateMessage = formatUpdatedChannelMessage(payload.message, is_approved, payload.user)
    const threadUpdate = formatApprovedThreadMessage(payload.message.ts, request.person.name, is_approved, payload.user)

    await Promise.all([
        postToSlack(requesterMessage),
        postToSlack(threadUpdate),
        updateSlackMessage(updateMessage),
        markRequestAsApproved(payload.message.ts, is_approved, payload.user)
    ]);

    return true;
}

function saveRequest(payload) {
    return dynamo.put({
        TableName: process.env.LEAVE_REQUESTS_DYNAMODB_TABLE,
        Item: {
            id: payload.channelResponse.ts,
            person: {
                id: payload.user.id,
                name: payload.submission.person.first_name
            },
            approver_id: payload.submission.approver,
            type: payload.submission.type,
            from: payload.submission.from,
            to: payload.submission.to,
            hours: payload.submission.hours,
            description: payload.submission.description,
            response_url: payload.response_url,
            created_at: moment().tz('Pacific/Auckland').format(),
            approved_at: null,
            payload: JSON.stringify(payload)
        }
    }).promise();
}

function loadRequest(id) {
    return dynamo.get({
        TableName: process.env.LEAVE_REQUESTS_DYNAMODB_TABLE,
        Key: { id: id }
    }).promise().then((response) => {
        return response.Item
    });
}

function markRequestAsApproved(id, is_approved, approver) {
    return dynamo.update({
        TableName: process.env.LEAVE_REQUESTS_DYNAMODB_TABLE,
        Key: { id: id },
        UpdateExpression: "SET approved_at = :approved_at, approved_by = :approved_by, was_approved = :was_approved",
        ExpressionAttributeValues: {
            ":approved_at": moment().tz('Pacific/Auckland').format(),
            ":approved_by": approver.username,
            ":was_approved": is_approved
        }
    }).promise().then((response) => {
        console.log(response)
        return response
    });
}

function formatChannelMessage(submission) {
    var dateString = formatRequestDateString(submission);

    return {
        "token": token,
        "channel": channel,
        "text": "",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `<@${submission.person.id}> has requested to take *${submission.hours}* hour(s) of ${submission.type} leave.`
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
                            "text": ":white_check_mark: Approve"
                        },
                        "action_id": "leave_request_approve",
                        "value": "approve",
                        "confirm": {
                            "title": {
                                "type": "plain_text",
                                "text": "Are you sure?"
                            },
                            "text": {
                                "type": "plain_text",
                                "text": `A DM will be sent to ${submission.person.first_name} to let them know its approved.`
                            },
                            "confirm": {
                                "type": "plain_text",
                                "text": "Yes, I approve"
                            },
                            "deny": {
                                "type": "plain_text",
                                "text": "Not yet"
                            }
                        }
                    },
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "emoji": true,
                            "text": ":x: Decline"
                        },
                        "action_id": "leave_request_decline",
                        "value": "decline",
                        "confirm": {
                            "title": {
                                "type": "plain_text",
                                "text": "Are you sure?"
                            },
                            "text": {
                                "type": "mrkdwn",
                                "text": dedent`A DM will be sent to ${submission.person.first_name} to let them know its approved. \
                                               *Don't forget to follow up with ${submission.person.first_name} and let them know \
                                               why it has been declined.*`
                            },
                            "confirm": {
                                "type": "plain_text",
                                "text": "Yes, decline it"
                            },
                            "deny": {
                                "type": "plain_text",
                                "text": "Not yet"
                            }
                        }
                    }
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": dedent`*Type:* ${submission.type} Leave
                                   *When:* ${dateString}
                                   *Hours:* ${submission.hours}
                                   *Comments:* ${submission.description || ''}`
                }
            }
        ]
    }
}

function formatRequestDateString(submission) {
    const from = moment(submission.from, 'DD/MM/YYYY');
    const to = moment(submission.to, 'DD/MM/YYYY');
    var dateString = from.format('ddd Do MMM');

    // only show the year if the request spans different years, 
    // or the request is not for the current year
    if (!from.isSame(to, 'year') || !from.isSame(moment(), 'year')) {
        dateString += ', ' + from.format('YYYY');
    }
    // only show the to date if the request spans several days
    if (!from.isSame(to, 'day')) {
        dateString += ' - ' + to.format('ddd Do MMM');
        if (!to.isSame(moment(), 'year')) {
            dateString += ', ' + to.format('YYYY')
        }
    }

    return dateString;
}

function formatUpdatedChannelMessage(original_message, is_approved, approver) {
    // strip the actions
    var approver_block = { type: "section", text: { type: "mrkdwn" } }
    if (is_approved) {
        approver_block.text.text = `:white_check_mark: *<@${approver.id}> approved this request*`
    }
    else {
        approver_block.text.text = `:x: *<@${approver.id}> declined this request*`
    }

    var blocks = original_message.blocks;
    blocks[1] = approver_block

    return {
        "token": token,
        "channel": channel,
        "ts": original_message.ts,
        "text": original_message.text,
        "blocks": blocks
    };
}

function formatThreadMessage(thread_ts, submission) {
    var text = undefined;
    if ('default' == submission.approver) {
        text = dedent`Use this thread to verify if the request can be approved. Things you should check:
                       - Check Forecast to see if there's any clash with booked-in work (<!subteam^SC9MWQTK9>)
                       - Check in Smart Payroll to make sure they enough leave accrued (<@UC39KEXSA>)`
    }
    else {
        text = dedent`Hey <@${submission.approver}>, use this thread to verify if the request can be approved.`
    }

    text += dedent`\n\nOnce it's been decided hit that Approve button and \
                   ${submission.person.first_name} will be sent a message to submit \
                   the request formally to Smart Payroll. If you decline \
                   they'll get a message to come and talk to you about it.`

    return {
        "token": token,
        "channel": channel,
        "thread_ts": thread_ts,
        "text": text
    }
}

function formatApprovedThreadMessage(thread_ts, requester_name, is_approved, approver) {
    var message = undefined
    if (is_approved) {
        message = dedent`:tick: <@${approver.id}> approved this request. ${requester_name} has been sent a DM \
                         to submit the request to Smart Payroll.

                         p.s. <@${approver.id}> Make sure you update Forecast and the Leave Calendar!`
    }
    else {
        message = dedent`:x: <@${approver.id}> declined this request. ${requester_name} has been sent a DM \
                         letting them know. 
                         
                         <@${approver.id}>: if you haven't already, please follow up with ${requester_name} in person \
                         to let them know why it wasn't approved this time.`
    }

    return {
        "token": token,
        "channel": channel,
        "thread_ts": thread_ts,
        "text": message
    }
}

function formatRequesterNotification(request, dm_channel, is_approved, approver) {
    var message = undefined;
    if (is_approved) {
        message = dedent`Hey, good news! Your ${request.type} leave request starting ${request.from} has been \
                         approved :thumbsup:.
                         
                         The last thing you've gotta do is submit your request through Smart Payroll. Please set \
                         <@UC39KEXSA> as the approver for your request. Unfortunately we can't automate this step, \
                         it has to come from you :upside_down_face:.
                         
                         If you have any followup questions chat to <@${approver.id}>, they know the deal.`
    }
    else {
        message = dedent`Hey, unfortunately your ${request.type} leave request starting ${request.from} has been \
                         declined. If you haven't already, chat to <@${approver.id}> about what happens next.`
    }

    return {
        "token": token,
        "channel": dm_channel,
        "text": message
    }
}

function postToSlack(message) {
    console.log(`Posting message to ${message.channel}`, message);
    return slack.chat.postMessage(message).then((response) => {
        return response;
    })
}

function updateSlackMessage(message) {
    return slack.chat.update(message).then((response) => {
        console.log(response);
        return response;
    })
}

function openSlackDM(person) {
    return slack.im.open({ token, user: person.id }).then((response) => {
        console.log(response);
        return response.channel.id
    });
}

function postAcknowledgement(response_url, approver) {

    var no_response = '';
    if ('default' == approver) {
        no_response = "get in touch with one of the <!subteam^SC9MWQTK9>";
    }
    else {
        no_response = `get in touch with <@${approver}>`;
    }

    return axios.post(response_url, {
        text: dedent`Submitted! Your request is being reviewed and you should get an update in \
                     the next day or so. If you don't get a response, ${no_response}`,
        response_type: "ephemeral"
    });
}

function fetchUser(user) {
    return slack.users.profile.get({ token: profile_token, include_labels: true, user }).then((response) => {
        console.log(response);
        response.profile.id = user
        return response.profile;
    });
}

function fetchApprover(user) {
    if (user.fields[approver_custom_field]) {
        return user.fields[approver_custom_field].value;
    }
    return 'default';
}

module.exports = {
    handleSubmission,
    handleApproval
}