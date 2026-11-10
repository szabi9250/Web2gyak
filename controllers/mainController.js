const User = require("../models/User");
const bcrypt = require("bcrypt");
const Suti = require("../models/Suti");
const Ar = require("../models/Ar");
const Tartalom = require("../models/Tartalom");

exports.homeIndex = (req, res) => { res.render("home"); };
exports.userIndex = (req, res) => { res.render("user"); };
exports.adminIndex = (req, res) => { res.render("admin"); };
exports.contactIndex = (req, res) => { res.render("contact"); };
exports.crudIndex = (req, res) => { res.render("crud"); };
exports.databaseIndex = async (req, res) => {
    try {
        const arak = await Ar.find().sort({ id: 1 }).lean();
        const sutik = await Suti.find().lean();
        const tartalmak = await Tartalom.find().lean();

        const sutiMap = new Map(
            sutik.map(suti => [suti.id, suti])
        );

        const tartalomMap = new Map();

        tartalmak.forEach(t => {
            if (!tartalomMap.has(t.sutiid)) {
                tartalomMap.set(t.sutiid, []);
            }

            tartalomMap.get(t.sutiid).push(t.mentes);
        });

        const sorok = arak.map(ar => {
            const suti = sutiMap.get(ar.sutiid);

            return {
                nev: suti ? suti.nev : "Ismeretlen sütemény",
                tartalom: (tartalomMap.get(ar.sutiid) || [])
                    .filter(Boolean)
                    .join(", "),
                ar: ar.ertek,
                egyseg: ar.egyseg || "-"
            };
        });

        res.render("database", {
            sorok: sorok
        });

    } catch (error) {
        console.error("Adatbázis lekérdezési hiba:", error);
        res.status(500).send("Hiba történt az adatok betöltésekor!");
    }
};

exports.diagramIndex = async (req, res) => {
    try {
        const statisztika = await Suti.aggregate([
            {
                $group: {
                    _id: "$tipus",
                    darab: { $sum: 1 }
                }
            },
            {
                $sort: { darab: -1 }
            }
        ]);

        const labels = statisztika.map(item => item._id);
        const adatok = statisztika.map(item => item.darab);

        res.render("diagram", {
            labels,
            adatok
        });

    } catch (error) {
        console.error("Diagram lekérdezési hiba:", error);
        res.status(500).send("Hiba történt a diagram betöltésekor!");
    }
};

exports.messagesIndex = (req, res) => { res.render("messages"); };


exports.registerGet = (req, res) => { res.render("register"); };
exports.registerPost = async (req, res) => {
    const existingUser = await User.findOne({ username: req.body.username });
    if (existingUser) {
        req.session.message = "Ez a felhasználó már létezik!";
        return res.redirect("/register");
    }
    const hash = await bcrypt.hash(req.body.password, 10);
    await User.create({ username: req.body.username, password: hash, role: "user" });
    req.session.message = "Sikeres regisztráció.";
    res.redirect("/login");
};

exports.loginGet = (req, res) => { res.render("login"); };
exports.loginPost = async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user) {
        req.session.message = "Sikertelen bejelentkezés!";
        return res.redirect("/login");
    }
    const ok = await bcrypt.compare(req.body.password, user.password);
    if (!ok) {
        req.session.message = "Login failed!";
        return res.redirect("/login");
    }
    req.session.user = { id: user._id, username: user.username, role: user.role };
    if (user.role === "admin") {
        res.redirect("/admin");
    } else {
        res.redirect("/user");
    }
};
exports.logout = (req, res) => {
    req.session.destroy(() => { res.redirect("/"); });
};