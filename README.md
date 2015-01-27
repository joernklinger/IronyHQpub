IronyHQ: A set of tools that we use in our Sarcasm Detection Project for Tweets (python, node.js).

It contains of 3 parts:

1. Stream: Allows you to stream Tweets by keywords or location.
2. Annoation: Loads Tweets and offers a web interface for annotation. This is set up to work with Amazon's Mechanical Turk.
3. Processing: Goes through collected Tweets and for each Tweet finds the accounts that the author of that Tweet follows and adds them to the Tweet metadata.

Installation:

1. Clone the repository: 
	git clone https://github.com/joernklinger/IronyHQpub.git

2. Install MongoDB and create a database called 'IronyHQ', with a collection called 'tweets'.

3. Install the following Python modules:

	sys, tweepy, json, pymongo, re, argparse

4. In IronyHQ/Annoation:

	npm install

5. Enter your Twitter API credentials into IronyHQ/Credentials/twitter_accounts.json

6. Since IronyHQ uses https, you will an SSL certificate and key. The files go into IronyHQ/Credentials. You also need to put their names into IronyHQ/Annotation/annotate.js line 245.


Run (mongod needs to be running first):

1. Stream: In IronyHQ/Stream type

	python stream.py --account 0

	to stream using the account you entered into IronyHQ/Credentials/twitter_accounts, if you added multiple accounts and prefer to use a different one, you can use 1, 2,... instead of 0.

2. Annoation: In IronyHQ/Annoation type

	node annotate.js

	to start the Annotation server at your_ip:3000

	Note: You need to have some Tweets in the database first for this to work.
	Note2: You might need to forward incoming traffic to port 80 to port 3000 (which is used by node by default).

3. Processing: In IronyHQ/Processing type

	python get_followed_accounts.py --account 0

	to start processing collected Tweets using the account you entered into IronyHQ/Credentials/twitter_accounts, if you added multiple accounts and prefer to use a different one, you can use 1, 2,... instead of 0. Due to the limits of the Twitter API it makes sense to launch multiple instances of get_followed_accounts.py using different Twitter API credentials.

