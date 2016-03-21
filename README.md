#Map My Photos
Who wants to rely on iPhoto simply to browse geo-tagged photos on a map? --no one.  Importing your 400 GB photo collection to iPhoto will result in an **additional** 400 GB of space to be consumed.  Map My Photos allows you to browse your geo-tagged photos on a map without the heavy overhead of third party apps like iPhoto.

### Building/Installing Project

* clone project locally `git clone ... && cd map-my-photos`
* install node dependencies `npm install`
* start app: `node app.js --add /path/to/folder1 /path/to/folder2` (drag/drop desired folder(s) paths into terminal)
* load `http://localhost:8080` in browser
* magic :)
* kill app with `ctrl + c`

### Restarting Project
* to restart app run: `node app.js` will use history of all previously added folder(s)
* optional: add additional folders until your entire photo collection is mapped!

### To remove folders from cache
* run `node app.js --delete /path/to/folder1 /path/to/folder2` (or a single top-level/root folder will delete all files within it)

### Under the hood
The app parses your photos GPS info and caches only the GPS info and unique local system file path in a cache.js file.... a 400 GB photo collection can theoretically result in only a 10mb cache file!  This cache file will prevent the need to directly read files that have previously been added.

On the front-end, photo's are fetched with a server specified header Cache-Control of max-age equally 1 year.  Thus browsers will fetch from cache to display photos and also avoid direct file reads each time (of course you can clear browser cache at anytime)

![Screenshot](/screenshots/screenshot2.png "Screenshot")

### Notes
* if you get the error: `(libuv) kqueue(): Too many open files in system`, then do `lsof | wc -l` to see your Mac Systems maximum number of open files allowed by the system. Change to `ulimit -n #####` if desired, otherwise try not to process folders with more than the system allowed max files open photos at a time)
* using nodemon over node known to cause issues when updating cache file