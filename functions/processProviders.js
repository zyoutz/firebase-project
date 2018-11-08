'use strict';
//
// // The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
// const functions = require('firebase-functions');
//
// // The Firebase Admin SDK to access the Firebase Realtime Database.
// const admin = require('firebase-admin');
// admin.initializeApp();

const request = require('request');

request('https://data.medicare.gov/resource/ikq5-jt9b.json?$limit=10000', {json: true}, (err, res, body) => {
  if (err) {
    return console.error(err);
  }
  //
  // console.log(body.url);
  // console.log(body.explanation);

  for (let i = 0; i < body.length; i++) {
    console.log(body[i])
    console.log(body[i]['provider_name']);
  }
});
