const token = process.env.SLACK_ACCESS_TOKEN;
const channel = process.env.SLACK_CHANNEL;

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const slack = require('slack');
const moment = require('moment-timezone');

function loadOutstandingRequests(id) {
    const now = moment().tz('Pacific/Auckland').format();
    const last_hour = moment().tz('Pacific/Auckland').subtract(1, 'hour').format();
    return dynamo.scan({
        TableName: process.env.LEAVE_REQUESTS_DYNAMODB_TABLE,
        FilterExpression: 'approved_at = :approved_at AND created_at BETWEEN :last_hour AND :now',
        ExpressionAttributeValues: { ':approved_at': null, ':last_hour': last_hour, ':now': now }
    }).promise().then((response) => {
        console.log(response);
        return response
    });
}

module.exports.handle = async () => {

    const submission = await loadOutstandingRequests()

};