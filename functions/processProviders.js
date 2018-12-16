'use strict';

// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
const request = require('request');

try {
  admin.initializeApp();
} catch (e) {}

const db = admin.database();
const ref = db.ref('providers');

exports.processProviders = functions.runWith({memory: '2GB', timeoutSeconds: 540}).https.onRequest(async (req, res) => {
  let success_count = 0;
  let failure_count = 0;
  const limit = 50000;
  let offset = 0;
  let process = true;

  while (process) {
    request(`https://data.medicare.gov/resource/ikq5-jt9b.json?$limit=${limit}&$offset=${offset}`, {json: true}, (err, res, body) => {
      if (err) {
        return console.error(err);
      }
      // console.log(body.url);
      // console.log(body.explanation);

      console.info('Processing providers');

      for (let i = 0; i < body.length; i++) {
        try {
          let provider = {
            name: body[i]['provider_name'],
            location: {
              address: body[i]['provider_address'],
              city: body[i]['provider_city'],
              state: body[i]['provider_state'],
              zip: body[i]['provider_zip_code'],
              coordinates: {
                longitude: 'unknown',
                latitude: 'unknown',
              },
            },
          };

          if ('location' in body[i]) {
            if ('coordinates' in body[i]['location']) {
              provider['location']['coordinates']['longitude'] = body[i]['location']['coordinates'][0];
              provider['location']['coordinates']['latitude'] = body[i]['location']['coordinates'][1];
            }
          }

          ref.child(body[i]['federal_provider_number']).set(provider);
          console.debug('Successfully set provider: ' + body[i]['federal_provider_number']);
          success_count++;
        } catch (e) {
          console.error('Failed to add provider to datastore' + e);
          console.debug(body[i]);
          failure_count++;
        }
      }
      if (body.length < limit) {
        process = false;
      }
    });
    offset = offset + limit;
  }
  console.info('Providers success: ' + success_count + ' ; Providers failure: ' + failure_count);
  res.send({details: 'Providers Processed', success: success_count, failure: failure_count});
});
