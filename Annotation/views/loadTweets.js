// Script to populate the database with Tweets from JSON file
// RUN FROM NODE REPL!


// Get modules
var express = require('express');
var mongoose = require('mongoose');
var jf = require('jsonfile');
var util = require('util');


// Set up the MongoDB
mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
var Tweet;
db.on('error', console.error);
db.once('open', function() {
    var TweetSchema = new mongoose.Schema({
    id: { type: Number, index: true },
    name: {type: String},
    text: {type: String},
    timestamp_ms: { type: String },
    UserID: Number,
    Irony: Number,
    Annotator: { type: String },
    MoreInfo: Number,
    Confidence: Number
    });
    Tweet = mongoose.model('Tweet', TweetSchema);
});

// Load the Tweets from JSON
// This is synchronous at the moment, causes problems, but we can run it from the shell (getting the tweets is not the objective here anyway)
var file = 'tweets.json';
var Tweets = {};
Tweets = jf.readFileSync(file);



 // ###

function addTweet(tweetToAdd) {

    var newTweet = new Tweet({
        id: tweetToAdd.id,
        name: tweetToAdd.user.screen_name,
        text: tweetToAdd.text,
        timestamp_ms: tweetToAdd.timestamp_ms,
        UserID: tweetToAdd.user.id,
        Irony: 9,
        Annotator: 'Not Annotated',
        MoreInfo : 9,
        Confidence: 9
    });

    var upsertData = newTweet.toObject();
    delete upsertData._id;
    
    Tweet.update({id: newTweet.id}, upsertData, { upsert: true }, function() {
        console.log('New Tweet Added');
        });
}


function TweetsToDb(tweetsToAdd) {
	for (var t in tweetsToAdd) {
		console.log('Nr: ' + t);
		addTweet(tweetsToAdd[t]);
	}
}

TweetsToDb(Tweets);

