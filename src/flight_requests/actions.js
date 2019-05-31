'use strict';

const token = process.env.SLACK_BOT_ACCESS_TOKEN;
const channel = process.env.TRAVEL_SLACK_CHANNEL;
const travel_agent = 'UFJ6DNCAJ'

const axios = require('axios');
const dedent = require('dedent');
const slack = require('slack');

async function handleSubmission(payload) {

    const submission = payload.submission;
    const person = payload.user

    console.log(`Handling flight request from ${person.name}`, submission);
    
    const channelMessage = formatChannelMessage(submission, person);

    await Promise.all([
        postToSlack(channelMessage), 
        postAcknowledgement(payload.response_url)
    ]);

    return true;

}

function formatChannelMessage(submission, requester) {
    
    var request_details = dedent`*Who:* ${submission.who}
                                 *Departing:* ${submission.departing}
                                 *Returning:* ${submission.returning}
                                 *Reference:* ${submission.client_ref}
                                 *Extra Details:* ${submission.details}`

    if(submission.flexi_owner) {
        request_details += `\n\n<@${submission.flexi_owner}> has been nominated to change the flexi flights if necessary.`
    }

    return {
        "token": token,
        "channel": channel,
        "text": dedent`Hey <@${travel_agent}>, there's a new travel request from <@${requester.id}> :airplane:
        
                       ${request_details}`
    }
}

function postToSlack(message) {
    console.log(`Posting message to ${message.channel}`, message);
    return slack.chat.postMessage(message).then((response) => {
        return response;
    })
}

function postAcknowledgement(response_url) {
    return axios.post(response_url, { 
        text: dedent`Submitted! Follow along in the <#${channel}> channel, and make sure you say thanks to <@${travel_agent}>!`, 
        response_type: "ephemeral" 
    });
}

module.exports = {
    handleSubmission
}