// Set up node modules
var express = require('express');
var app = express();
var mongoose = require('mongoose');
//var request = require('request');

var https = require('https');
// var http = require('http');
var fs = require('fs');

app.use(require('body-parser')());
app.use(require('cookie-parser')());

var handlebars = require('express-handlebars').create({
    defaultLayout: 'main',
    helpers: {
        section: function(name, options) {
            if (!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        }
    }
});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', process.env.PORT || 3000);

// Mongoose

mongoose.connect('mongodb://localhost/IronyHQ');
var db = mongoose.connection;


var turk_format_schema = new mongoose.Schema({
                                            id: String,
                                            screen_name: String,
                                            text: String,
                                            created_at: Number,
                                            user_desription: String,
                                            user_id: String,
                                            });
turk_format = mongoose.model('Turk_Format', turk_format_schema);

var TweetSchema = new mongoose.Schema({
                    turk_format: [turk_format_schema],
                    irony_judgment: [
                        {
                            irony: Number,
                            more_info: Number,
                            confidence: Number,
                            worker_id: String,
                            assignment_id: String,
                            hit_id: String
                        }],
                    tweet_id: String,
                    following: Object,
                    following_processed: Number,
                    irony_processed: Number,
                    being_annotated: Number,
                    processed_otherwise: Object,
                    raw: Object
                },
           { collection: 'tweets' });
tweets = mongoose.model('Tweet', TweetSchema);

// global variables
var last_tweet_id;
var current_tweet_irony_processed_count;
var answered = {};
var hit_info = {};

// Routes
// Dependes on whether it's a new user, and if not, how many Tweets
// he has already judged

app.get('/', function(req, res) {
    if (answered[req.query.workerId]) {
        console.log('worker exists');
        //if (answered[req.query.workerId] < 11) {
        if (answered[req.query.workerId] < 4) {
            console.log('here!');
            console.log('get random tweets: ' + req.query.workerId);
            console.log('less than 10 trials');
            getRandomTweet(res, req);
        } else {
            console.log('10 trials - aborting');
            renderOutro(res, req);
        }

    } else {
        console.log('new worker');
        answered[req.query.workerId] = 0;
        renderIntro(res, req);
    }
 });


app.post('/annotate', function(req, res) {
    var response = req.body.data;
    answered[req.body.workerIdPost]++;
    console.log(response);
    console.log('Questions answered: ' + answered[req.body.workerIdPost]);
    responseToDb(response);
});

// Render Intro and Outro


function renderIntro(res, req) {
    console.log('req.query :' + req.query);
    console.log('workerId: ' + req.query.workerId);
    console.log('hitId: ' + req.query.hitId);
    console.log('assignmentId: ' + req.query.assignmentId);
    hit_info[req.query.workerId] = [req.query.assignmentId, req.query.hitId];
    res.render('intro', {
        worker: req.query.workerId,
        introText: 'Trial 0, instructions',
        assignment: req.query.assignmentId
        }
    );
}

function renderOutro(res, req) {
    trial_to_show = answered[req.query.workerId] - 1;
    // reset that worker
    answered[req.query.workerId] = undefined;
    // Post to Turk that the HIT is over
    // hitFinished(hit_info[req.query.workerId]);
    res.render('outro', {
        worker: req.query.workerId,
        trial: trial_to_show,
        assignment: hit_info[req.query.workerId][0],
        hit: hit_info[req.query.workerId][1]
        }
    );
}

function getRandomTweet(res, req) {
    tweets.findOne(
        { $and: [
            { 'irony_processed': 0 },
            { 'being_annotated': 0 }
        ]},
        function(err, tweet) {
            current_tweet_irony_processed_count = tweet.irony_processed;
            console.log('Tweet with irony_processed: 0');
            beingAnnotated(tweet, res, req);
        }
    );
}

function getTweet(res, req) {
    tweets.findOne(
        { $and: [
            { 'irony_processed': 0 },
            { 'being_annotated': 0 },
            { 'following_processed': 1}
        ]},
        function(err, tweet) {
            if (tweet) {
                current_tweet_irony_processed_count = tweet.irony_processed;
                console.log('Tweet with irony_processed: 0, following_processed: 1');
                beingAnnotated(tweet, res, req);
            } else {
                getRandomTweet(res, req);
            }

        }
    );
}


function renderTweet(tweet, res, req) {
    console.log('Rendering Tweet: ' + tweet._id);
    last_tweet_id = tweet._id;
    res.render('home', {
        worker: req.query.workerId,
        id: tweet.tweet_id,
        text: tweet.turk_format[0].text,
        UserID: tweet.turk_format[0].user_id,
        name: tweet.turk_format[0].screen_name
        }
    );
}


function responseToDb(response) {
    tweets.findByIdAndUpdate(
            last_tweet_id,
            {
                $set: {
                    'being_annotated': current_tweet_irony_processed_count + 1,
                    'irony_processed': 1
                },
                $push: {
                    'irony_judgment':
                        {
                            'irony': response[0],
                            'more_info': response[1],
                            'confidence': response[2],
                            'worker_id': response[3],
                            'assignment_id': response[4],
                            'hit_id': response[5]
                    }
                }
            },
            {safe: true, upsert: true},
            function(err, model) {
                console.log(err);
            }
        );
}


// Get random Tweet that has not been annotated and is not being annotated
// right now
// user parseInt() when dealing with user/tweet ids


function beingAnnotated(tweet, res, req) {
    tweets.collection.update({'_id': tweet._id}, { $set: {'being_annotated': 1}},
        function() {
            renderTweet(tweet, res, req);
        });
    }



// findTweet() is a debugging function
function findTweet(tweet_id) {
    tweets.findOne(
                {'tweet_id': tweet_id},
                function(err, tweet) {
                    // set being_annotated = 1 for that tweet
                    console.log(tweet);
                    bernd = tweet;
    });
}

// Start server

// Add your key and certificate here
var options = {
  key: fs.readFileSync('../Credentials/your_certificate.key', 'utf8'),
  cert: fs.readFileSync('../Credentials/your_certificate.crt', 'utf8')
};

var httpsServer = https.createServer(options, app);
httpsServer.listen(3000);

function testDb() {
    tweets.findByIdAndUpdate(
            last_tweet_id,
            {
                $set: {
                    'being_annotated': 0,
                    'irony_processed': 1
                },
                $push: {
                    'irony_judgment':
                        {
                            'irony': 3030,
                            'more_info': 3030,
                            'confidence': 3030,
                            'worker_id': 'test',
                            'assignment_id': 'test',
                            'hit_id': 'test'
                    }
                }
            },
            {safe: true, upsert: true},
            function(err, model) {
                console.log(err);
            }
        );
}
