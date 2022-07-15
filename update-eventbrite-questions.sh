echo "Get Private Token from https://www.eventbrite.com/platform/api-keys"
read -s -p "Enter Private Token:" EVENTBRITE_TOKEN 
export EVENTBRITE_TOKEN

node ./update-eventbrite-questions.js $*

unset EVENTBRITE_TOKEN
