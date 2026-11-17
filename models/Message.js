const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    email: {
        type: String,
        required: true,
        trim: true,
        maxlength: 254,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    text: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 2000
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Message", messageSchema);