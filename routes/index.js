var express = require('express');
var hash = require('pbkdf2-password')();
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var db;

var router = express.Router();

var url = 'mongodb://localhost:27017';
// Use connect method to connect to the server
MongoClient.connect(url, function(err, database) {
    assert.equal(null, err);
    console.log("Connected successfully to server");
    db =database;
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
    //console.log(req.session);
    res.send(new Buffer(req.session.user.name + ', your appointment is accept!'));
});

router.post('/makeappointment_from', restrict, function(req, res, next) {
    console.log('From_req_boyd:');
    console.log(req.body);
});
/* GET login page. */
router.get('/login', function(req, res,next) {
	  res.render('login',{message: res.locals.message});	
});


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
});

hash({ password: 'ivan' }, function (err, pass, salt, hash) {
    if (err) throw err;
    // store the salt & hash in the "db"
    users.he.salt = salt;
    users.he.hash = hash;
});

hash({ password: 'pan' }, function (err, pass, salt, hash) {
    if (err) throw err;
    // store the salt & hash in the "db"
    users.wl.salt = salt;
    users.wl.hash = hash;
});
// Authenticate using our plain-object database of doom!
function authenticate(name, pass, fn) {
    if (!module.parent) console.log('authenticating %s:%s', name, pass);
    var user = users[name];
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
});

router.get('/restricted', restrict, function(req, res){
    res.redirect('/');
    //res.send('Wahoo! restricted area, click to <a href="/logout">logout</a>');
});

module.exports = router;
