const User = require("../models/User");
const bcrypt = require("bcrypt");
const Suti = require("../models/Suti");
const Ar = require("../models/Ar");
const Tartalom = require("../models/Tartalom");
const Message = require("../models/Message");
const { randomBytes } = require("node:crypto");

exports.homeIndex = (req, res) => { res.render("home"); };
exports.userIndex = (req, res) => { res.render("user"); };
exports.adminIndex = (req, res) => { res.render("admin"); };

exports.contactIndex = (req, res) => {
    res.render("contact", {
        errors: [],
        form: {
            name: "",
            email: "",
            text: ""
        }
    });
};

exports.contactPost = async (req, res) => {
    const form = {
        name: typeof req.body?.name === "string"
            ? req.body.name.trim()
            : "",
        email: typeof req.body?.email === "string"
            ? req.body.email.trim()
            : "",
        text: typeof req.body?.text === "string"
            ? req.body.text.trim()
            : ""
    };

    const errors = [];

    if (form.name.length < 2 || form.name.length > 100) {
        errors.push("A név hossza 2 és 100 karakter között legyen!");
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
        form.email.length > 254 ||
        !emailPattern.test(form.email)
    ) {
        errors.push("Adj meg egy érvényes e-mail-címet!");
    }

    if (form.text.length < 10 || form.text.length > 2000) {
        errors.push("Az üzenet hossza 10 és 2000 karakter között legyen!");
    }

    if (errors.length > 0) {
        return res.status(400).render("contact", {
            errors,
            form
        });
    }

    try {
        await Message.create({
            name: form.name,
            email: form.email,
            text: form.text
        });

        req.session.message = "Az üzenetedet sikeresen elküldtük!";
        return res.redirect("/contact");
    } catch (error) {
        console.error("Üzenet mentési hiba:", error);

        return res.status(500).render("contact", {
            errors: [
                "Az üzenet mentése nem sikerült. Próbáld újra később!"
            ],
            form
        });
    }
};

exports.crudIndex = async (req, res) => {
    const { arId } = req.params;

    const [arak, sutik] = await Promise.all([
        Ar.find().sort({ id: 1 }).lean(),
        Suti.find().sort({ nev: 1 }).lean()
    ]);

    const szerkesztettAr = arId
        ? arak.find(ar => String(ar._id) === arId)
        : null;

    if (arId && !szerkesztettAr) {
        return res.status(404).send("Az ár nem található.");
    }

    const sutiNevek = new Map(sutik.map(suti => [suti.id, suti.nev]));
    req.session.crudToken ??= randomBytes(32).toString("hex");

    res.render("crud", {
        arak,
        sutik,
        sutiNevek,
        szerkesztettAr,
        crudToken: req.session.crudToken
    });
};

exports.crudSave = async (req, res) => {
    const { arId } = req.params;
    const { id, sutiid, ertek, egyseg, crudToken } = req.body ?? {};

    if (!req.session.crudToken || crudToken !== req.session.crudToken) {
        return res.status(403).send("Érvénytelen űrlap. Nyisd meg újra a CRUD oldalt.");
    }

    if (arId && !/^[a-f\d]{24}$/i.test(arId)) {
        return res.status(404).send("Az ár nem található.");
    }

    const isInteger = value =>
        typeof value === "string" &&
        /^\d+$/.test(value) &&
        Number.isSafeInteger(Number(value));

    const unit = typeof egyseg === "string" ? egyseg.trim() : "";
    const formUrl = arId ? `/crud/${arId}/edit` : "/crud";

    if ((!arId && (!isInteger(id) || Number(id) < 1)) ||
        !isInteger(sutiid) || Number(sutiid) < 1 ||
        !isInteger(ertek) || unit.length > 50) {
        req.session.message = "Ellenőrizd az azonosítót, az árat és az egységet.";
        return res.redirect(303, formUrl);
    }

    if (!(await Suti.exists({ id: Number(sutiid) }))) {
        req.session.message = "Válassz egy létező süteményt.";
        return res.redirect(303, formUrl);
    }

    const adatok = {
        sutiid: Number(sutiid),
        ertek: Number(ertek),
        egyseg: unit || null
    };

    try {
        if (arId) {
            const eredmeny = await Ar.updateOne(
                { _id: arId },
                { $set: adatok },
                { runValidators: true }
            );

            if (eredmeny.matchedCount === 0) {
                return res.status(404).send("Az ár nem található.");
            }
        } else {
            await Ar.create({ id: Number(id), ...adatok });
        }
    } catch (error) {
        if (error.code !== 11000) throw error;

        req.session.message = "Ez az árazonosító már foglalt.";
        return res.redirect(303, formUrl);
    }

    req.session.message = arId ? "Az ár módosítva." : "Az új ár elmentve.";
    return res.redirect(303, "/crud");
};

exports.crudDelete = async (req, res) => {
    const { arId } = req.params;
    const { crudToken } = req.body ?? {};

    if (!req.session.crudToken || crudToken !== req.session.crudToken) {
        return res.status(403).send("Érvénytelen űrlap. Nyisd meg újra a CRUD oldalt.");
    }

    if (!/^[a-f\d]{24}$/i.test(arId)) {
        return res.status(404).send("Az ár nem található.");
    }

    const eredmeny = await Ar.deleteOne({ _id: arId });

    if (eredmeny.deletedCount === 0) {
        return res.status(404).send("Az ár nem található.");
    }

    req.session.message = "Az ár törölve.";
    return res.redirect(303, "/crud");
};

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

exports.messagesIndex = async (req, res) => {
    try {
        const messages = await Message.find()
            .sort({ createdAt: -1, _id: -1 })
            .lean();

        res.render("messages", {
            messages
        });
    } catch (error) {
        console.error("Üzenetek lekérdezési hiba:", error);

        res.status(500).send(
            "Hiba történt az üzenetek betöltésekor!"
        );
    }
};

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