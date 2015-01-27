from pymongo import MongoClient
import pdb
import re
import tweepy
import time
import json
import argparse


# parse arguments

parser = argparse.ArgumentParser(description='Twitter Processor (following).')
parser.add_argument('--account')
opts = parser.parse_args()

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

# Create the Tweepy instance
auth = tweepy.OAuthHandler(consumer_key, consumer_secret)
auth.set_access_token(access_key, access_secret)
api = tweepy.API(auth)

# Connect to MongoDB
client = MongoClient('localhost', 27017)
db = client['IronyHQ']
tweets = db.tweets
users = db.users

# Get accounts followed for a user
def get_accounts_followed():
    while 1:
        tweet = tweets.find_one({'$and': [{'irony_judgment': {'$ne': []}}, {'following_processed': 0}]})
        if not tweet:
            tweet = tweets.find_one({'following_processed': 0})
        if tweet:
            status = api.rate_limit_status()
            if (status['resources']['friends']['/friends/ids']['remaining'] > 0):
                    accounts_followed = api.friends_ids(tweet['turk_format']['user_id'])
                    tweets.update({'_id': tweet['_id']}, {'$set': {'following': accounts_followed, 'following_processed': 1}})
                    print('Processing Tweet ' + str(tweet['tweet_id']))
            else:
                print('Maximum requests reached... waiting')
                print('time: ' + str(time.localtime()[3:5]))
                time.sleep(60)

if __name__ == '__main__':
    get_accounts_followed()
