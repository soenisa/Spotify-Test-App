
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
 * @return a collection of Tracks that fit within durationMSec
 */
module.exports.buildPlaylist = function(viableTracks, durationMSec) {
    var playlists = [];

    var playlist = {
        duration: 0,
        tracks: []
    }    

    function playlistBuilder(viableTracks, durationMSec, playlist) {
        if(viableTracks.length == 0)
            playlists.push(playlist);
        
        for(var i = 0; i < viableTracks.length; i++) {
            var randTrackIdx = Math.floor(Math.random() * Math.floor(viableTracks.length));
            var randTrack = viableTracks[randTrackIdx];
            var newDuration = durationMSec - randTrack.track.duration_ms;

            viableTracks = pruneViable(viableTracks.splice(randTrackIdx, 1), newDuration);
            playlist.duration+=randTrack.track.duration_ms;
            playlistBuilder(viableTracks, newDuration, playlist.tracks.push(randTrack));
        }
    }

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