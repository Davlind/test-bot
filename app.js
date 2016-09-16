var restify = require('restify');
var builder = require('botbuilder');
var text2num = require('text2num');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

// Create LUIS recognizer that points at our model and add it as the root '/' dialog for our Cortana Bot.
var model = process.env.model || 'https://api.projectoxford.ai/luis/v1/application?id=8d23f865-ed7c-4d43-a69b-f82ef808039f&subscription-key=2a1e847dd45e471da9835a1ff1aec0c2&q=';
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);

// Add intent handlers
dialog.matches('Deploy', [
    function (session, args, next) {
        // Resolve and store any entities passed from LUIS.
        var environment = builder.EntityRecognizer.findEntity(args.entities, 'Environment');
        var deployment = session.dialogData.deployment = {
          environment: environment ? environment.entity : null
        };
        
        // Prompt for title
        if (!deployment.environment) {
            builder.Prompts.text(session, 'What environment would you like to deploy to?');
        } else {
            next();
        }
    },
    function (session, results, next) {
        var deployment = session.dialogData.deployment;
        if (results.response) {
            deployment.environment = results.response;
        }

        session.send('Deploying to environment: %s', deployment.environment)
    }]);

// Add intent handlers
dialog.matches('ShowCheckins', [
    function (session, args, next) {
        // Resolve and store any entities passed from LUIS.

        var count = builder.EntityRecognizer.findEntity(args.entities, 'builtin.number');
        var person = builder.EntityRecognizer.findEntity(args.entities, 'Person');
        var checkin = session.dialogData.checkin = {
          count: count ? count.entity : 1,
          person: person ? person.entity : null
        };

        if (isNaN(parseFloat(checkin.count)) || !isFinite(checkin.count)) {
            checkin.count = text2num(checkin.count);
        }
        
        var output;
        if (checkin.count == 1) {
            output = "Showing the last checkin committed";
        } else {
            output = "Showing the " + checkin.count + " last checkins committed";
        }
         
        var friendlyName = (checkin.person == 'me' || checkin.person == session.message.user.name.toLowerCase()) ? 'you' : checkin.person;
        if (checkin.person !== null) {
            output += " by " + friendlyName;
        }

        session.send(output);
    }
    ]);

dialog.onDefault(builder.DialogAction.send("I'm sorry I don't understand..."));

