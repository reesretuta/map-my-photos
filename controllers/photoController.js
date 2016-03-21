var ExifImage = require('exif').ExifImage;

var self = {
	addGPS: function(path){
				console.log('addGPS(): path:',path);
				try {
					new ExifImage({ image : path }, function (error, exifData) {
						if (error){
							console.log('Error: '+error.message);
							return false;
						}else{
							console.log(exifData.gps);
							return self.toDecimal(exifData.gps);						
						}
					});
				} catch (error) {
					console.log('catch error', error);
					return false;
				}
	},
	toDecimal: function(gps){
		var valid = true;
		"GPSLatitude,GPSLongitude,GPSLatitudeRef,GPSLongitudeRef".split(',').forEach(function(key){
			if (!gps.hasOwnProperty(key)) {
				valid = false;
			}
		});

		if (!valid) return false;


		return {
			position: {
				lat: gpsDecimal(gps.GPSLatitude[0],gps.GPSLatitude[1],gps.GPSLatitude[2],gps.GPSLatitudeRef),
				lng: gpsDecimal(gps.GPSLongitude[0],gps.GPSLongitude[1],gps.GPSLongitude[2],gps.GPSLongitudeRef)
			}
		};

		function gpsDecimal(deg, min, sec, hemi) {
		    d = deg+(((min*60)+(sec))/3600);
		    return (hemi=='S' || hemi=='W') ? d*=-1 : d;
		}
	}
}

module.exports = self;