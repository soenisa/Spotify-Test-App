
/**
 * tracks : collection of tracks
 * @return Sorts tracks by duration, shortest to longest
 */
module.exports.sortTracksByDuration = function(tracks) {
    tracks.sort(compareTrackLength);
    return tracks;
}
 
/**
 * tracks : collection of tracks sorted by track duration, shortest to longest
 * @return Removes any songs from tracks whose time is greater than durationSec
 */
module.exports.pruneViable = function(tracks, durationMSec) {
    for(var i = 0; i < tracks.length; i++)
        if(durationMSec - tracks[i].track.duration_ms < -5000)
            if(i == 0)
                return [];
            else   
                return tracks.slice(0,i);
    
    return tracks;
}

/**
 * tracks: collection of tracks with length < targetDuration, sorted short->long
 * targetDuration: target playlist duration in milliseconds
 *  @return a collection of Tracks that fit within targetDuration
 */
module.exports.buildPlaylist = function(viableTracks, targetDuration) {
    var playlists = [];

    function playlistBuilder(viableTracks, targetDuration, playlistIdx = -1) {
        console.log('Working with playlist index ' + playlistIdx +
        '\nNumber of viableTracks: ' + viableTracks.length);

        for(var i = 0; i < viableTracks.length; i++) {
            if(playlistIdx < 0) { // if root track, push a new playlist
                playlistIdx = i;
                playlists.push({
                    duration: 0,
                    tracks: []
                });
            } else if(playlists[playlistIdx]){
                
            }

            var randTrackIdx = Math.floor(Math.random() * Math.floor(viableTracks.length));
            var randTrack = viableTracks[randTrackIdx].track;
            playlists[playlistIdx].duration+=randTrack.duration_ms;
            playlists[playlistIdx].tracks.push(randTrack);

            var newDuration = targetDuration - randTrack.duration_ms;

            var newViableTracks = viableTracks.slice(); // copy to new array
            newViableTracks.splice(randTrackIdx, 1);
            newViableTracks = module.exports.pruneViable(newViableTracks, newDuration);

            if(newViableTracks.length != 0){
                playlistBuilder(newViableTracks, newDuration, playlistIdx);
            }
        }
    }
    debugger;
    playlistBuilder(viableTracks, targetDuration);

    return playlists;
}



function compareTrackLength(a, b) {
    let comparison = 0;
    if(a.track.duration_ms < b.track.duration_ms)
        comparison = -1;
    else if(b.track.duration_ms < a.track.duration_ms)
        comparison =  1;

    return comparison;
}