const db = require("../models");
const bcrypt = require("bcryptjs");
const { QueryTypes } = require("sequelize");
const shortid = require("shortid");
const { jwt, redis } = require("../utils");
const sns_user = require("../models/sns_user");

module.exports = {
  ChkDuplicate: async (req, res) => {
    try {
      let { chk_type, chk_value } = req.body;
      let db_con = {};
      if (chk_type == "user_id") {
        db_con = {
          where: {
            user_id: chk_value,
          },
        };
      } else if (chk_type == "nickname") {
        db_con = {
          where: {
            nickname: chk_value,
          },
        };
      } else if (chk_type == "email") {
        db_con = {
          where: {
            email: chk_value,
          },
        };
      } else {
        return res.json({ alert: "chk_type" });
      }

      const duplicate = await db.sns_user.findOne(db_con);
      if (duplicate != null) {
        return res.json({ duplicate: true });
      }
      return res.json({ duplicate: false });
    } catch (error) {
      return res.json({ error: error.toString() });
    }
  },

  SignUp: async (req, res) => {
    try {
      req.body.pw = bcrypt.hashSync(req.body.pw, bcrypt.genSaltSync(8));
      req.body.id = shortid.generate();
      let { nickname, email } = req.body;
      await db.sns_user.create(req.body);

      return res.json({ result: "성공적으로 가입이 완료되었습니다." });
    } catch (error) {
      return res.json({ error: error.toString() });
    }
  },

  SignIn: async (req, res) => {
    try {
      let { id, pw } = req.body;
      const user = await db.sns_user.findOne({
        where: {
          user_id: id,
        },
      });
      if (user == null) {
        return res.json({ result: "없는 아이디" });
      }
      let refresh_token = jwt.CreateRefreshToken({
        id: user.id,
      });

      await redis.SetRedis({
        key: refresh_token,
        value: user.id,
      });
      if (bcrypt.compareSync(pw, user.pw)) {
        return res.json({
          nickname: user.nickname,
          access_token: jwt.CreateToken({
            id: user.id,
            nickname: user.nickname,
          }),
          refresh_token: refresh_token,
        });
      }
      return res.json({ result: "비밀번호 틀림" });
    } catch (error) {
      return res.json({ error: error.toString() });
    }
  },

  RefreshToken: async (req, res) => {
    try {
      let { authorization } = req.headers;
      const redis_data = await redis.GetRedis(authorization);
      if (redis_data == null) {
        return res.json({
          error: "invaild token",
        });
      }
      let decoded = jwt.VerifyRefreshToken(authorization);
      if (decoded.id != redis_data) {
        return res.json({
          error: "invaild token",
        });
      }
      const user = await db.sns_user.findOne({
        where: {
          id: decoded.id,
        },
      });

      return res.json({
        access_token: jwt.CreateToken({
          id: user.id,
          nickname: user.nickname,
        }),
      });
    } catch (error) {
      return res.json({
        error: error.toString(),
      });
    }
  },

  PostCreate: async (req, res) => {
    const tx = await db.sequelize.transaction();
    try {
      let { desc } = req.body;
      let { img_url } = req.body;
      let { authorization } = req.headers;
      let decoded = jwt.VerifyToken(authorization);
      let user_id = decoded.user_id;
      await db.sns_post.create(
        {
          id: shortid.generate(),
          user_id: user_id,
          desc: desc,
          img_url: img_url,
        },

        {
          transaction: tx,
        }
      );

      await db.sns_user.update(
        { post_count: db.sequelize.literal("post_count+1") },
        { where: { id: user_id }, transaction: tx }
      );
      await tx.commit();
      return res.json({ result: "업로드 완료" });
    } catch (error) {
      await tx.rollback();
      return res.json({ error: error.toString() });
    }
  },

  UserStatus: async (req, res) => {
    try {
      let { authorization } = req.headers;
      let decoded = jwt.VerifyToken(authorization);
      console.log(decoded);
      const user = await db.sns_user.findOne({
        where: {
          id: decoded.id,
        },
      });
      const follow = await db.fallow.findAll({
        where: {
          id: decoded.id,
        },
      });

      return res.json({
        user: user,
        follow: follow,
      });
    } catch (error) {
      return res.json({ error: error.toString() });
    }
  },

  PostUpdate: async (req, res) => {
    try {
      let { post_id, desc, img } = req.body;
      let { authorization } = req.headers;
      let decoded = jwt.VerifyToken(authorization);
      let user_id = decoded.user_id;
      await db.sns_post.update(
        {
          desc: desc,
          img_url: img,
        },
        {
          where: {
            id: post_id,
            user_id: user_id,
          },
        }
      );
      return res.json({ result: "수정 완료" });
    } catch (error) {
      return res.json({ error: error.toString() });
    }
  },

  PostDelete: async (req, res) => {
    const tx = await db.sequelize.transaction();
    try {
      let { post_id } = req.body;
      let { authorization } = req.headers;
      let decoded = jwt.VerifyToken(authorization);
      let user_id = decoded.user_id;

      await db.sns_post.destroy({
        where: {
          id: post_id,
          user_id: user_id,
        },
        transaction: tx,
      });
      await db.sns_user.update(
        { post_count: db.sequelize.literal("post_count-1") },
        { where: { id: user_id }, transaction: tx }
      );
      await tx.commit();
      return res.json({ result: "게시물 삭제 완료" });
    } catch (error) {
      await tx.rollback();
      return res.json({ error: error.toString() });
    }
  },
};
