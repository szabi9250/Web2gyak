const mongoose = require("mongoose");

const sutiSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    nev: { type: String, required: true },
    tipus: String,
    dijazott: { type: Number, default: 0 }
});

module.exports = mongoose.model("Suti", sutiSchema);