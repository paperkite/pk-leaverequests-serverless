# Leave Request Slack App

Based on the [serverless framework](https://serverless.com) this Slack App
makes the process of requesting leave at PK at bit easier. It enables a
slash command `/request_leave` to present a dialog requesting information
about the leave being requested, and then sends that request on to be approved
by folks in a `#leave_requests` channel. 

It stores information about each request in DynamoDB since so once a request is
approved a message can be sent back to the requester letting them know to 
submit the leave in Smart Payroll.

It also uses AWS SSM Parameter Store for keeping the Slack App secrets away 
from version control, since technically anyone could use that to funnel 
messages into the slack org.

## Flow

1. _Requester_ types `/request_leave` anywhere in Slack.
1. A Dialog is presented asking for the type of leave, the start and end dates,
   the number of hours needed, and an optional description for the reason
1. The request is posted into a shared `#leave_requests` channel to be 
   validated by whoever is responsible for managing leave approvals. In PK's 
   case this is our Producer team usually. A thread is started for each request
   so the discussion on approval is localised per request.
1. Slack Action buttons for Approve and Decline are attached to the message, so
   once a decision is made an _Approver_ can select the appropriate action.
1. The buttons cause a message to be posted to the thread stating whether the 
   request was approved or declined (and by whom), and a DM is also sent to the 
   _Requester_ to let them know the outcome.

## Limitations

It does not presently deal with verification and signing of requests from the 
Slack API. Because it's using Lambda & API Gateway its not super 
straightforward to get access to the raw request body to reconstruct the 
signature.

The _Requester_ still has to submit the request formally though the payroll
tool. In our case Smart Payroll does not have an API we can use for this.

It also presently doesn't really do any validation that the dates are in the
future, land on a work day, take into account holidays, or validate that the 
hours requested make sense. These are all good ideas for future enhancements.

Ideally this would also tie into the payroll and forecasting systems 
automatically, but baby steps.

## Running locally

You'll need to install the `serverless` module from npm, which you can do with

```bash
npm install -g serverless
```

If you are a PK person, you'll need to have the `pk-internal` AWS profile 
configured first. 

Then it should be as simple as:

```bash
AWS_PROFILE=pk-internal serverless invoke local --function app-reviews
```

## Using this yourself

You'll probably want to fork this repo and edit the `serverless.yml` to use 
your own AWS account, and set up a Slack App and put the credentials into
Parameter Store as needed. 

At the moment the messaging sent into the channels is hard coded into the 
source. These could be externalised into a `config.json` or something. 

PRs welcome!