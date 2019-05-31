'use strict';

const token = process.env.SLACK_BOT_ACCESS_TOKEN;
const channel = process.env.REMOTE_SLACK_CHANNEL;

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const axios = require('axios');
const dedent = require('dedent');
const moment = require('moment-timezone');
const slack = require('slack');

async function handleActions(payload, action){
    console.log(payload, action);
    
    if(action.action_id == 'remote_request_casual'){
        const dialog = {
          title: 'Casual Remote Work',
          state: JSON.stringify({ response_url: payload.response_url }),
          callback_id: 'remote_request_casual_submission',
          submit_label: 'Submit',
          elements: generateCasualDialog()
        }

        return presentDialog(payload.trigger_id, dialog);
    }
    else if(action.action_id == 'remote_request_customary') {
        
    }
    
    return true;
}

async function handleSubmission(payload) {
  const submission = payload.submission;
  const person = payload.user

  console.log(`Handling remote request from ${person.name}`, submission);

  var fromDate = moment(submission.from, 'DD/MM/YYYY');
  var toDate = moment(submission.to, 'DD/MM/YYYY');

  if(fromDate.isValid() && toDate.isValid()) {
      submission.person = person;
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
          postAcknowledgement(payload.response_url)
          ]);

      return true;
  }
  else {
      var response = { errors: [] };
      if(!fromDate.isValid()) { response.errors.push({ name: 'from', error: 'Sorry, that date doesn\'t look right' })}
      if(!toDate.isValid()) { response.errors.push({ name: 'to', error: 'Sorry, that date doesn\'t look right' })}
      return response;
  }
}

function generateCasualDialog(){
    return [
      {
        label: 'From',
        type: 'text',
        name: 'from',
        hint: "This is the first day you'll be working remotely as DD/MM/YYYY",
        placeholder: '30/02/2018'
      },
      {
        label: 'To',
        type: 'text',
        name: 'to',
        hint: "This is the last day you'll be working remotely as DD/MM/YYYY",
        placeholder: '31/02/2018'
      },
      {
        label: 'Hours Away',
        type: 'text',
        name: 'hours',
        hint: "Total number of hours you are requesting to work remotely",
        placeholder: '8'
      },
      {
        label: 'Description',
        type: 'textarea',
        name: 'description',
        hint: "Any useful information the producers or your manager needs to know",
      },
    ];
}

function formatChannelMessage(submission) {
  var dateString = formatRequestDateString(submission);
  return {
    "token": token,
    "channel": channel,
    "text":  dedent`<@${submission.person.id}> is intending to work remotely soon:
    
                    *When:* ${dateString}
                    *Hours:* ${submission.hours}
                    *Comments:* ${submission.description}`
  }
}

function formatRequestDateString(submission) {
  const from = moment(submission.from, 'DD/MM/YYYY');
  const to = moment(submission.to, 'DD/MM/YYYY');
  var dateString = from.format('ddd Do MMM');
  
  // only show the year if the request spans different years, 
  // or the request is not for the current year
  if(!from.isSame(to, 'year') || !from.isSame(moment(), 'year')) {
      dateString += ', ' + from.format('YYYY');
  }
  // only show the to date if the request spans several days
  if(!from.isSame(to, 'day')) {
      dateString += ' - ' + to.format('ddd Do MMM');
      if(!to.isSame(moment(), 'year')) {
          dateString += ', ' + to.format('YYYY')
      }
  }

  return dateString;
}

function formatThreadMessage(thread_ts, submission) {  
  return {
      "token": token,
      "channel": channel,
      "thread_ts": thread_ts,
      "text": dedent`Hey <!subteam^SC9MWQTK9>, if for some reason this timing \
                     doesn't work or you've got questions chat to \
                     <@${submission.person.id}>.`
  }
}

function postAcknowledgement(response_url) {
  return axios.post(response_url, { 
      text: dedent`Ace, a message has been posted to <#${channel}> letting \
                   the team know. Follow along there for updates.
                   
                   Make sure you update the <https://calendar.google.com/calendar/embed?src=paperkite.co.nz_125tm6jjfo4hc445ph2o89d1v8%40group.calendar.google.com&ctz=Pacific%2FAuckland|PaperKite calendar> too please!`, 
      response_type: "ephemeral" 
  });
}

function presentDialog(trigger_id, dialogPayload){
  const dialog = JSON.stringify(dialogPayload);
  return slack.dialog.open({ token, dialog, trigger_id });
}

function postToSlack(message) {
  console.log(`Posting message to ${message.channel}`, message);
  return slack.chat.postMessage(message).then((response) => {
      return response;
  })
}
module.exports = {
    handleActions,
    handleSubmission
}