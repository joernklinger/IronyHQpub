# Run:
# python stream.py --account account_nr (0 = joern, 1 = byron)

# import modules
import sys
import tweepy
import json
import pdb
from pymongo import MongoClient
import re
import argparse

# Parse arguments
parser = argparse.ArgumentParser(description='Tweepy Stream.')
parser.add_argument('--account')
opts = parser.parse_args()
# pdb.set_trace()

use_account = int(opts.account)

# Load account info from file

account_file = open('../Credentials/twitter_accounts.json', 'r')
all_accounts = json.load(account_file)
account = all_accounts[use_account]
account_file.close()

consumer_key = account['consumer_key']
consumer_secret = account['consumer_secret']
access_key = account['access_key']
access_secret = account['access_secret']

# Authentication, API
auth = tweepy.OAuthHandler(consumer_key, consumer_secret)
auth.set_access_token(access_key, access_secret)
api = tweepy.API(auth)

# Connect to MongoDB
client = MongoClient('127.0.0.1', 27017)
db = client['IronyHQ']
tweets = db.tweets

# load settings
g = open('settings.json', 'r')
settings = json.load(g)
g.close()


# This is the streamer
class CustomStreamListener(tweepy.StreamListener):
    def on_status(self, status):
        print status.text

    def on_data(self, data):
        data_json = json.loads(data)
        post = {
            'turk_format': {
                'id': str(data_json['id']),
                'screen_name': data_json['user']['screen_name'],
                'text': process_tweet(data_json['text']),
                'created_at': data_json['created_at'],
                'user_description': data_json['user']['description'],
                'user_id': str(data_json['user']['id']),
            },
            'irony_judgment': [],
            'tweet_id': str(data_json['id']),
            'following': [],
            'following_processed': 0,
            'irony_processed': 0,
            'being_annotated': 0,
            'processed_otherwise': [],
            'raw': data_json
        }
        print(post)
        tweets.insert(post)
        print('tweet added to db')

    def on_error(self, status_code):
        print >> sys.stderr, 'error code:', status_code
        return True

    def on_timeout(self):
        print >> sys.stderr, 'timeout'
        return True


def get_tweets(settings):
    sapi = tweepy.streaming.Stream(auth, CustomStreamListener())
    if settings['method'] == 'terms':
        sapi.filter(track=settings['terms'])
    elif settings['method'] == 'location':
        sapi.filter(locations=settings['location'])


def process_tweet(tweet):
    # process the tweets
    #Convert to lower case
    tweet = tweet.lower()
    #Remove additional white spaces
    tweet = re.sub(r'#([^\s]+)', r'\1', tweet)
    #trim
    tweet = tweet.strip('\'"')
    return tweet
#end

if __name__ == '__main__':
    get_tweets(settings)
