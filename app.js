require('dotenv').config()
const express = require('express')
const ejs = require('ejs')
const bodyParser = require('body-parser')
const mongoose = require('mongoose');

// const encrypt = require('mongoose-encryption')
const md5 = require('md5')

//bcrypt and salting rounds for psswd security
const bcrypt = require('bcrypt');
const saltRounds = 10;

//using passport and express-session session and cookies module
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')

//using passport and google OAuth
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');



const app = express();

//middleware
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}))
app.set("view engine", "ejs")


//passport and express-session code should be coded before the routes
app.use(session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: false
    
  }));

app.use(passport.initialize());
app.use(passport.session());


//Routes

app.get("/", (req,res)=>{
    res.render("home");
})



//setup route for sign in with google
app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] }));

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect("/secrets");
  });

 



app.get("/login", (req,res)=>{
    res.render("login");
})

app.get("/register", (req,res)=>{
    res.render("register");
})


//creating a secrets route
app.get("/secrets", (req,res)=>{

    User.find({"secret":{$ne:null}})
        .then((foundUsers) => {
            if (foundUsers) {
                res.render("secrets", {userWithSecrets: foundUsers})
            
                
            }
        })
        .catch((err) => {
    
    
            console.log(err);
            
        });
    })
    // if(req.isAuthenticated()){
    //     res.render("secrets");
    // }
    // else{
    //     res.redirect("/login")
    // }



//submit route for submitting secrets
app.get("/submit", (req,res)=>{
    if(req.isAuthenticated()){
        res.render("submit");
    }
    else{
        res.redirect("/login")
    }

})

//post route to post our secrets
app.post("/submit", (req,res)=>{

    const submittedSecret = req.body.secret;
    console.log(req.user.id);

    User.find(req.user.id)
    .then((foundUser) => {
        if (foundUser) {
            foundUser.secret = submittedSecret;
            foundUser.save(()=>{
                res.redirect("/secrets")
            })
            
        }
    })
    .catch((err) => {


        console.log(err);
        
    });
    

})




//logout route; uses a callback function  
app.get("/logout", (req,res)=>{

    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
})



//to access the .env file content
// console.log(process.env.SECRET) 



//conecting to mongoDB using mongoose
mongoose.connect("mongodb://127.0.0.1:27017/userDB");

//using mongoose-encryption npm package
const userSchema =  new mongoose.Schema({
    email: String,
    password: String,
    googleId:String,
    secret: String
  });

//using passport-local-mongoose plugin
userSchema.plugin(passportLocalMongoose);

//using mongoose-findorcreate as a plugin
userSchema.plugin(findOrCreate);


//mongoose-encryption npm docs
  
// userSchema.plugin(encrypt, { secret:process.env.SECRET , encryptedFields:['password']});

  
const User = mongoose.model('User', userSchema);


//passport-local config
passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

//passport serializer and seserializer for both google and local
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {

      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

//passport and Google OAuth middleware setup
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



//post Route for register form
app.post("/register", (req,res)=>{

    User.register({username:req.body.username}, req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    })

    

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {

    //     const newUser = new User ({
    //         email:req.body.username,
    //         password:hash
    //     })
    
    //     newUser.save()
    //     res.render("secrets")
       
    // });

})

// post Route for login page
app.post("/login", function (req, res) {

    const user = new User({
        username: req.body.username,
        password:req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets")
            })
        }
    })
    // const username = req.body.username;
    // const password = req.body.password;

    // User.findOne({ email: username })
        // .then((foundUser) => {
        //     if (foundUser) {
        //         bcrypt.compare(password, foundUser.password, function(err, result) {
        //             if(result === true){
        //                 res.render("secrets");

        //             }
        //         }); 
                    
                
        //     }
        // })
        // .catch((err) => {


        //     console.log(err);
            
        // });

});



  








app.listen(3000, function () {
    console.log("The server is running on port 3000...")
})