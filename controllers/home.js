module.exports = (req, res) => {
  res.render("index", { reqSession: req.session });
};
