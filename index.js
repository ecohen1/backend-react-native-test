var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var ALLCOORDS_COLLECTION = "allCoords";
var USERPAIRS_COLLECTION = "userPairs";
var USERMATCHES_COLLECTION = "userMatches";

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI, function (err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
});

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

//ROUTES:
app.get("/ping/:name", function(req, res) {
  var name = req.params.name;
  db.collection(ALLCOORDS_COLLECTION).find({}).toArray(function(err, docs) {
    if (err) {
      handleError(res, err.message, "Failed to get coords.");
    } else {
      var userCoords = {}
      for (var i=0;i<docs.length;i++){
        var d = docs[i];
        if (d.name == name){
          userCoords.lat = d.lat;
          userCoords.lng = d.lng;
        }
      }

      var closeUsers = [];
      for (var i=0;i<docs.length;i++){
        var d = docs[i];
        if (d.name != name){
          var distanceFromUser = Math.sqrt(Math.pow(d.lat-userCoords.lat,2)+Math.pow(d.lng-userCoords.lng,2));
          if (distanceFromUser < Infinity && closeUsers.indexOf(d.name) > -1){
            closeUsers.push(d.name);
          }
        }
      }
      
      db.collection(USERPAIRS_COLLECTION).update({name:name}, {$set: {pairs:closeUsers}}, function(err, doc) {
        if (err) {
          handleError(res, err.message, "Failed to update pairs.");
        } else {
          db.collection(USERPAIRS_COLLECTION).findOne({name:name}, function(err, doc) {
            if (err) {
              handleError(res, err.message, "Failed to get pairs.");
            } else {
              db.collection(USERMATCHES_COLLECTION).findOne({name:name}, function(err, doc2) {
                if (err) {
                  handleError(res, err.message, "Failed to get matches.");
                } else {
                  res.status(200).json({name:name,pairs:doc.pairs,matches:doc2.matches});
                }
              });
            }
          });
        }
      });
    }
  });
});

app.post("/ping/:name", function(req, res) {
  var name = req.params.name;
  var lat = req.body.lat;
  var lng = req.body.lng;

  db.collection(ALLCOORDS_COLLECTION).update({name: name}, {$set: {lat:lat,lng:lng}}, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to update coords");
    } else {
      res.status(200).json({name:name,lat:lat,lng:lng});
    }
  });
});


app.post("/pingback", function(req, res) {
  var fromUser = req.body.fromUser;
  var forUser = req.body.forUser;

  db.collection(USERMATCHES_COLLECTION).findOne({ name:fromUser }, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to find fromUser");
    } else {
      var matches = doc.matches;
      matches.push(forUser);
      db.collection(USERMATCHES_COLLECTION).update({name:fromUser}, {$set: {matches:matches}}, function(err, doc) {
        if (err) {
          handleError(res, err.message, "Failed to add forUser to fromUser");
        }
      });
    }
  });
  db.collection(USERMATCHES_COLLECTION).findOne({ name:forUser }, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to find forUser");
    } else {
      var matches = doc.matches;
      matches.push(fromUser);
      db.collection(USERMATCHES_COLLECTION).update({name:forUser}, {$set: {matches:matches}}, function(err, doc) {
        if (err) {
          handleError(res, err.message, "Failed to add fromUser to forUser");
        }
      });
    }
  });
  res.status(200).json({fromUser:fromUser,forUser:forUser});
});

app.post('/users/create/:name',function(req,res) {
  var name = req.params.name;
  db.collection(ALLCOORDS_COLLECTION).insertOne({name:name,lat:0,lng:0}, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to make coords.");
    } else {
      db.collection(USERPAIRS_COLLECTION).insertOne({name:name,pairs:[]}, function(err, doc) {
        if (err) {
          handleError(res, err.message, "Failed to make pairs.");
        } else {
          db.collection(USERMATCHES_COLLECTION).insertOne({name:name,matches:[]}, function(err, doc2) {
            if (err) {
              handleError(res, err.message, "Failed to make matches.");
            } else {
              res.status(200).json({name:name,pairs:doc.pairs,matches:doc2.matches});
            }
          });
        }
      });
    }
  });
});
