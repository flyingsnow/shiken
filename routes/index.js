var express = require('express');
var hash = require('pbkdf2-password')();
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var db;

var router = express.Router();

var url = 'mongodb://localhost:27017/mydb';
// Use connect method to connect to the server
MongoClient.connect(url, function(err, database) {
    assert.equal(null, err);
    console.log("Connected successfully to server");
    db = database;
});

function restrict(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Access denied!';
        res.redirect('/login');
    }
}

/* GET home page. */
router.get('/', restrict, function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/appointment', restrict, function(req, res, next) {
    res.render('appointment', { title: 'Appointment' });
});

router.post('/makeappointment', restrict, function(req, res, next) {
    var appointmentInfo = req.body;
    appointmentInfo.user = req.session.user.name;
    // appointmentInfo.userId = req.session.user._id;
    db.collection('users').findOne({"name":appointmentInfo.user}, (err, user) => {
        if (user) {
            appointmentInfo.userId = user._id;
            console.log('user id: '+ user._id);
            db.collection('appointment').save(appointmentInfo, (err, result) => {
                if (err) return console.log(err);
                console.log('saved to database');
            });
            //console.log(req.session);
            res.send(new Buffer(req.session.user.name + ', your appointment is accept!'));
        }
        else {
            console.log('user name error ');
        }
    });
});

/* GET join page. */
router.get('/join', function(
req, res,next) {
	  res.render('join',{});	
});

router.post('/join', function(req, res){
    var user = req.body;
    db.collection('users').count({"name":user.name}, (err, count) => {
        console.log("username : " + user.name);
        console.log("count: " + count);
        if (err) return console.log(err);
        if ( count > 0 ) {
	          res.render('join',{message: 'username in used.'});	
            return console.log("username is in used");
        }
        else {
            hash({ password: user.password }, function (err, pass, salt, hash) {
                if (err) throw err;
                // store the salt & hash in the "db"
                user.salt = salt;
                user.hash = hash;
                db.collection('users').save(user, (err, result) => {
                    if (err) return console.log(err);
                    console.log('saved to database');
                    res.redirect('/login');
                });
            });
        }
    });
});

/* GET login page. */
router.get('/login', function(req, res,next) {
	  res.render('login',{message: res.locals.message});	
});

/*
var users = {
    tj: { name: 'tj' },
    he: { name: 'he' },
    wl: { name: 'wl' }
};

// when you create a user, generate a salt
// and hash the password ('foobar' is the pass here)
hash({ password: 'foobar' }, function (err, pass, salt, hash) {
    if (err) throw err;
    // store the salt & hash in the "db"
    users.tj.salt = salt;
    users.tj.hash = hash;
    db.collection('users').save(users.tj, (err, result) => {
        if (err) return console.log(err);
        console.log('saved to database');
    });
});

hash({ password: 'ivan' }, function (err, pass, salt, hash) {
    if (err) throw err;
    // store the salt & hash in the "db"
    users.he.salt = salt;
    users.he.hash = hash;
    db.collection('users').save(users.he, (err, result) => {
        if (err) return console.log(err);
        console.log('saved to database');
    });
});

hash({ password: 'pan' }, function (err, pass, salt, hash) {
    if (err) throw err;
    // store the salt & hash in the "db"
    users.wl.salt = salt;
    users.wl.hash = hash;
    db.collection('users').save(users.wl, (err, result) => {
        if (err) return console.log(err);
        console.log('saved to database');
    });
});
*/

// Authenticate using our plain-object database of doom!
function authenticate(name, pass, fn) {

    db.collection('users').findOne({"name":name}, (err, user) => {
        if (user) {
            if (!module.parent) console.log('authenticating %s:%s', name, pass);
            //var user = users[name];
            // query the db for the given username
            if (!user) return fn(new Error('cannot find user'));
            // apply the same algorithm to the POSTed password, applying
            // the hash against the pass / salt, if there is a match we
            // found the user
            hash({ password: pass, salt: user.salt }, function (err, pass, salt, hash) {
                if (err) return fn(err);
                if (hash == user.hash) return fn(null, user);
                fn(new Error('invalid password'));
            });
        }
        else {
            return fn(new Error('user name not exists'));
        }
    });
}



router.post('/login', function(req, res){
    authenticate(req.body.username, req.body.password, function(err, user){
        if (user) {
            //console.log('authenticating %s:%s',req.body.username , req.body.password );
            // Regenerate session when signing in
            // to prevent fixation
            req.session.regenerate(function(){
                // Store the user's primary key
                // in the session store to be retrieved,
                // or in this case the entire user object
                req.session.user = user;
                req.session.success = 'Authenticated as ' + user.name
                    + ' click to <a href="/logout">logout</a>. '
                    + ' You may now access <a href="/restricted">/restricted</a>.';
                res.redirect('/restricted');
            });
        } else {req.session.error = 'Authentication failed, please check your '
                + ' username and password.'
                + ' (use "tj" and "foobar")';
            res.redirect('/login');
        }
    });
});

router.get('/logout', function(req, res){
    // destroy the user's session to log them out
    // will be re-created next request
    req.session.destroy(function(){
        res.redirect('/');
    });
})

router.get('/restricted', restrict, function(req, res){
    res.redirect('/list');
    //res.send('Wahoo! restricted area, click to <a href="/logout">logout</a>');
});

router.get('/list', restrict, function(req, res){
    db.collection('appointment').find().toArray(function(err, results) {
        console.log(results);
        // send HTML file populated with quotes here
    });

    res.render('appointment_list', {});
    //res.send('Wahoo! restricted area, click to <a href="/logout">logout</a>');
});
module.exports = router;
