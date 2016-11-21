var express = require('express');
var app = express();
var port = process.env.PORT || 3000;
var bodyParser = require("body-parser");
var mongoose = require('mongoose');
mongoose.connect('mongodb://react-native:react-native@ds153637.mlab.com:53637/react-native');

var geoSchema = new mongoose.Schema({
        name: String,
            lat: Number,
                long: Number
});
var Geo = mongoose.model('Geo',geoSchema);

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app
.get('/',function(req,res){
   Geo.find({},function(err,data){
       if (!err){
        res.send(JSON.stringify(data));
       }else{
        res.send("error");
       }
    });
})
.post('/',function(req,res){
    name = req.body.name;
    lat = req.body.lat;
    lng = req.body.lng;
    Geo.findOne({"name":name},function(err,res){
        console.log(res);
        if (res){
            res.lat = lat;
            res.long = long;
        }
        else {
            newGeo = new Geo({
                name:name,
                lat:lat,
                long:lng
            });
            newGeo.save(function(err,data){
                if (err){res.send(err)}
                else {res.send(data)}
            });
        }
    });
});

app.listen(port);
