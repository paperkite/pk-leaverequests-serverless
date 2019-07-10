
const qs = require('querystring')
const EventRequests = require('./event_requests/actions');
const LeaveRequests = require('./leave_requests/actions');
const RemoteRequests = require('./remote_work_requests/actions');
const FlightRequests = require('./flight_requests/actions');


// The function that AWS Lambda will call
exports.handler = async (event, context, callback) => {
    console.log(qs.parse(event.body).payload);
    var payload = JSON.parse(qs.parse(event.body).payload);

    var statusCode = 200;
    var responseBody = { errors: [] }

    if ('dialog_submission' == payload.type) {
        if ('leave_request_request' == payload.callback_id) {
            responseBody = await LeaveRequests.handleSubmission(payload);
        }
        else if ('flight_request_request' == payload.callback_id) {
            responseBody = await FlightRequests.handleSubmission(payload);
        }
        else if ('remote_request_casual_submission' == payload.callback_id) {
            responseBody = await RemoteRequests.handleSubmission(payload);
        }
        else if ('event_request_request' == payload.callback_id) {
            responseBody = await EventRequests.handleSubmission(payload);
        }
        else {
            statusCode = 500
            console.error(`Unknown callback_id ${payload.callback_id}`, payload);
        }
    }
    else if ('block_actions' == payload.type) {
        const action = payload.actions[0].action_id;
        if (action.startsWith('leave_request')) {
            responseBody = await LeaveRequests.handleApproval(payload, payload.actions[0]);
        }
        else if (action.startsWith('remote_request')) {
            responseBody = await RemoteRequests.handleActions(payload, payload.actions[0]);
        }
        else if (action.startsWith('event_request')) {
            responseBody = await EventRequests.handleApproval(payload, payload.actions[0]);
        }
        else {
            statusCode = 500
            console.error(`Unknown block_actions`, payload);
        }
    }
    else {
        statusCode = 500
        console.error(`Unknown event type ${payload.type}`, payload);
    }

    const response = { statusCode };
    if (responseBody !== true) { response.body = JSON.stringify(responseBody); }
    callback(null, response);
};
