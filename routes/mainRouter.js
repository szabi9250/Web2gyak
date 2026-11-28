
const router = require("express").Router();
const controller = require("../controllers/mainController");

isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect("/login");
};

isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === "admin") {
        return next();
    }
    res.redirect("/");
};

router.get("/", controller.homeIndex);
router.get("/register", controller.registerGet);
router.post("/register", controller.registerPost);
router.get("/login", controller.loginGet);
router.post("/login", controller.loginPost);
router.get("/logout", controller.logout);
router.get("/user", isLoggedIn, controller.userIndex);

router.get("/admin", isAdmin, controller.adminIndex);
router.get("/database", controller.databaseIndex);
router.get("/contact", controller.contactIndex);
router.post("/contact", controller.contactPost);
router.get("/diagram", controller.diagramIndex);
router.get("/messages", isLoggedIn, controller.messagesIndex);
router.get("/crud", isAdmin, controller.crudIndex);
router.post("/crud", isAdmin, controller.crudSave);
router.get("/crud/:arId/edit", isAdmin, controller.crudIndex);
router.post("/crud/:arId/edit", isAdmin, controller.crudSave);
router.post("/crud/:arId/delete", isAdmin, controller.crudDelete);

module.exports = router;
