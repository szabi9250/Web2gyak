
const mongoose = require("mongoose");

const arSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    sutiid: { type: Number, required: true },
    ertek: { type: Number, required: true },
    egyseg: { type: String, default: null }
});

module.exports = mongoose.model("Ar", arSchema);
