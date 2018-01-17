function playlistBuilder(allTracks, targetDuration)  {

}


/**
 * Selects a random track from viableTracks and adds it to the current playlist
 * @param {*} currPlaylist 
 * @param {*} viableTracks 
 * @param {*} targetDuration 
 */
function selectRandom(playlist, allTracks, targetDuration) {
    var usedIdxs = [];
    while(usedIdxs.length < allTracks.length){ // while unused tracks exist
        // select a random one, no repeats
        var randTrackIdx = -1;
        while(randTrackIdx == -1 || usedIdxs.includes(randTrackIdx))
            randTrackIdx = Math.floor(Math.random() * Math.floor(allTracks.length));
        // track the used ones
        usedIdxs.push(randTrackIdx)

        // copy the playlist as a new object
        var currentPlaylist = Object.assign({}, playlist);
        // update current playlist
        currPlaylist.push(allTracks[randTrackIdx]);
        currPlaylist.duration+=allTracks[randTrackIdx].duration_ms;
        //prune the tracks
        var viableTracks = module.exports.pruneViable(allTracks, targetDuration-currPlaylist.duration);
        // remove the viable track if it's still there
        if(randTrackIdx < viableTracks.length)
            viableTracks.splice(randTrackIdx, 1);
        // recurse into a new playlist
        selectRandom(currPlaylist, viableTracks, targetDuration);
    }
    // if all tracks have been used, or allTracks is empty then....
    // add the playlist to the global list?
    playlists.push(playlist);
}