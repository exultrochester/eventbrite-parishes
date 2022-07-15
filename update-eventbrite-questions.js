#!/usr/bin/env node

import { promises as fs } from 'fs';
import fetch from 'node-fetch';
import CONFIG from './config.js';

const { EVENTBRITE_TOKEN } = CONFIG;

const OTHER = '(Other)';

// https://kigiri.github.io/fetch/

/**
 * @typedef HtmlText
 * @property {string?} html
 * @property {string?} text
 */

/**
 * @typedef EventbriteQuestionChoice
 * @property {HtmlText} answer
 * @property {string} id
 */

/**
 * @typedef EventbriteQuestionProps
 * @property {EventbriteQuestionChoice[]} choices
 * @property {string} id
 */

/**
 * @typedef {Object<string, Object> & EventbriteQuestionProps} EventbriteQuestion
 */

/**
 * 
 * @param {string} eventId 
 * @param {Object<string, Object>} body
 * @throws {Error}
 * @return {EventbriteQuestion}
 */
const postQuestion = async (eventId, body) => {
  console.log(`Posting question for event ${eventId}:\n${JSON.stringify(body, null, 2)}`);

  const response = await fetch(
    `https://www.eventbriteapi.com/v3/events/${eventId}/questions/`,
    {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${EVENTBRITE_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: "POST"
    }
  );
  const responseJson = await response.json();
  if (!response.ok) {
    throw new Error(`EventBrite Error ${responseJson.error} (${response.status}): ${responseJson.error_description}`);
  }
  return responseJson;
};

const getQuestions = (eventId) => fetch(
  `https://www.eventbriteapi.com/v3/events/${eventId}/questions/`,
  {
    headers: {
      Authorization: `Bearer ${EVENTBRITE_TOKEN}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "GET"
  }
)


/**
 * 
 * @param {EventbriteQuestion} question
 */
export const findParishQuestionOtherChoice = (question) => {
  const otherChoice = question.choices.find(choice => choice.answer.text === OTHER);
  return otherChoice.id;
}

/**
 * 
 * @param {string} parishQuestionId 
 * @param {string} otherChoiceId 
 * @returns {EventbriteQuestion}
 */
const makeParishSubQuestion = (parishQuestionId, otherChoiceId) => {
  const question = {
    question: htmlText('Where do you go to church?'),
    type: "text",
    required: true,
    parent_id: parishQuestionId,
    parent_choice_id: otherChoiceId,
    choices: [],
    ticket_classes: [],
    respondent: "attendee",
    display_answer_on_order: false,
  }
  return { question };
}

/**
 * 
 * @param {string} text 
 * @returns {HtmlText}
 */
const htmlText = (text) => ({
  // text,
  html: text,
});

export const questionOption = (text, subQuestionId) => ({
  answer: htmlText(text),
  // subquestion_ids: subQuestionId ? [ subQuestionId ] : [],
});

/*
    {
      "question": {
        "text": "Parish",
        "html": "Parish"
      },
      "type": "dropdown",
      "required": true,
      "choices": [
        {
          "answer": {
            "text": "(Other)",
            "html": "(Other)"
          },
          "id": "308023129",
          "subquestion_ids": [
            "95973919"
          ]
        },
        {
          "answer": {
            "text": "Abbey of the Genesee (Piffard)",
            "html": "Abbey of the Genesee (Piffard)"
          },
          "id": "308023139",
          "subquestion_ids": []
        },
      ]
    }
*/

const makeParishQuestion = (parishes) => {
  const choices = [
    questionOption(OTHER),
    ...parishes.map(name => questionOption(name)),
  ];
  const question = {
    question: htmlText('Parish'),
    type: 'dropdown',
    required: true,
    respondent: "attendee",
    choices,
    ticket_classes: [],
    display_answer_on_order: false,
  };
  return { question };
}

export const setupParishQuestion = async (eventId, parishes) => {
  const questionRequest = makeParishQuestion(parishes);

  const parishQuestion = await postQuestion(eventId, questionRequest);
  console.log(`Made question!\n${JSON.stringify(parishQuestion, null, 2)}`);
  const questionId = parishQuestion.id;
  const otherOptionId = findParishQuestionOtherChoice(parishQuestion);
  const subQuesitonRequest = makeParishSubQuestion(questionId, otherOptionId);
  console.log(`Sub-question request:\n${subQuesitonRequest}`);

  const subQuestion = await postQuestion(eventId, subQuesitonRequest);
  console.log(`Made sub-question!\n${JSON.stringify(subQuestion, null, 2)}`);
}

/*
 * 374762373347 - 2022 In-person
 * 374768070387 - 2022 Livestream
 */
const main = async () => {
  try {
    const ALL_PARISHES = JSON.parse(await fs.readFile('./all-parishes.json'));
    console.log('Args:');
    process.argv.forEach((value, index) => console.log(`${index}: ${value}`));
    const eventIds = process.argv.slice(2)
    console.log('Event IDs:', eventIds);
    for (let i = 0; i < eventIds.length; i += 1) {
      const eventId = eventIds[i];
      await setupParishQuestion(eventId, ALL_PARISHES);
    }
  } catch (err) {
    console.error('Failed:', err);
  }
}

if (true) {
  main();
}
