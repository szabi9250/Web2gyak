const mongoose = require("mongoose");

const tartalomSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    sutiid: { type: Number, required: true },
    mentes: { type: String, default: null } 
});

module.exports = mongoose.model("Tartalom", tartalomSchema);