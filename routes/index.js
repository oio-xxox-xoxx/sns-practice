const router = require("express").Router();
const { sns_controller } = require("../controller");

router.post("/api/sns/chk", sns_controller.ChkDuplicate);
router.post("/api/sns/signup", sns_controller.SignUp);
router.post("/api/sns/signin", sns_controller.SignIn);
router.get("/api/token/refresh", sns_controller.RefreshToken);

router.post("/api/sns/post/create", sns_controller.PostCreate);
router.post("/api/sns/post/update", sns_controller.PostUpdate);
router.post("/api/sns/post/delete", sns_controller.PostDelete);

router.module.exports = router;
