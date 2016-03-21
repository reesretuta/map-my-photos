var ExifImage = require('exif').ExifImage
,	express = require('express')
, 	fs = require('fs')
, 	async = require('async')
, 	app = express()
, 	asyncTasks = []
, 	cacheFile = "cache.js"
, 	basepath = __dirname
, 	cachedFiles = {}
, 	toDisplayFiles = {}
, 	localFiles = []
, 	newlyCachedFiles
, 	port = 8080
, 	baseurl = 'http://localhost:' + port;


app.use('/public', express.static(basepath + '/public'));



var toDecimal = function(gps){
		if (Object.getOwnPropertyNames(gps).length === 0){
			return false;
		}
		var valid = true;
		"GPSLatitude,GPSLongitude,GPSLatitudeRef,GPSLongitudeRef".split(',').forEach(function(key){
			if (!gps.hasOwnProperty(key)) {
				valid = false;
			}
		});
		if (!valid) return false;

		function gpsDecimal(deg, min, sec, hemi) {
		    d = deg+(((min*60)+(sec))/3600);
		    return (hemi=='S' || hemi=='W') ? d*=-1 : d;
		}

		return {
			position: {
				lat: gpsDecimal(gps.GPSLatitude[0],gps.GPSLatitude[1],gps.GPSLatitude[2],gps.GPSLatitudeRef),
				lng: gpsDecimal(gps.GPSLongitude[0],gps.GPSLongitude[1],gps.GPSLongitude[2],gps.GPSLongitudeRef)
			}
		};
	}

var readFile = function(file, options, callback) {
  if (callback == null) {
    callback = options
    options = {}
  }

  fs.readFile(file, options, function (err, data) {
    if (err) return callback(err)

    var obj
    try {
      obj = JSON.parse(data, options ? options.reviver : null)
    } catch (err2) {
      err2.message = file + ': ' + err2.message
      return callback(err2)
    }

    callback(null, obj)
  })
}

var writeFile = function(file, obj, options, callback) {
  if (callback == null) {
    callback = options
    options = {}
  }

  var spaces = typeof options === 'object' && options !== null
    ? 'spaces' in options
    ? options.spaces : this.spaces
    : this.spaces

  var str = ''
  try {
    str = JSON.stringify(obj, options ? options.replacer : null, spaces) + '\n'
  } catch (err) {
    if (callback) return callback(err, null)
  }

  fs.writeFile(file, str, options, callback)
}



var compareFiles = function(newFiles, cacheData){
		newlyCachedFileCount = 0;

		//compare newFiles versus cache
		for(path in newFiles){
			if (cacheData[path] === undefined) { //newFile not yet cached. may or may not have GPS data
				(function(path){
					asyncTasks.push(function(done){
						try {
							new ExifImage({ image : path }, function (error, exifData) { //kills time reading  bad photos
								if (error){
									console.log('Error: ', path, error.message);
									delete newFiles[path]; //not cached AND no gps info. we don't care to see this image
									done();
								}else{
									newFiles[path].googleMarker = toDecimal(exifData.gps);  //UPDATES NEWFILES OBJECT
									if (!newFiles[path].googleMarker) {
										console.log('No GPS data:', path);
										delete newFiles[path];
									}else{
										console.log('Successfully added:', path);
										newlyCachedFileCount++;
									}
									done();
								}
							});
						} catch (error) {
							console.log('ExifImage Error:', error);
							done();
						}
					});
				}(path));
			}else{
				newFiles[path] = cacheData[path]; //UPDATES NEWFILES OBJECT
			}
		}
		
		if (asyncTasks.length > 0) { //will test if new files have GPS data
			async.parallel(asyncTasks, function(err, results){
				if (err) {
					console.log(err);
				}
				console.log('new processed files count: ', newlyCachedFileCount);
				toDisplayFiles = newFiles;

				//save new files to cache
				for(path in newFiles){
					cacheData[path] = newFiles[path];
				}
				writeFile(cacheFile, cacheData);

			});
		}

}




var initApp = function(){
	

	//starting the app with new folders
	if (process.argv.length > 3 && process.argv[2].indexOf("add") > -1) {
		var newFiles = {}
		,	directoriesToAdd = [];

		for (var i = 3; i < process.argv.length; i++) {
			directoriesToAdd.push(process.argv[i] + "/");
		}

		directoriesToAdd.forEach(function(dir){
			addFiles(dir); //updates newFiles var
		});

		readFile(cacheFile, function(err, cacheData){
			if (err) {
				writeFile(cacheFile, {}, function(){
					compareFiles(newFiles, {});
				});
			}else{
				compareFiles(newFiles, cacheData);
			}
		});
	}
	function addFiles(dir){

		localFiles = fs.readdirSync(dir);
		localFiles.forEach(function(file){
			if (fs.lstatSync(dir + file).isDirectory()) {
				addFiles(dir + file + "/");
			}else{
				if (file.indexOf('.jpg') >= 0 || file.indexOf('.JPG') >= 0) {
					newFiles[dir + file] = {path: dir + file};
				}
			}
		});
	}

	//starting the app with no new folders
	if (process.argv.length === 2){
		readFile(cacheFile, function(err, cacheData){
			if (err) {
				writeFile(cacheFile, {}, function(){
					toDisplayFiles = {};
				});
			}else{
				toDisplayFiles = cacheData;
			}
		});
	}
	
	//starting the app deleting folders
	if (process.argv.length > 3 && process.argv[2].indexOf("delete") > -1) {
		var deleteCount = 0;
		var directoriesToDelete = [];
		for (var i = 3; i < process.argv.length; i++) {
			directoriesToDelete.push(process.argv[i]);
		}
		readFile(cacheFile, function(err, cacheData){
			if (err) {
				
			}else{
				for(path in cacheData){
					for (var i = 0; i < directoriesToDelete.length; i++) {
						if (path.indexOf(directoriesToDelete[i]) > -1) {
							delete cacheData[path];
							deleteCount++;
							break;
						}
					}

				}

				writeFile(cacheFile, cacheData, function(){
					toDisplayFiles = cacheData;
					console.log('removed ' +deleteCount+ ' files under:', directoriesToDelete);
				});

			}
		});
	}

	
}


initApp();


app.get('/directory', function(req, res) {
	res.json(toDisplayFiles);
});

app.get('/', function(req, res) {
	res.sendFile(basepath + '/public/index.html');
});



app.get('/photo',function(req, res){
	// var test = "/Users/reesretuta/Pictures/archive/2015/_unsorted/02\ feb/IMG_0480.JPG";
	if (req.query.path && typeof req.query.path === "string") {
		fs.readFile(req.query.path, function(err, data) {
			console.log('reading file:',req.query.path);
			if (err) {
				console.log(err);
			}

			//max-age=29030400 //1 year
			//max-age=604800 //1 week
			if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', 'public, max-age=29030400');
			// res.writeHead(200, {'Content-Type': 'text/html'});
			// res.write('<html><body>'+req.query.path+'<br/><img src="data:image/jpeg;base64,');
			// res.write(new Buffer(data).toString('base64'));
			// res.end('"/></body></html>');
			res.writeHead(200, {'Content-Type': 'image/jpeg'});
			res.end(data);
		});
	}
});



app.listen(port);
console.log("server listening on: "+baseurl);