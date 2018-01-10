'use strict';

const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const simpleOauthModule = require('simple-oauth2');
const handlebars = require('handlebars');
const expressHandlebars = require('express-handlebars');

const timedPlaylist = require('./timed-playlist.js')
const secrets = require('../secrets.js');

const app = express();

var token;

// view engine initialization
app.engine('handlebars', expressHandlebars({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// bodyParser initialization
const jsonParser = bodyParser.json()
const urlencodedparser = bodyParser.urlencoded({ extended: false })

const oauth2 = simpleOauthModule.create({
  client: {
    id: secrets.client_id,
    secret: secrets.client_secret,
  },
  auth: {
    tokenHost: 'https://accounts.spotify.com',
    tokenPath: '/api/token',
    authorizePath: '/authorize',
  },
});

// Authorization uri definition
const authorizationUri = oauth2.authorizationCode.authorizeURL({
  response_type: 'code',
  scope: 'user-read-private user-read-email user-library-read',
  redirect_uri: secrets.redirect_uri,
  state: '3(#0/!~', // TODO: Generate a random string for this
});

// Initial page redirecting to Github
app.get('/auth', (req, res) => {
  res.redirect(authorizationUri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', (req, res) => {
  const code = req.query.code;
  const options = {
    code: req.query.code || null,
    redirect_uri: secrets.redirect_uri,
    grant_type: 'authorization-code'
  };

  oauth2.authorizationCode.getToken(options, (error, result) => {
    if (error) {
      console.error('Access Token Error', error.message);
      return res.json('Authentication failed');
    }

    token = oauth2.accessToken.create(result);

    res.render('loggedin')
  });
})

app.post('/timed_playlist', urlencodedparser, function (req, res) {
  var durationMSec = req.body.input_duration * 60 * 1000; // Convert min to ms

  var options = {
    url: 'https://api.spotify.com/v1/me/tracks',
    headers: {'Authorization': 'Bearer ' + token.token.access_token},
    json: true
  };

  // send request for user's saved tracks
  request.get(options, function(error, response, body) {
    var viableTracks = timedPlaylist.pruneViable(
      timedPlaylist.sortTracksByDuration(body.items), durationMSec);

      if(viableTracks.length != 0) {
        var playlists = timedPlaylist.buildPlaylist(viableTracks, durationMSec);
        console.log('Number of playlists: ' + playlists.length);
        console.log(playlists);
      }
  });


  res.render('timed_playlist', req.body);
})

app.get('/success', (req, res) => {
  res.send('');
});

app.get('/', (req, res) => {
  res.render('home');
});

app.listen(8888, () => {
  console.log('Express server started on port 8888'); // eslint-disable-line
});


// Credits to [@lazybean](https://github.com/lazybean)