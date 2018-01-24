'use strict';

const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const simpleOauthModule = require('simple-oauth2');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');


const handlebars = require('handlebars');
const expressHandlebars = require('express-handlebars');
const hbsHelpers = require('./helpers/handlebars/hbs-common.js');

const timedPlaylist = require('./timed-playlist.js')
const secrets = require('../secrets.js');

const stateKey = 'spotify_auth_state';
const accessKey = 'spotify_access_token';
const refreshKey = 'spotify_refresh_token';

const app = express();

// view engine initialization
app.engine('handlebars', expressHandlebars({ defaultLayout: 'main', helpers: hbsHelpers }));
app.set('view engine', 'handlebars');
app.use(cookieParser());

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

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function (length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};


// Initial page redirecting to Spotify
app.get('/auth', (req, res) => {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // Authorization uri definition
  var authorizationUri = oauth2.authorizationCode.authorizeURL({
    response_type: 'code',
    scope: 'user-read-private user-read-email user-library-read playlist-modify-private',
    redirect_uri: secrets.redirect_uri,
    state: state, // TODO: Generate a random string for this
  });

  console.log('Redirecting to Spotify Authorization...');
  res.redirect(authorizationUri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', (req, res) => {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    req.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);

    // TODO: finish cookie token storage implementation

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

      var token = oauth2.accessToken.create(result);
      res.cookie(accessKey, token.token.access_token);
      res.cookie(refreshKey, token.token.refresh_token);

      res.render('loggedin');
    });
  }
})

app.post('/timed_playlist', urlencodedparser, function (req, res) {
  var accessToken = req.cookies ? req.cookies[accessKey] : null;

  if (accessToken === null)
    res.redirect('/auth');
  else {
    var durationMSec = req.body.input_duration * 60 * 1000; // Convert min to ms
    var inputName = req.body.playlist_name != "" ? req.body.playlist_name : "Timed Playlist " + req.body.input_duration + ":00";
    var playlists = [];
    var playlist
    var options = {
      headers: { 'Authorization': 'Bearer ' + accessToken },
      json: true
    };

    var generateTracklist = () => {
      return new Promise(function (resolve, reject) {
        // send request for user's saved tracks
        console.log('Doing the generateTracklist');
        options.url = 'https://api.spotify.com/v1/me/tracks';
        request.get(options, function (error, response, body) {
          if (!error && response.statusCode === 200) {

            var viableTracks = timedPlaylist.pruneViable(
              timedPlaylist.sortTracksByDuration(body.items), durationMSec);

            if (viableTracks.length != 0) {
              playlists = timedPlaylist.buildPlaylist(viableTracks, durationMSec);
              console.log('Finished building playlist');
              console.log('Number of playlists: ' + playlists.length);

              resolve(playlists[0]);
            }
          } else // TODO: go over each API call and make sure rejections are handled correctly i.e. successful statusCodes, extra info etc
            reject({ error: error, body: body });
        });
      });
    }

    var getUserID = () => {
      return new Promise(function (resolve, reject) {
        // get the spotify userID of the user
        console.log('Doing the getUserID');
        options.url = 'https://api.spotify.com/v1/me';

        request.get(options, function (error, response, body) {
          if (!error && response.statusCode === 200)
            resolve(body.id);
          else
            reject({ error: error, body: body });
        });
      });
    }

    var createPlaylist = (userID, playlistName) => {
      return new Promise(function (resolve, reject) {
        //create a playlist in the user's profile
        console.log('Doing the createPlaylist');
        options.url = 'https://api.spotify.com/v1/users/' + userID + '/playlists';
        var bodyData = {
          name: playlistName,
          public: false
        };

        options.body = bodyData;
        request.post(options, function (error, response, body) {
          if (!error && (response.statusCode === 200 || response.statusCode === 201)) {
            console.log('Playlist "%s" created successfully', body.name);
            resolve(body);
          } else {
            reject({ error: error, body: body });
          }
        })
      });
    }

    /**
     * A chain of promises to get the user's ID and create a new playlist
     * based on the default or given playlist name
     */
    var createPlaylistFlow = () => {
      return getUserID().then(function (userID) {
        return createPlaylist(userID, inputName);
      }).then(function (body) {
        return body;
      }).catch((errorObj) => {
        console.log('ERROR! unspecified error');
        // console.log("ERROR! Promise rejected with response status code %d. Included message: %s", errorObj.body.statusCode, errorObj.error.message);
      });
    };

    var addTracks = (playlistBody, trackUris) => {
      return new Promise(function (resolve, reject) {
        //asume URIs are valid

        options.url = "https://api.spotify.com/v1/users/" + playlistBody.owner.id + "/playlists/" + playlistBody.id + "/tracks";
        options.body = { uris: trackUris };
        request.post(options, function (error, response, body) {
          if (!error && response.statusCode === 201) {
            console.log('Tracks added!');
            res.json('Tracks added!');
          } else {
            reject({ error: error, body: body })
          }
        })
      });
    }

    // generateTracklist().then(function (resolvedPlaylist) {
    //   console.log('the resolved playlist has a duration of ' + resolvedPlaylist.duration);

    //   res.render('timed_playlist', {
    //     difference: Math.abs(durationMSec - resolvedPlaylist.duration),
    //     playlist: resolvedPlaylist
    //   });
    // })

    Promise.all([createPlaylistFlow(), generateTracklist()]).then(function (values) {
      debugger;
      console.log('Both promises completed successfully!');
      // Add songs to playlist
      return addTracks(values[0], values[1].tracks);

    })

  }
})

app.get('/clear_cookies', function (req, res) {
  res.clearCookie(accessKey);
  res.clearCookie(refreshKey);
});

app.get('/success', (req, res) => {
  res.send('');
});

app.get('/', (req, res) => {
  res.render('home');
});

var server = app.listen(8888, () => {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);  // eslint-disable-line
});


// Credits to [@lazybean](https://github.com/lazybean)