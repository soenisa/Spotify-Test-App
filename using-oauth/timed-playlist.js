var clone = require('clone');

/**
 * TODO: unnecessarily complex
 * Remove this function and replace instances with sort(compareTrackLength)
 * 
 * tracks : collection of tracks
 * @return Sorts tracks by duration, shortest to longest
 */
module.exports.sortTracksByDuration = function (tracks) {
  return tracks.sort(orderByTrackLength);
}

/**
 * tracks : collection of tracks sorted by track duration, shortest to longest
 * @return A copy that removes any songs from tracks whose time is greater than durationSec
 */
module.exports.pruneViable = function (tracks, durationMSec) {
  for (var i = 0; i < tracks.length; i++)
    if (durationMSec - tracks[i].track.duration_ms < -5000)
      if (i == 0)
        return [];
      else
        return tracks.slice(0, i);

  return tracks.slice();
}

/**
 * tracks: collection of tracks with length < targetDuration, sorted short->long
 * targetDuration: target playlist duration in milliseconds
 *  @return a collection of Tracks that fit within targetDuration
 */
module.exports.buildPlaylist = function (viableTracks, targetDuration) {
  var playlists = [];

  //  Selects a random track from viableTracks and adds it to the current playlist
  function selectRandom(allTracks, targetDuration, playlist = { duration: 0, tracks: [] }) {

    var usedIdxs = [];
    while (usedIdxs.length < allTracks.length) { // while unused tracks exist

      // select a random one, no repeats
      var randTrackIdx = -1;
      while (randTrackIdx == -1 || usedIdxs.includes(randTrackIdx))
        randTrackIdx = Math.floor(Math.random() * Math.floor(allTracks.length));
      // track the used ones
      usedIdxs.push(randTrackIdx)

      // copy the playlist as a new object
      var currPlaylist = clone(playlist);
      // update current playlist
      currPlaylist.tracks.push(allTracks[randTrackIdx].track);
      currPlaylist.duration += allTracks[randTrackIdx].track.duration_ms;
      //prune the tracks
      var viableTracks = module.exports.pruneViable(allTracks, targetDuration - currPlaylist.duration);
      // remove the viable track if it's still there
      if (randTrackIdx < viableTracks.length)
        viableTracks.splice(randTrackIdx, 1);
      // recurse into a new playlist
      selectRandom(viableTracks, targetDuration, currPlaylist);
    }
    // if all tracks have been used, or allTracks is empty then....
    // add the playlist to the global list?
    playlists.push(playlist);
  }
  selectRandom(viableTracks, targetDuration);

  // sort playlists by proximity to target duration
  playlists.sort(function (a, b) {
    let comparison = 0;
    let aDur = Math.abs(a.duration - targetDuration);
    let bDur = Math.abs(b.duration - targetDuration);
    if (aDur < bDur)
      comparison = -1;
    else if (aDur > bDur)
      comparison = 1;

    return comparison;
  });

  return playlists;
}


function orderByTrackLength(a, b) {
  let comparison = 0;
  if (a.track.duration_ms < b.track.duration_ms)
    comparison = -1;
  else if (b.track.duration_ms < a.track.duration_ms)
    comparison = 1;

  return comparison;
}