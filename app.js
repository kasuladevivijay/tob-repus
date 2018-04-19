/*-----------------------------------------------------------------------------
A simple Language Understanding (LUIS) bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require('botbuilder-azure');
var axios = require('axios');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
	console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
	appId: process.env.MicrosoftAppId,
	appPassword: process.env.MicrosoftAppPassword,
	openIdMetadata: process.env.BotOpenIdMetadata
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
 * Bot Storage: This is a great spot to register the private state storage for your bot. 
 * We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
 * For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
 * ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({
	gzipData: false
}, azureTableClient);

// Create your bot with a function to receive messages from the user
// This default message handler is invoked if the user's utterance doesn't
// match any intents handled by other dialogs.
var bot = new builder.UniversalBot(connector, function (session, args) {
	session.send('You reached the default message handler. You said \'%s\' %s.', session.message.text, args);
});

bot.set('storage', tableStorage);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(recognizer);

// Add a dialog for each intent that the LUIS app recognizes.
// See https://docs.microsoft.com/en-us/bot-framework/nodejs/bot-builder-nodejs-recognize-intent-luis 

// Weather


bot.dialog('GreetingDialog',
	(session, args) => {
		let time = args.intent.entities[0].entity;
		const date = new Date();
		let now = `${date.getHours()+5.30}:${date.getMinutes()}:${date.getSeconds()}`;
		if(time) {
			if(0 < date.getHours()+5.30 < 12 ) {
				session.send(`Time is now ${now}, Good Morning`);
			}else if(12 < date.getHours()+5.30 < 16 ){
				session.send(`Time is now ${now}, Good Afternoon`);
			}else if(16 < date.getHours()+5.30 < 20) {
				session.send(`Time is now ${now}, Good Evening`);
			}else {
				session.send(`Time is now ${now}, Good Night`);
			}
		}else {
			if(session.message.text === 'hi' || session.message.text === 'hello'){
				session.send('Yo!');
			}
		}
		session.endDialog();
	}
).triggerAction({
	matches: 'Greeting'
});

bot.dialog('HelpDialog',
	(session) => {
		session.send('You reached the Help intent. You said \'%s\'.', session.message.text);
		session.endDialog();
	}
).triggerAction({
	matches: 'Help'
});

bot.dialog('WeatherDialog',
	(session, args) => {
		const city = args.intent.entities[0].entity;
		const geocodeUrl = `http://maps.googleapis.com/maps/api/geocode/json?address=${city}`;
		axios.get(geocodeUrl)
			.then((response) => {
				if (response.data.status === 'ZERO_RESULTS') {
					throw new Error('unable to find the address');
				} else if(response.data.status === 'OVER_QUERY_LIMIT'){
					throw new Error('exceeded request limit');
				}
				let lat = response.data.results[0].geometry.location.lat;
				let lng = response.data.results[0].geometry.location.lng;
				const weatherUrl = `https://api.darksky.net/forecast/338f91d839d33c71c80184854527c2eb/${lat},${lng}`;
				session.send(`Location: ${response.data.results[0].formatted_address}`);
				return axios.get(weatherUrl);
			})
			.then((response) => {
				// console.log(JSON.stringify({
				//     temperature: response.data.currently.temperature,
				//     feelsLike: response.data.currently.apparentTemperature
				// }, '', 4));
				session.send(`Temperature is ${response.data.currently.temperature} but 
                                feels like ${response.data.currently.apparentTemperature}`);
			})
			.catch((e) => {
				if (e.code === 'ENOTFOUND') {
					session.send('unable to connect to the API servers');
				} else {
					session.send(e.message);
				}
			});
		session.endDialog();
	}).triggerAction({
	matches: 'Weather.GetForecast'
});

bot.dialog('CancelDialog',
	(session) => {
		session.send('You reached the Cancel intent. You said \'%s\'.', session.message.text);
		session.endDialog();
	}
).triggerAction({
	matches: 'Cancel'
});

//  Currency Conversion; Base currency - USD

bot.dialog('CurrencyDialog', (session, args) => {
	session.send('You said \'%s\' %s.', session.message.text, args);
	session.endDialog();
}).triggerAction({
	matches: 'Currency.Exchange'
});