require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const { MongoStore } = require('connect-mongo');
const seedDatabaseIfEmpty = require('./seed');

const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.SESSION_MONGO_URI || process.env.MONGO_URI, 
        collectionName: "sessions"
    })
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user;
    res.locals.message = req.session.message || "";
    req.session.message = "";
    next();
});

app.use("/", require("./routes/mainRouter"));

const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB is connected.");

        await seedDatabaseIfEmpty();

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Server: http://localhost:${port}`);
        });

    } catch (err) {
        console.error("Hiba a szerver indítása során:", err.message);
        process.exit(1);
    }
};

startServer();