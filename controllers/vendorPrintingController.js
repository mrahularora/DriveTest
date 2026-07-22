const UserAccount = require("../models/UserAccount");

module.exports = async (req, res, next) => {
  try {
    const allDetails = await UserAccount.findOne({
      _id: req.params.id,
      testType: req.params.testType,
      pass: true,
    });
    if (!allDetails) return res.status(404).render("pageNotFound");
    res.render("vendor", { allDetails, error: "" });
  } catch (error) {
    next(error);
  }
};
