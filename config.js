import fs from 'fs';

const SECRETS = JSON.parse(fs.readFileSync('secrets.json'));

const CONFIG = {
  EVENTBRITE_TOKEN: process.env['EVENTBRITE_TOKEN'] || SECRETS.EVENTBRITE_TOKEN,
};

export default CONFIG;