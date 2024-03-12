module.exports = (seqeulize, DataTypes) => {
  const user = seqeulize.define(
    "user",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      nickname: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      pw: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      profil_img_url: {
        type: DataTypes.STRING,
      },
    },

    {
      freezeTableName: true,
      timestamps: true,
    }
  );
  return user;
};
