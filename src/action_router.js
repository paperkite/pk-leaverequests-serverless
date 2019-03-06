
const qs = require('querystring')
const LeaveRequests = require('./leave_requests/actions');


// The function that AWS Lambda will call
exports.handler = async (event, context, callback) => {
    var payload = JSON.parse(qs.parse(event.body).payload);

    var statusCode = 200;
    var responseBody = { errors: [  ] }

    if(payload.callback_id.startsWith('leave_request')) {
        if('dialog_submission' == payload.type) {
            responseBody = await LeaveRequests.handleSubmission(payload);
        }
        else if ('interactive_message' == payload.type) {
            const action = payload.actions.find(action => action.name == 'action');
            responseBody = await LeaveRequests.handleApproval(payload, action);
        }
    }
    else {
        console.error(`Unknown event type ${payload.callback_id}`, payload);
    }

    const response = { statusCode };
    if(responseBody !== true) { response.body = JSON.stringify(responseBody); }
    callback(null, response);
};
